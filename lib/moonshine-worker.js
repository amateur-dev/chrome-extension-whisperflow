// VibeCoding Chrome Extension - Moonshine ONNX Worker
// This is a Web Worker that handles Moonshine ONNX model inference

/**
 * Moonshine Worker for VibeCoding
 * 
 * This worker handles speech-to-text transcription using Moonshine ONNX model.
 * 
 * Model: onnx-community/moonshine-tiny-ONNX
 * HuggingFace: https://huggingface.co/onnx-community/moonshine-tiny-ONNX
 * Size: ~20-44 MB (quantized)
 * Parameters: 27M
 * License: MIT
 * 
 * In production, this would:
 * 1. Load the ONNX Runtime Web
 * 2. Load the Moonshine model weights
 * 3. Process audio buffers and return transcriptions
 * 
 * For the workshop demo, we provide a placeholder implementation
 * that can be replaced with actual ONNX Runtime integration.
 */

let onnxSession = null;
let modelLoaded = false;

// Model configuration
const MODEL_CONFIG = {
  id: 'onnx-community/moonshine-tiny-ONNX',
  name: 'Moonshine Tiny',
  size: '~20-44 MB',
  params: '27M',
  license: 'MIT',
  url: 'https://huggingface.co/onnx-community/moonshine-tiny-ONNX'
};

// Message handler
self.onmessage = async function(event) {
  const { type, data } = event.data;
  
  try {
    switch (type) {
      case 'LOAD_MODEL':
        await loadModel();
        break;
        
      case 'TRANSCRIBE':
        await transcribe(data.audioData);
        break;
        
      case 'GET_STATUS':
        self.postMessage({
          type: 'STATUS',
          ready: modelLoaded,
          modelLoaded,
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
 * Load the Moonshine ONNX model
 */
async function loadModel() {
  try {
    self.postMessage({ type: 'LOADING', message: 'Loading Moonshine model...' });
    
    // TODO: In production, load actual ONNX Runtime and Moonshine model
    // Example with ONNX Runtime Web:
    // 
    // import * as ort from 'onnxruntime-web';
    // 
    // const modelUrl = 'https://huggingface.co/onnx-community/moonshine-tiny-ONNX/resolve/main/model.onnx';
    // onnxSession = await ort.InferenceSession.create(modelUrl, {
    //   executionProviders: ['wasm'],
    //   graphOptimizationLevel: 'all'
    // });
    
    // Simulate model loading for demo
    await new Promise(resolve => setTimeout(resolve, 500));
    
    modelLoaded = true;
    
    self.postMessage({ 
      type: 'MODEL_LOADED', 
      success: true,
      message: 'Moonshine model loaded successfully',
      modelConfig: MODEL_CONFIG
    });
    
  } catch (error) {
    console.error('Failed to load Moonshine model:', error);
    self.postMessage({ 
      type: 'MODEL_LOADED', 
      success: false,
      error: error.message
    });
  }
}

/**
 * Transcribe audio data using Moonshine ONNX
 * @param {Float32Array} audioData - 16kHz mono audio data
 */
async function transcribe(audioData) {
  try {
    if (!modelLoaded) {
      // Auto-load model if not loaded
      await loadModel();
    }
    
    // Input validation
    if (!audioData || (audioData.length !== undefined && audioData.length === 0)) {
      throw new Error('Invalid or empty audio data provided');
    }
    
    self.postMessage({ type: 'TRANSCRIBING', message: 'Processing audio with Moonshine...' });
    
    // TODO: In production, use actual ONNX Runtime inference
    // Example:
    // 
    // // Prepare input tensor
    // const inputTensor = new ort.Tensor('float32', audioData, [1, audioData.length]);
    // 
    // // Run inference
    // const results = await onnxSession.run({ input: inputTensor });
    // 
    // // Decode output tokens to text
    // const outputTokens = results.output.data;
    // const transcription = decodeTokens(outputTokens);
    
    // Simulate transcription delay for demo
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Demo transcription result
    const transcription = "This is a demo transcription using Moonshine Tiny. In production, the ONNX model would provide actual speech-to-text results.";
    
    self.postMessage({
      type: 'TRANSCRIPTION_COMPLETE',
      success: true,
      text: transcription,
      model: 'moonshine'
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
 * Convert audio blob to Float32Array for processing
 * @param {ArrayBuffer} audioBuffer - Audio data as ArrayBuffer
 * @param {number} durationSeconds - Expected duration in seconds (default: 30)
 * @returns {Promise<Float32Array>}
 */
async function prepareAudioData(audioBuffer, durationSeconds = 30) {
  // In production, this would:
  // 1. Decode the audio using Web Audio API
  // 2. Resample to 16kHz if needed
  // 3. Convert to Float32Array
  
  const sampleRate = 16000;
  // Calculate the number of frames based on expected duration
  const numberOfFrames = sampleRate * durationSeconds;
  
  const audioContext = new OfflineAudioContext(1, numberOfFrames, sampleRate);
  const audioData = await audioContext.decodeAudioData(audioBuffer);
  return audioData.getChannelData(0);
}

// Post ready message when worker starts
self.postMessage({ 
  type: 'WORKER_READY', 
  message: 'Moonshine worker initialized',
  modelConfig: MODEL_CONFIG
});
