// VibeCoding Chrome Extension - Whisper.cpp WASM Worker
// This is a Web Worker that handles Whisper.cpp WASM inference

/**
 * Whisper Worker for VibeCoding
 * 
 * This worker handles speech-to-text transcription using Whisper.cpp compiled to WASM.
 * 
 * In production, this would:
 * 1. Load the Whisper WASM module
 * 2. Load the model weights (tiny: 71MB, base: 140MB, small: 466MB)
 * 3. Process audio buffers and return transcriptions
 * 
 * For the workshop demo, we provide a placeholder implementation
 * that can be replaced with actual Whisper.cpp WASM integration.
 */

let whisperModule = null;
let modelLoaded = false;

// Message handler
self.onmessage = async function(event) {
  const { type, data } = event.data;
  
  switch (type) {
    case 'LOAD_MODEL':
      await loadModel(data.modelPath);
      break;
      
    case 'TRANSCRIBE':
      await transcribe(data.audioData);
      break;
      
    case 'GET_STATUS':
      self.postMessage({
        type: 'STATUS',
        ready: modelLoaded,
        modelLoaded
      });
      break;
      
    default:
      console.warn('Unknown message type:', type);
  }
};

/**
 * Load the Whisper.cpp WASM model
 * @param {string} modelPath - Path to the model file
 */
async function loadModel(modelPath) {
  try {
    self.postMessage({ type: 'LOADING', message: 'Loading Whisper model...' });
    
    // TODO: In production, load actual Whisper.cpp WASM
    // Example with whisper.cpp WASM:
    // 
    // const wasmBinary = await fetch('whisper.wasm').then(r => r.arrayBuffer());
    // const module = await WebAssembly.instantiate(wasmBinary, importObject);
    // whisperModule = module.instance.exports;
    // 
    // const modelData = await fetch(modelPath).then(r => r.arrayBuffer());
    // whisperModule.init_model(modelData);
    
    // Simulate model loading for demo
    await new Promise(resolve => setTimeout(resolve, 500));
    
    modelLoaded = true;
    
    self.postMessage({ 
      type: 'MODEL_LOADED', 
      success: true,
      message: 'Whisper model loaded successfully'
    });
    
  } catch (error) {
    console.error('Failed to load Whisper model:', error);
    self.postMessage({ 
      type: 'MODEL_LOADED', 
      success: false,
      error: error.message
    });
  }
}

/**
 * Transcribe audio data using Whisper.cpp
 * @param {Float32Array} audioData - 16kHz mono audio data
 */
async function transcribe(audioData) {
  try {
    if (!modelLoaded) {
      throw new Error('Model not loaded');
    }
    
    self.postMessage({ type: 'TRANSCRIBING', message: 'Processing audio...' });
    
    // TODO: In production, use actual Whisper.cpp WASM inference
    // Example:
    // 
    // const audioPtr = whisperModule.malloc(audioData.length * 4);
    // const audioHeap = new Float32Array(
    //   whisperModule.memory.buffer, 
    //   audioPtr, 
    //   audioData.length
    // );
    // audioHeap.set(audioData);
    // 
    // const resultPtr = whisperModule.transcribe(audioPtr, audioData.length);
    // const result = readStringFromMemory(resultPtr);
    // 
    // whisperModule.free(audioPtr);
    // whisperModule.free(resultPtr);
    
    // Simulate transcription delay for demo
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Demo transcription result
    const transcription = "This is a demo transcription. In production, Whisper.cpp WASM would provide the actual speech-to-text result.";
    
    self.postMessage({
      type: 'TRANSCRIPTION_COMPLETE',
      success: true,
      text: transcription
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
 * Helper to read null-terminated string from WASM memory
 * @param {number} ptr - Pointer to the string in WASM memory
 * @returns {string}
 */
function readStringFromMemory(ptr) {
  if (!whisperModule) return '';
  
  const memory = new Uint8Array(whisperModule.memory.buffer);
  let end = ptr;
  while (memory[end] !== 0) end++;
  
  const bytes = memory.slice(ptr, end);
  return new TextDecoder().decode(bytes);
}

// Post ready message when worker starts
self.postMessage({ type: 'WORKER_READY', message: 'Whisper worker initialized' });
