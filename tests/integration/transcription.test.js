/**
 * Integration tests for transcription pipeline
 * Uses real Moonshine model via Transformers.js to transcribe audio fixtures
 * 
 * NOTE: First run will download the model (~50MB) which takes 1-2 minutes.
 * Subsequent runs use the cached model.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { pipeline } from '@huggingface/transformers';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test configuration
const MODEL_ID = 'onnx-community/moonshine-tiny-ONNX';
const FIXTURES_DIR = join(__dirname, '..', 'fixtures');

// Shared transcriber instance (expensive to create)
let transcriber = null;

/**
 * Load audio file as Float32Array at 16kHz
 * Uses Node.js buffer since we're not in browser context
 */
async function loadAudioAsFloat32(filePath) {
  const buffer = await readFile(filePath);
  
  // Parse WAV header to get audio data
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  
  // Validate WAV format
  const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (riff !== 'RIFF') {
    throw new Error(`Invalid WAV file: expected RIFF header, got ${riff}`);
  }
  
  const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
  if (wave !== 'WAVE') {
    throw new Error(`Invalid WAV file: expected WAVE format, got ${wave}`);
  }
  
  // Find data chunk
  let offset = 12;
  let dataOffset = -1;
  let dataSize = 0;
  
  while (offset < buffer.length - 8) {
    const chunkId = String.fromCharCode(
      view.getUint8(offset),
      view.getUint8(offset + 1),
      view.getUint8(offset + 2),
      view.getUint8(offset + 3)
    );
    const chunkSize = view.getUint32(offset + 4, true);
    
    if (chunkId === 'data') {
      dataOffset = offset + 8;
      dataSize = chunkSize;
      break;
    }
    
    offset += 8 + chunkSize;
    // Align to even byte
    if (chunkSize % 2 !== 0) offset++;
  }
  
  if (dataOffset === -1) {
    throw new Error('Could not find data chunk in WAV file');
  }
  
  // Read audio samples (assuming 16-bit PCM)
  const numSamples = dataSize / 2;
  const audioData = new Float32Array(numSamples);
  
  for (let i = 0; i < numSamples; i++) {
    const sample = view.getInt16(dataOffset + i * 2, true);
    audioData[i] = sample / 32768.0;  // Convert to -1.0 to 1.0
  }
  
  return audioData;
}

/**
 * Check if transcription contains expected keywords (case-insensitive)
 */
function containsKeywords(text, keywords, minMatchRatio = 0.5) {
  const lowerText = text.toLowerCase();
  const matches = keywords.filter(kw => lowerText.includes(kw.toLowerCase()));
  const matchRatio = matches.length / keywords.length;
  
  return {
    matched: matches,
    missing: keywords.filter(kw => !lowerText.includes(kw.toLowerCase())),
    ratio: matchRatio,
    passed: matchRatio >= minMatchRatio
  };
}


describe('Transcription Integration', () => {
  
  beforeAll(async () => {
    console.log('\n📥 Loading Moonshine model (first run downloads ~50MB)...');
    
    transcriber = await pipeline(
      'automatic-speech-recognition',
      MODEL_ID,
      {
        dtype: 'q4',  // Quantized model for smaller size
        device: 'cpu',  // Use CPU in Node.js (no GPU)
      }
    );
    
    console.log('✅ Model loaded successfully\n');
  }, 180000);  // 3 minute timeout for model download
  
  
  it('should transcribe extension test voice note', async () => {
    const audioPath = join(FIXTURES_DIR, 'Extension Test Voice Note 16kHz.wav');
    
    console.log('🎤 Loading audio file...');
    const audioData = await loadAudioAsFloat32(audioPath);
    console.log(`   Audio length: ${(audioData.length / 16000).toFixed(1)}s`);
    
    console.log('🔄 Transcribing...');
    const startTime = Date.now();
    
    const result = await transcriber(audioData, {
      sampling_rate: 16000,
      return_timestamps: false
    });
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Transcription complete in ${elapsed}s`);
    console.log(`📝 Result: "${result.text.substring(0, 100)}..."`);
    
    // Validate transcription
    expect(result).toBeDefined();
    expect(result.text).toBeDefined();
    expect(typeof result.text).toBe('string');
    expect(result.text.length).toBeGreaterThan(50);
    
    // Check for expected keywords from the transcript
    // Using words that are clearly in the original text
    const expectedKeywords = [
      'digital',
      'revolution',
      'communicate',
      'work',
      'world',
      'interact'
    ];
    
    const keywordResult = containsKeywords(result.text, expectedKeywords, 0.3);
    
    console.log(`\n📊 Keyword Analysis:`);
    console.log(`   Matched: ${keywordResult.matched.join(', ')}`);
    console.log(`   Missing: ${keywordResult.missing.join(', ')}`);
    console.log(`   Ratio: ${(keywordResult.ratio * 100).toFixed(0)}%`);
    
    expect(keywordResult.passed).toBe(true);
  }, 60000);  // 1 minute timeout for transcription
  
  
  it('should handle empty or very short audio gracefully', async () => {
    // Create a very short audio sample (0.1 seconds of silence)
    const shortAudio = new Float32Array(1600);  // 0.1s at 16kHz
    
    const result = await transcriber(shortAudio, {
      sampling_rate: 16000,
      return_timestamps: false
    });
    
    expect(result).toBeDefined();
    // Short/silent audio should return empty or minimal text
    expect(typeof result.text).toBe('string');
  }, 30000);
  
});


describe('Audio File Loading', () => {
  
  it('should parse WAV file correctly', async () => {
    const audioPath = join(FIXTURES_DIR, 'Extension Test Voice Note 16kHz.wav');
    const audioData = await loadAudioAsFloat32(audioPath);
    
    // Audio should be reasonable length (fixture is ~74 seconds at 16kHz)
    expect(audioData.length).toBeGreaterThan(16000);  // At least 1 second
    expect(audioData.length).toBeLessThan(16000 * 90);  // Less than 90 seconds
    
    // Audio values should be in valid range (use reduce to avoid stack overflow with large arrays)
    let maxVal = -Infinity;
    let minVal = Infinity;
    for (let i = 0; i < audioData.length; i++) {
      if (audioData[i] > maxVal) maxVal = audioData[i];
      if (audioData[i] < minVal) minVal = audioData[i];
    }
    expect(maxVal).toBeLessThanOrEqual(1.0);
    expect(minVal).toBeGreaterThanOrEqual(-1.0);
  });
  
  it('should throw on invalid file', async () => {
    const invalidPath = join(FIXTURES_DIR, 'manifest.json');
    await expect(loadAudioAsFloat32(invalidPath)).rejects.toThrow('Invalid WAV file');
  });
  
});
