// VibeCoding Chrome Extension - Moonshine ONNX Worker
// Real implementation using @huggingface/transformers.js

/**
 * Moonshine Worker for VibeCoding
 * 
 * Uses Transformers.js to run Moonshine-tiny ASR model locally in the browser.
 * 
 * Model: onnx-community/moonshine-tiny-ONNX
 * HuggingFace: https://huggingface.co/onnx-community/moonshine-tiny-ONNX
 * Size: ~50 MB (quantized)
 * Parameters: 27M
 * License: MIT
 */

// Import from local bundled file
import { pipeline, env } from './transformers.min.js';

// Configure Transformers.js for Chrome extension environment
env.allowLocalModels = false;
env.useBrowserCache = true;

// Model configuration
const MODEL_ID = 'onnx-community/moonshine-tiny-ONNX';
const MODEL_CONFIG = {
  id: MODEL_ID,
  name: 'Moonshine Tiny',
  size: '~50 MB',
  params: '27M',
  license: 'MIT',
  url: 'https://huggingface.co/onnx-community/moonshine-tiny-ONNX'
};

// State
let transcriber = null;
let modelLoaded = false;
let isLoading = false;

// Message handler
self.onmessage = async function(event) {
  const { type, data } = event.data;
  console.log('[WORKER] Received message:', type);
  
  try {
    switch (type) {
      case 'LOAD_MODEL':
        console.log('[WORKER] Loading model...');
        await loadModel();
        break;
        
      case 'TRANSCRIBE':
        console.log('[WORKER] Transcribe request, alreadyDecoded:', data.alreadyDecoded);
        console.log('[WORKER] Audio data type:', typeof data.audioData, 'isFloat32:', data.audioData instanceof Float32Array);
        await transcribe(data.audioData, data.sampleRate, data.alreadyDecoded);
        break;
        
      case 'GET_STATUS':
        self.postMessage({
          type: 'STATUS',
          ready: modelLoaded,
          modelLoaded,
          isLoading,
          modelConfig: MODEL_CONFIG
        });
        break;
        
      default:
        console.warn('[WORKER] Unknown message type:', type);
    }
  } catch (error) {
    console.error('[WORKER] Error:', error);
    self.postMessage({
      type: 'ERROR',
      error: error.message
    });
  }
};

/**
 * Load the Moonshine model using Transformers.js pipeline
 */
async function loadModel() {
  console.log('[WORKER] loadModel() called, modelLoaded:', modelLoaded, 'isLoading:', isLoading);
  
  if (modelLoaded) {
    console.log('[WORKER] Model already loaded, skipping');
    self.postMessage({ 
      type: 'MODEL_LOADED', 
      success: true,
      message: 'Moonshine model already loaded',
      modelConfig: MODEL_CONFIG
    });
    return;
  }
  
  if (isLoading) {
    console.log('[WORKER] Model already loading, skipping');
    return; // Already loading
  }
  
  isLoading = true;
  
  try {
    console.log('[WORKER] Starting model load, MODEL_ID:', MODEL_ID);
    self.postMessage({ 
      type: 'LOADING', 
      message: 'Initializing Moonshine model...',
      progress: 0
    });
    
    // Create the automatic speech recognition pipeline
    console.log('[WORKER] Creating pipeline...');
    self.postMessage({
      type: 'LOADING_PROGRESS',
      progress: 10,
      message: 'Loading model files from cache...'
    });
    
    transcriber = await pipeline(
      'automatic-speech-recognition',
      MODEL_ID,
      {
        dtype: 'q4', // Use quantized model for smaller size
        device: 'wasm', // Use WASM backend (most compatible)
        progress_callback: (progress) => {
          // Send progress updates to UI
          if (progress.status === 'progress') {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            // Map to 10-80% range (loading files phase)
            const mappedPercent = 10 + Math.round(percent * 0.7);
            console.log('[WORKER] Download progress:', percent, '%', progress.file);
            self.postMessage({
              type: 'LOADING_PROGRESS',
              progress: mappedPercent,
              message: `Loading: ${progress.file?.split('/').pop() || 'model files'}`,
              file: progress.file
            });
          } else if (progress.status === 'done') {
            console.log('[WORKER] Files loaded, compiling WASM...');
            self.postMessage({
              type: 'LOADING_PROGRESS',
              progress: 80,
              message: 'Compiling WASM runtime (this may take a moment)...'
            });
          } else if (progress.status === 'initiate') {
            self.postMessage({
              type: 'LOADING_PROGRESS', 
              progress: 15,
              message: `Loading: ${progress.file?.split('/').pop() || 'model'}...`
            });
          }
        }
      }
    );
    
    console.log('[WORKER] Pipeline created successfully');
    modelLoaded = true;
    isLoading = false;
    
    self.postMessage({
      type: 'LOADING_PROGRESS',
      progress: 100,
      message: 'Model ready!'
    });
    
    self.postMessage({ 
      type: 'MODEL_LOADED', 
      success: true,
      message: 'Moonshine model loaded successfully',
      modelConfig: MODEL_CONFIG
    });
    
  } catch (error) {
    isLoading = false;
    console.error('[WORKER] Failed to load Moonshine model:', error);
    self.postMessage({ 
      type: 'MODEL_LOADED', 
      success: false,
      error: error.message
    });
  }
}

