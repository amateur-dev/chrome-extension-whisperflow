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

// WebLLM Worker instance
let webllmWorker = null;
let pendingRewrite = null;

// Keep model loaded - no idle timeout
// WASM compilation is expensive, so we keep the worker alive permanently
let modelPreloaded = false;

// Initialize the Moonshine worker
function initWorker() {
  if (moonshineWorker) {
    console.log('[OFFSCREEN] initWorker: Already initialized');
    return; // Already initialized
  }
  
  try {
    console.log('[OFFSCREEN] initWorker: Creating new Worker via global.Worker');
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
    
    console.log('Moonshine worker initialized');
    
    // Pre-load model immediately to avoid delay on first transcription
    if (!modelPreloaded) {
      console.log('Pre-loading Moonshine model...');
      moonshineWorker.postMessage({ type: 'LOAD_MODEL' });
      modelPreloaded = true;
    }
  } catch (error) {
    console.error('Failed to initialize Moonshine worker:', error);
  }
}

// Initialize the WebLLM worker
function initWebLLMWorker() {
  if (webllmWorker) {
    return; // Already initialized
  }
  
  try {
    console.log('[OFFSCREEN] Initializing WebLLM worker...');
    webllmWorker = new Worker(
      chrome.runtime.getURL('lib/webllm-worker.js'),
      { type: 'module' }
    );
    
    webllmWorker.onmessage = handleWebLLMMessage;
    
    webllmWorker.onerror = (error) => {
      console.error('[OFFSCREEN] WebLLM worker error:', error);
      if (pendingRewrite) {
        pendingRewrite.reject(new Error('WebLLM Worker error: ' + error.message));
        pendingRewrite = null;
      }
    };
    
    console.log('[OFFSCREEN] WebLLM worker initialized');
  } catch (error) {
    console.error('[OFFSCREEN] Failed to initialize WebLLM worker:', error);
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
      console.log('[OFFSCREEN] Model loaded:', data.success ? 'success' : 'FAILED');
      if (!data.success) {
        console.error('[OFFSCREEN] Model load error:', data.error);
      }
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

// Handle messages from the WebLLM worker
function handleWebLLMMessage(event) {
  const { type, data } = event.data;
  console.log('[OFFSCREEN] WebLLM Worker message:', type);
  
  switch (type) {
    case 'MODEL_LOADED':
      console.log('[OFFSCREEN] WebLLM Model loaded');
      // Could notify service worker here
      break;
      
    case 'REWRITE_COMPLETE':
      console.log('[OFFSCREEN] Rewrite complete');
      if (pendingRewrite) {
        pendingRewrite.resolve({
          success: true,
          text: data.text
        });
        pendingRewrite = null;
      }
      break;
      
    case 'ERROR':
      console.error('[OFFSCREEN] WebLLM Worker Error:', data.error);
      if (pendingRewrite) {
        pendingRewrite.reject(new Error(data.error));
        pendingRewrite = null;
      }
      break;
  }
}

// Transcribe audio using the Moonshine worker
async function transcribeAudio(audioData, sampleRate = 16000) {
  console.log('[OFFSCREEN] transcribeAudio Step 1: Starting...');
  console.log('[OFFSCREEN] Audio data length:', audioData?.length);
  
  // Send stage update
  sendProgressToServiceWorker('Initializing audio processor...');
  
  initWorker();
  
  if (!moonshineWorker) {
    console.error('[OFFSCREEN] Worker not available!');
    throw new Error('Moonshine worker not available');
  }
  
  console.log('[OFFSCREEN] transcribeAudio Step 2: Worker ready');
  sendProgressToServiceWorker('Audio processor ready...');
  
  // Decode audio in offscreen document (has AudioContext access)
  // Workers don't have access to AudioContext/OfflineAudioContext
  let decodedAudio;
  try {
    console.log('[OFFSCREEN] transcribeAudio Step 3: Decoding audio...');
    sendProgressToServiceWorker('Decoding audio...');
    decodedAudio = await decodeBase64AudioToFloat32(audioData, sampleRate);
    console.log('[OFFSCREEN] transcribeAudio Step 4: Decoded!', decodedAudio.length, 'samples');
    sendProgressToServiceWorker('Audio decoded, starting transcription...');
  } catch (decodeError) {
    console.error('[OFFSCREEN] Audio decode failed:', decodeError);
    throw new Error('Failed to decode audio: ' + decodeError.message);
  }
  
  // Create a promise for the transcription result
  return new Promise((resolve, reject) => {
    // Set timeout for transcription (5 minutes to allow for first-time model load)
    const timeout = setTimeout(() => {
      console.error('[OFFSCREEN] Transcription timeout - worker not responding');
      pendingTranscription = null;
      reject(new Error('Transcription timed out'));
    }, 300000);
    
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
    
    // Send DECODED audio (Float32Array) to worker
    // Use transferable to avoid copying large arrays
    console.log('[OFFSCREEN] Sending to worker, samples:', decodedAudio.length);
    moonshineWorker.postMessage({
      type: 'TRANSCRIBE',
      data: { audioData: decodedAudio, sampleRate, alreadyDecoded: true }
    }, [decodedAudio.buffer]);
  });
}

// Perform text rewrite using WebLLM
async function rewriteText(text) {
  console.log('[OFFSCREEN] rewriteText called');
  initWebLLMWorker();
  
  if (!webllmWorker) {
    throw new Error('WebLLM worker not available');
  }
  
  return new Promise((resolve, reject) => {
    // Timeout 2 minutes
    const timeout = setTimeout(() => {
        pendingRewrite = null;
        reject(new Error('Rewrite timed out'));
    }, 120000);
    
    pendingRewrite = {
      resolve: (res) => { clearTimeout(timeout); resolve(res); },
      reject: (err) => { clearTimeout(timeout); reject(err); }
    };
    
    // Check if model needs loading (rudimentary check, worker should handle state)
    webllmWorker.postMessage({
      type: 'REWRITE',
      data: { text }
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
  console.log('[OFFSCREEN] === MESSAGE RECEIVED ===');
  console.log('[OFFSCREEN] message.type:', message.type);
  console.log('[OFFSCREEN] message.target:', message.target);
  console.log('[OFFSCREEN] sender:', sender?.id);
  
  if (message.target !== 'offscreen') {
    console.log('[OFFSCREEN] SKIP: target is not offscreen');
    return false;
  }
  
  console.log('[OFFSCREEN] Target matched, processing...');
  
  if (message.type === 'TRANSCRIBE') {
    console.log('[OFFSCREEN] TRANSCRIBE handler entered');
    console.log('[OFFSCREEN] audioData exists:', !!message.audioData);
    console.log('[OFFSCREEN] audioData length:', message.audioData?.length);
    console.log('[OFFSCREEN] sampleRate:', message.sampleRate);
    
    // Wrap in try-catch to catch any sync errors
    try {
      console.log('[OFFSCREEN] Calling transcribeAudio...');
      transcribeAudio(message.audioData, message.sampleRate)
        .then(result => {
          console.log('[OFFSCREEN] transcribeAudio resolved:', result?.success);
          console.log('[OFFSCREEN] Calling sendResponse with result...');
          sendResponse(result);
          console.log('[OFFSCREEN] sendResponse called successfully');
        })
        .catch(error => {
          console.error('[OFFSCREEN] transcribeAudio rejected:', error.message);
          console.log('[OFFSCREEN] Calling sendResponse with error...');
          sendResponse({ success: false, error: error.message });
          console.log('[OFFSCREEN] sendResponse called with error');
        });
      console.log('[OFFSCREEN] transcribeAudio promise created, returning true');
      return true; // Keep channel open for async response
    } catch (syncError) {
      console.error('[OFFSCREEN] SYNC ERROR in TRANSCRIBE handler:', syncError);
      sendResponse({ success: false, error: syncError.message });
      return false;
    }
  }
  
  if (message.type === 'LOAD_MODEL') {
    console.log('[OFFSCREEN] LOAD_MODEL handler entered');
    try {
      loadModel();
      sendResponse({ success: true });
    } catch (e) {
      console.error('[OFFSCREEN] LOAD_MODEL error:', e);
      sendResponse({ success: false, error: e.message });
    }
    return false;
  }
  
  if (message.type === 'PING') {
    console.log('[OFFSCREEN] PING handler entered');
    sendResponse({ success: true, status: 'ready' });
    return false;
  }
  
  if (message.type === 'REWRITE') {
    console.log('[OFFSCREEN] REWRITE handler entered');
    try {
      rewriteText(message.text)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
    } catch (e) {
      console.error('[OFFSCREEN] REWRITE error:', e);
      sendResponse({ success: false, error: e.message });
      return false;
    }
  }
  
  console.log('[OFFSCREEN] Unknown message type:', message.type);
  return false;
});

/**
 * Send progress update to service worker (which forwards to popup)
 */
function sendProgressToServiceWorker(message, progress) {
  chrome.runtime.sendMessage({
    type: 'TRANSCRIPTION_PROGRESS',
    message: message,
    progress: progress
  }).catch(() => {});
}

// Initialize worker on load
console.log('[OFFSCREEN] Script loaded, initializing...');
if (typeof module === 'undefined' || !module.exports) {
  try {
    initWorker();
    initWebLLMWorker();
    console.log('[OFFSCREEN] Initialization complete');
  } catch (e) {
    console.error('[OFFSCREEN] Initialization failed:', e);
  }
}

console.log('VibeCoding offscreen document loaded');

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initWorker,
    initWebLLMWorker,
    handleWorkerMessage,
    resetState: () => {
        moonshineWorker = null;
        webllmWorker = null;
        modelPreloaded = false;
        pendingTranscription = null;
    }
  };
}
