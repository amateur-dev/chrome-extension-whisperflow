// VibeCoding Chrome Extension - Offscreen Document Script
// Handles Moonshine/Whisper AI inference in a context with DOM access

/**
 * Offscreen document for VibeCoding
 * 
 * This script runs in an offscreen document, which has access to DOM APIs
 * that aren't available in service workers. It manages the Moonshine worker
 * and handles audio transcription.
 */

// Worker instance
let moonshineWorker = null;
let pendingTranscription = null;

// Idle timeout for worker cleanup (5 minutes)
const WORKER_IDLE_TIMEOUT = 5 * 60 * 1000;
let workerIdleTimer = null;

/**
 * Reset the idle timer - called after each transcription
 */
function resetIdleTimer() {
  if (workerIdleTimer) {
    clearTimeout(workerIdleTimer);
  }
  workerIdleTimer = setTimeout(() => {
    console.log('Worker idle timeout - terminating to free memory');
    terminateWorker();
  }, WORKER_IDLE_TIMEOUT);
}

/**
 * Terminate the worker to free memory
 */
function terminateWorker() {
  if (moonshineWorker) {
    moonshineWorker.terminate();
    moonshineWorker = null;
    console.log('Moonshine worker terminated');
  }
  if (workerIdleTimer) {
    clearTimeout(workerIdleTimer);
    workerIdleTimer = null;
  }
}

// Initialize the Moonshine worker
function initWorker() {
  if (moonshineWorker) {
    resetIdleTimer(); // Reset timer on reuse
    return;
  }
  
  try {
    // Create worker with module type for ES imports
    moonshineWorker = new Worker(
      chrome.runtime.getURL('lib/moonshine-worker.js'),
      { type: 'module' }
    );
    
    // Handle messages from worker
    moonshineWorker.onmessage = handleWorkerMessage;
    
    moonshineWorker.onerror = (error) => {
      console.error('Moonshine worker error:', error);
      if (pendingTranscription) {
        pendingTranscription.reject(new Error('Worker error: ' + error.message));
        pendingTranscription = null;
      }
    };
    
    // Start idle timer
    resetIdleTimer();
    
    console.log('Moonshine worker initialized');
  } catch (error) {
    console.error('Failed to initialize Moonshine worker:', error);
  }
}

// Handle messages from the Moonshine worker
function handleWorkerMessage(event) {
  const { type, ...data } = event.data;
  console.log('[OFFSCREEN] Worker message:', type);
  
  switch (type) {
    case 'WORKER_READY':
      console.log('[OFFSCREEN] Moonshine worker ready:', data.message);
      // Notify service worker that offscreen is ready
      chrome.runtime.sendMessage({ 
        type: 'OFFSCREEN_READY',
        modelConfig: data.modelConfig
      }).catch(() => {}); // Ignore if no listener
      break;
      
    case 'LOADING':
    case 'LOADING_PROGRESS':
      console.log('[OFFSCREEN] Loading progress:', data.progress || data.message);
      // Forward loading progress to service worker
      chrome.runtime.sendMessage({ 
        type: 'TRANSCRIPTION_PROGRESS',
        progress: data.progress,
        message: data.message
      }).catch(() => {});
      break;
      
    case 'MODEL_LOADED':
      console.log('Model loaded:', data.success ? 'success' : 'failed');
      chrome.runtime.sendMessage({ 
        type: 'MODEL_LOADED',
        success: data.success,
        error: data.error
      }).catch(() => {});
      break;
      
    case 'TRANSCRIBING':
      chrome.runtime.sendMessage({ 
        type: 'TRANSCRIPTION_PROGRESS',
        message: data.message
      }).catch(() => {});
      break;
      
    case 'TRANSCRIPTION_COMPLETE':
      console.log('[OFFSCREEN] Transcription complete! Success:', data.success, 'Text:', data.text?.substring(0, 50));
      // Reset idle timer after transcription
      resetIdleTimer();
      
      if (pendingTranscription) {
        if (data.success) {
          console.log('[OFFSCREEN] Resolving pending transcription');
          pendingTranscription.resolve({
            success: true,
            text: data.text,
            model: data.model,
            processingTime: data.processingTime
          });
        } else {
          console.log('[OFFSCREEN] Rejecting pending transcription:', data.error);
          pendingTranscription.reject(new Error(data.error));
        }
        pendingTranscription = null;
      } else {
        console.warn('[OFFSCREEN] No pending transcription to resolve!');
      }
      break;
      
    case 'ERROR':
      console.error('Worker error:', data.error);
      if (pendingTranscription) {
        pendingTranscription.reject(new Error(data.error));
        pendingTranscription = null;
      }
      break;
  }
}

