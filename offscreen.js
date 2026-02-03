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
  
  switch (type) {
    case 'WORKER_READY':
      console.log('Moonshine worker ready:', data.message);
      // Notify service worker that offscreen is ready
      chrome.runtime.sendMessage({ 
        type: 'OFFSCREEN_READY',
        modelConfig: data.modelConfig
      }).catch(() => {}); // Ignore if no listener
      break;
      
    case 'LOADING':
    case 'LOADING_PROGRESS':
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
      // Reset idle timer after transcription
      resetIdleTimer();
      
      if (pendingTranscription) {
        if (data.success) {
          pendingTranscription.resolve({
            success: true,
            text: data.text,
            model: data.model,
            processingTime: data.processingTime
          });
        } else {
          pendingTranscription.reject(new Error(data.error));
        }
        pendingTranscription = null;
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
  initWorker();
  
  if (!moonshineWorker) {
    throw new Error('Moonshine worker not available');
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
    
    // Send transcription request to worker
    moonshineWorker.postMessage({
      type: 'TRANSCRIBE',
      data: { audioData, sampleRate }
    });
  });
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
  if (message.target !== 'offscreen') return;
  
  switch (message.type) {
    case 'TRANSCRIBE':
      transcribeAudio(message.audioData, message.sampleRate)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep channel open for async response
      
    case 'LOAD_MODEL':
      loadModel();
      sendResponse({ success: true });
      return false;
      
    case 'PING':
      sendResponse({ success: true, status: 'ready' });
      return false;
  }
});

// Initialize worker on load
initWorker();

console.log('VibeCoding offscreen document loaded');