/**
 * Transcribe audio data using Moonshine
 * @param {Float32Array|ArrayBuffer|string} audioData - Audio data (Float32Array at 16kHz, or base64 string)
 * @param {number} sampleRate - Sample rate of the audio (default: 16000)
 * @param {boolean} alreadyDecoded - Whether audioData is already a Float32Array
 */
async function transcribe(audioData, sampleRate = 16000, alreadyDecoded = false) {
  console.log('[WORKER] transcribe() called');
  console.log('[WORKER] - sampleRate:', sampleRate);
  console.log('[WORKER] - alreadyDecoded:', alreadyDecoded);
  console.log('[WORKER] - audioData type:', typeof audioData);
  console.log('[WORKER] - audioData is Float32Array:', audioData instanceof Float32Array);
  console.log('[WORKER] - audioData length:', audioData?.length || audioData?.byteLength || 'N/A');
  
  try {
    // Auto-load model if not loaded
    if (!modelLoaded) {
      console.log('[WORKER] Model not loaded, loading first...');
      self.postMessage({ type: 'TRANSCRIBING', message: 'Loading model first...' });
      await loadModel();
    }
    
    if (!transcriber) {
      throw new Error('Model not loaded properly');
    }
    
    console.log('[WORKER] Model ready, processing audio...');
    
    // Input validation
    if (!audioData) {
      throw new Error('No audio data provided');
    }
    
    self.postMessage({ type: 'TRANSCRIBING', message: 'Processing audio with Moonshine...' });
    
    // Use audio directly if already decoded by offscreen document
    let audio;
    if (alreadyDecoded && audioData instanceof Float32Array) {
      audio = audioData;
      console.log(`[WORKER] Using pre-decoded audio: ${audio.length} samples`);
    } else if (typeof audioData === 'string') {
      // Fallback: try to decode in worker (may fail if no AudioContext)
      console.warn('[WORKER] Attempting to decode audio in worker - this may fail');
      audio = await decodeBase64Audio(audioData, sampleRate);
    } else if (audioData instanceof ArrayBuffer) {
      console.warn('[WORKER] Attempting to decode ArrayBuffer in worker - this may fail');
      audio = await decodeAudioBuffer(audioData, sampleRate);
    } else if (audioData instanceof Float32Array) {
      audio = audioData;
      console.log(`[WORKER] Using Float32Array directly: ${audio.length} samples`);
    } else {
      throw new Error('Unsupported audio data format');
    }
    
    // Run transcription
    console.log('[WORKER] Starting transcription with', audio.length, 'samples...');
    self.postMessage({ type: 'TRANSCRIBING', message: 'Running speech recognition...' });
    
    const startTime = performance.now();
    const result = await transcriber(audio);
    const endTime = performance.now();
    
    const transcription = result.text.trim();
    const processingTime = Math.round(endTime - startTime);
    console.log(`[WORKER] Transcription complete: "${transcription}" (${processingTime}ms)`);
    
    self.postMessage({
      type: 'TRANSCRIPTION_COMPLETE',
      success: true,
      text: transcription,
      model: 'moonshine',
      processingTime: processingTime
    });
    
  } catch (error) {
    console.error('[WORKER] Transcription error:', error);
    self.postMessage({
      type: 'TRANSCRIPTION_COMPLETE',
      success: false,
      error: error.message
    });
  }
}

/**
 * Decode base64 audio string to Float32Array
 * @param {string} base64Audio - Base64 encoded audio
 * @param {number} targetSampleRate - Target sample rate (16000 for Moonshine)
 * @returns {Promise<Float32Array>}
 */
async function decodeBase64Audio(base64Audio, targetSampleRate = 16000) {
  // Decode base64 to ArrayBuffer
  const binaryString = atob(base64Audio);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return decodeAudioBuffer(bytes.buffer, targetSampleRate);
}

/**
 * Decode audio ArrayBuffer to Float32Array at target sample rate
 * @param {ArrayBuffer} audioBuffer - Audio data as ArrayBuffer
 * @param {number} targetSampleRate - Target sample rate (16000 for Moonshine)
 * @returns {Promise<Float32Array>}
 */
async function decodeAudioBuffer(audioBuffer, targetSampleRate = 16000) {
  // Use OfflineAudioContext to decode and resample
  // First, we need to determine the duration - estimate ~60 seconds max
  const maxDuration = 60;
  const numberOfFrames = targetSampleRate * maxDuration;
  
  const audioContext = new OfflineAudioContext(1, numberOfFrames, targetSampleRate);
  
  try {
    const decodedAudio = await audioContext.decodeAudioData(audioBuffer.slice(0));
    
    // If already at target sample rate, return channel data directly
    if (decodedAudio.sampleRate === targetSampleRate) {
      return decodedAudio.getChannelData(0);
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
      Math.ceil((decodedAudio.duration) * targetSampleRate)
    );
    
    return renderedBuffer.getChannelData(0).slice(0, actualFrames);
    
  } catch (error) {
    console.error('Audio decode error:', error);
    throw new Error('Failed to decode audio: ' + error.message);
  }
}

// Post ready message when worker starts
self.postMessage({ 
  type: 'WORKER_READY', 
  message: 'Moonshine worker initialized (Transformers.js)',
  modelConfig: MODEL_CONFIG
});