// Transcribe audio using the Moonshine worker
async function transcribeAudio(audioData, sampleRate = 16000) {
  console.log('[OFFSCREEN] transcribeAudio Step 1: Starting...');
  console.log('[OFFSCREEN] Audio data length:', audioData?.length);
  
  initWorker();
  
  if (!moonshineWorker) {
    console.error('[OFFSCREEN] Worker not available!');
    throw new Error('Moonshine worker not available');
  }
  
  console.log('[OFFSCREEN] transcribeAudio Step 2: Worker ready');
  
  // Decode audio in offscreen document (has AudioContext access)
  // Workers don't have access to AudioContext/OfflineAudioContext
  let decodedAudio;
  try {
    console.log('[OFFSCREEN] transcribeAudio Step 3: Decoding audio...');
    decodedAudio = await decodeBase64AudioToFloat32(audioData, sampleRate);
    console.log('[OFFSCREEN] transcribeAudio Step 4: Decoded!', decodedAudio.length, 'samples');
  } catch (decodeError) {
    console.error('[OFFSCREEN] Audio decode failed:', decodeError);
    throw new Error('Failed to decode audio: ' + decodeError.message);
  }
  
  // Create a promise for the transcription result
  return new Promise((resolve, reject) => {
    // Set timeout for transcription (2 minutes max)
    const timeout = setTimeout(() => {
      pendingTranscription = null;
      reject(new Error('Transcription timed out'));
    }, 120000);
    
    pendingTranscription = {
      resolve: (result) => {
        clearTimeout(timeout);
        resolve(result);
      },
      reject: (error) => {
        clearTimeout(timeout);
        reject(error);
      }
    };
    
    // Send DECODED audio (Float32Array) to worker - not raw base64
    moonshineWorker.postMessage({
      type: 'TRANSCRIBE',
      data: { audioData: decodedAudio, sampleRate, alreadyDecoded: true }
    });
  });
}

/**
 * Decode base64 audio to Float32Array in offscreen document
 * (Workers don't have AudioContext access)
 */
async function decodeBase64AudioToFloat32(base64Audio, targetSampleRate = 16000) {
  // Decode base64 to ArrayBuffer
  const binaryString = atob(base64Audio);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Use OfflineAudioContext to decode and resample
  const maxDuration = 300; // 5 minutes max
  const numberOfFrames = targetSampleRate * maxDuration;
  
  const audioContext = new OfflineAudioContext(1, numberOfFrames, targetSampleRate);
  
  try {
    const decodedAudio = await audioContext.decodeAudioData(bytes.buffer.slice(0));
    
    // If already at target sample rate, return channel data directly
    if (decodedAudio.sampleRate === targetSampleRate) {
      const channelData = decodedAudio.getChannelData(0);
      // Return a copy as transferable
      return new Float32Array(channelData);
    }
    
    // Resample using OfflineAudioContext
    const source = audioContext.createBufferSource();
    source.buffer = decodedAudio;
    source.connect(audioContext.destination);
    source.start();
    
    const renderedBuffer = await audioContext.startRendering();
    
    // Trim to actual audio length
    const actualFrames = Math.min(
      renderedBuffer.length,
      Math.ceil(decodedAudio.duration * targetSampleRate)
    );
    
    return new Float32Array(renderedBuffer.getChannelData(0).slice(0, actualFrames));
    
  } catch (error) {
    console.error('Audio decode error in offscreen:', error);
    throw new Error('Failed to decode audio format. Try a shorter recording.');
  }
}

// Load the model proactively
async function loadModel() {
  initWorker();
  
  if (!moonshineWorker) {
    throw new Error('Moonshine worker not available');
  }
  
  moonshineWorker.postMessage({ type: 'LOAD_MODEL' });
}

// Listen for messages from the service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[OFFSCREEN] Received message:', message.type, 'target:', message.target);
  
  if (message.target !== 'offscreen') {
    console.log('[OFFSCREEN] Ignoring - not targeted at offscreen');
    return;
  }
  
  switch (message.type) {
    case 'TRANSCRIBE':
      console.log('[OFFSCREEN] Processing TRANSCRIBE, audio length:', message.audioData?.length);
      transcribeAudio(message.audioData, message.sampleRate)
        .then(result => {
          console.log('[OFFSCREEN] Transcription success, sending response');
          sendResponse(result);
        })
        .catch(error => {
          console.error('[OFFSCREEN] Transcription failed:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keep channel open for async response
      
    case 'LOAD_MODEL':
      console.log('[OFFSCREEN] Loading model...');
      loadModel();
      sendResponse({ success: true });
      return false;
      
    case 'PING':
      console.log('[OFFSCREEN] Ping received, responding ready');
      sendResponse({ success: true, status: 'ready' });
      return false;
  }
});

// Initialize worker on load
initWorker();

console.log('VibeCoding offscreen document loaded');
