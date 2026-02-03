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

import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3';

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
  
  try {
    switch (type) {
      case 'LOAD_MODEL':
        await loadModel();
        break;
        
      case 'TRANSCRIBE':
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
        console.warn('Unknown message type:', type);
    }
  } catch (error) {
    console.error('Worker error:', error);
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
  if (modelLoaded) {
    self.postMessage({ 
      type: 'MODEL_LOADED', 
      success: true,
      message: 'Moonshine model already loaded',
      modelConfig: MODEL_CONFIG
    });
    return;
  }
  
  if (isLoading) {
    return; // Already loading
  }
  
  isLoading = true;
  
  try {
    self.postMessage({ 
      type: 'LOADING', 
      message: 'Loading Moonshine model...',
      progress: 0
    });
    
    // Create the automatic speech recognition pipeline
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
            self.postMessage({
              type: 'LOADING_PROGRESS',
              progress: percent,
              message: `Downloading model: ${percent}%`,
              file: progress.file
            });
          } else if (progress.status === 'done') {
            self.postMessage({
              type: 'LOADING_PROGRESS',
              progress: 100,
              message: 'Model downloaded, initializing...'
            });
          }
        }
      }
    );
    
    modelLoaded = true;
    isLoading = false;
    
    self.postMessage({ 
      type: 'MODEL_LOADED', 
      success: true,
      message: 'Moonshine model loaded successfully',
      modelConfig: MODEL_CONFIG
    });
    
  } catch (error) {
    isLoading = false;
    console.error('Failed to load Moonshine model:', error);
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
  try {
    // Auto-load model if not loaded
    if (!modelLoaded) {
      self.postMessage({ type: 'TRANSCRIBING', message: 'Loading model first...' });
      await loadModel();
    }
    
    if (!transcriber) {
      throw new Error('Model not loaded properly');
    }
    
    // Input validation
    if (!audioData) {
      throw new Error('No audio data provided');
    }
    
    self.postMessage({ type: 'TRANSCRIBING', message: 'Processing audio with Moonshine...' });
    
    // Use audio directly if already decoded by offscreen document
    let audio;
    if (alreadyDecoded && audioData instanceof Float32Array) {
      audio = audioData;
      console.log(`Using pre-decoded audio: ${audio.length} samples`);
    } else if (typeof audioData === 'string') {
      // Fallback: try to decode in worker (may fail if no AudioContext)
      console.warn('Attempting to decode audio in worker - this may fail');
      audio = await decodeBase64Audio(audioData, sampleRate);
    } else if (audioData instanceof ArrayBuffer) {
      console.warn('Attempting to decode ArrayBuffer in worker - this may fail');
      audio = await decodeAudioBuffer(audioData, sampleRate);
    } else if (audioData instanceof Float32Array) {
      audio = audioData;
    } else {
      throw new Error('Unsupported audio data format');
    }
    
    // Run transcription
    const startTime = performance.now();
    const result = await transcriber(audio);
    const endTime = performance.now();
    
    const transcription = result.text.trim();
    console.log(`Transcription: "${transcription}" (${Math.round(endTime - startTime)}ms)`);
    
    self.postMessage({
      type: 'TRANSCRIPTION_COMPLETE',
      success: true,
      text: transcription,
      model: 'moonshine',
      processingTime: Math.round(endTime - startTime)
    });
    
  } catch (error) {
    console.error('Transcription error:', error);
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
