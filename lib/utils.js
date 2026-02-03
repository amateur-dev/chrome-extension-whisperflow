// VibeCoding Chrome Extension - Shared Utilities

/**
 * Convert ArrayBuffer to Base64 string
 * @param {ArrayBuffer} buffer 
 * @returns {string}
 */
export function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 * @param {string} base64 
 * @returns {ArrayBuffer}
 */
export function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Convert audio blob to WAV format at 16kHz (required by Whisper)
 * @param {Blob} audioBlob 
 * @returns {Promise<Float32Array>}
 */
export async function audioToFloat32Array(audioBlob) {
  const audioContext = new OfflineAudioContext(1, 1, 16000);
  const arrayBuffer = await audioBlob.arrayBuffer();
  
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Resample to 16kHz if needed
    if (audioBuffer.sampleRate !== 16000) {
      const offlineContext = new OfflineAudioContext(
        1,
        audioBuffer.duration * 16000,
        16000
      );
      
      const source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineContext.destination);
      source.start(0);
      
      const resampledBuffer = await offlineContext.startRendering();
      return resampledBuffer.getChannelData(0);
    }
    
    return audioBuffer.getChannelData(0);
  } catch (error) {
    console.error('Audio decoding error:', error);
    throw new Error('Failed to decode audio');
  }
}

/**
 * Create a WAV file from Float32Array audio data
 * @param {Float32Array} audioData 
 * @param {number} sampleRate 
 * @returns {Blob}
 */
export function float32ToWav(audioData, sampleRate = 16000) {
  const buffer = new ArrayBuffer(44 + audioData.length * 2);
  const view = new DataView(buffer);
  
  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + audioData.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, audioData.length * 2, true);
  
  // Audio data
  const offset = 44;
  for (let i = 0; i < audioData.length; i++) {
    const sample = Math.max(-1, Math.min(1, audioData[i]));
    view.setInt16(offset + i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
  }
  
  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Debounce function for rate limiting
 * @param {Function} func 
 * @param {number} wait 
 * @returns {Function}
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Format duration in seconds to MM:SS
 * @param {number} seconds 
 * @returns {string}
 */
export function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Check if WebGPU is supported
 * @returns {Promise<boolean>}
 */
export async function isWebGPUSupported() {
  if (!navigator.gpu) {
    return false;
  }
  
  try {
    const adapter = await navigator.gpu.requestAdapter();
    return adapter !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Check if WASM is supported
 * @returns {boolean}
 */
export function isWasmSupported() {
  return typeof WebAssembly === 'object' &&
         typeof WebAssembly.instantiate === 'function';
}

/**
 * Storage utilities for Chrome Storage API
 */
export const storage = {
  async get(key, defaultValue = null) {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        console.warn('Chrome storage API not available');
        return defaultValue;
      }
      const result = await chrome.storage.local.get(key);
      return result[key] !== undefined ? result[key] : defaultValue;
    } catch (error) {
      console.error('Storage get error:', error);
      return defaultValue;
    }
  },
  
  async set(key, value) {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        console.warn('Chrome storage API not available');
        return false;
      }
      await chrome.storage.local.set({ [key]: value });
      return true;
    } catch (error) {
      console.error('Storage set error:', error);
      return false;
    }
  },
  
  async remove(key) {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        console.warn('Chrome storage API not available');
        return false;
      }
      await chrome.storage.local.remove(key);
      return true;
    } catch (error) {
      console.error('Storage remove error:', error);
      return false;
    }
  }
};

/**
 * Standard contractions map for text formatting
 */
export const CONTRACTIONS_MAP = {
  "i'm": "I'm",
  "i'd": "I'd",
  "i'll": "I'll",
  "i've": "I've",
  "don't": "don't",
  "can't": "can't",
  "won't": "won't",
  "didn't": "didn't",
  "wouldn't": "wouldn't",
  "couldn't": "couldn't",
  "shouldn't": "shouldn't",
  "isn't": "isn't",
  "aren't": "aren't",
  "wasn't": "wasn't",
  "weren't": "weren't",
  "haven't": "haven't",
  "hasn't": "hasn't",
  "hadn't": "hadn't",
  "let's": "let's",
  "that's": "that's",
  "there's": "there's",
  "here's": "here's",
  "what's": "what's",
  "who's": "who's",
  "it's": "it's",
  "he's": "he's",
  "she's": "she's",
  "we're": "we're",
  "they're": "they're",
  "you're": "you're",
  "we've": "we've",
  "they've": "they've",
  "you've": "you've",
  "we'll": "we'll",
  "they'll": "they'll",
  "you'll": "you'll",
  "he'll": "he'll",
  "she'll": "she'll",
  "we'd": "we'd",
  "they'd": "they'd",
  "you'd": "you'd",
  "he'd": "he'd",
  "she'd": "she'd"
};

/**
 * Words that should always be capitalized (proper nouns, acronyms)
 */
export const ALWAYS_CAPITALIZE = [
  'gmail', 'google', 'slack', 'notion', 'linkedin', 'twitter', 'facebook',
  'microsoft', 'apple', 'amazon', 'github', 'youtube', 'instagram', 'whatsapp',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august',
  'september', 'october', 'november', 'december',
  'ai', 'api', 'url', 'html', 'css', 'javascript', 'python', 'nodejs'
];

/**
 * Question words for detecting questions
 */
const QUESTION_WORDS = ['what', 'when', 'where', 'why', 'how', 'who', 'which', 'whose', 'whom', 'is', 'are', 'was', 'were', 'do', 'does', 'did', 'can', 'could', 'would', 'should', 'will', 'shall', 'have', 'has', 'had'];

/**
 * Apply basic text formatting rules
 * Comprehensive formatting for speech-to-text output
 * @param {string} text - Raw text to format
 * @returns {string} - Formatted text
 */
export function applyBasicFormatting(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  let formatted = text.trim();
  
  if (!formatted) return '';
  
  // Step 1: Remove filler words (before other processing)
  // Hesitation markers: um, uh, er, ah, hmm
  const hesitationPatterns = [
    /^(um|uh|er|ah|hmm|hm),?\s+/gi,
    /\s+(um|uh|er|ah|hmm|hm),?\s+/gi,
    /,?\s+(um|uh|er|ah|hmm|hm)[,.]?\s*$/gi,
    /,\s*(um|uh|er|ah|hmm|hm),/gi
  ];
  hesitationPatterns.forEach(pattern => {
    formatted = formatted.replace(pattern, ' ');
  });
  
  formatted = formatted.trim();

  // Discourse markers when used as fillers (more careful - only when standalone)
  // "like" at sentence start or after comma, "you know" as interjection
  formatted = formatted.replace(/^like,?\s+/gi, '');
  formatted = formatted.replace(/,\s*like,\s*/gi, ', ');
  formatted = formatted.replace(/,?\s*you know,?\s*/gi, ' ');
  formatted = formatted.replace(/^you know,?\s*/gi, '');
  formatted = formatted.replace(/,?\s*i mean,?\s*/gi, ' ');
  formatted = formatted.replace(/^i mean,?\s*/gi, '');
  formatted = formatted.replace(/^so,?\s+/gi, ''); // "So" as sentence starter filler
  formatted = formatted.replace(/^basically,?\s*/gi, '');
  formatted = formatted.replace(/^actually,?\s*/gi, '');
  formatted = formatted.replace(/^anyway,?\s*/gi, '');
  formatted = formatted.replace(/^anyways,?\s*/gi, '');
  
  // Step 2: Remove repeated words (the the → the)
  formatted = formatted.replace(/\b(\w+)\s+\1\b/gi, '$1');
  
  // Step 3: Fix multiple spaces and trim
  formatted = formatted.replace(/\s+/g, ' ').trim();
  
  if (!formatted) return '';
  
  // Step 4: Capitalize first letter
  formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
  
  // Step 5: Fix "i" to "I" when standalone
  formatted = formatted.replace(/\bi\b/g, 'I');
  
  // Step 6: Fix contractions using the map (preserve initial capitalization)
  Object.entries(CONTRACTIONS_MAP).forEach(([pattern, replacement]) => {
    formatted = formatted.replace(new RegExp(`\\b${pattern}\\b`, 'gi'), (match) => {
      // Preserve capitalization of first letter
      if (match.charAt(0) === match.charAt(0).toUpperCase()) {
        return replacement.charAt(0).toUpperCase() + replacement.slice(1);
      }
      return replacement;
    });
  });
  
  // Step 7: Capitalize proper nouns and acronyms
  ALWAYS_CAPITALIZE.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    formatted = formatted.replace(regex, (match) => {
      // For acronyms (2-4 letters), make uppercase
      if (word.length <= 4 && /^[a-z]+$/i.test(word)) {
        // Check if it's a known acronym
        if (['ai', 'api', 'url', 'html', 'css'].includes(word.toLowerCase())) {
          return word.toUpperCase();
        }
      }
      // For proper nouns, capitalize first letter
      return match.charAt(0).toUpperCase() + match.slice(1).toLowerCase();
    });
  });
  
  // Step 8: Fix capitalization after sentence-ending punctuation
  formatted = formatted.replace(/([.!?])\s+([a-z])/g, (match, punct, letter) => {
    return punct + ' ' + letter.toUpperCase();
  });
  
  // Step 9: Detect and add question marks for questions
  // Split into sentences and check each one
  const sentences = formatted.split(/(?<=[.!?])\s+/);
  formatted = sentences.map(sentence => {
    // Skip if already has punctuation
    if (/[.!?]$/.test(sentence)) {
      return sentence;
    }
    
    // Check if it starts with a question word
    const firstWord = sentence.split(/\s+/)[0]?.toLowerCase();
    if (firstWord && QUESTION_WORDS.includes(firstWord)) {
      return sentence + '?';
    }
    
    // Check for question patterns (ends with auxiliary + subject pattern)
    if (/\b(right|correct|okay|ok|isn't it|aren't you|don't you|won't you|can you|could you|would you)\s*$/i.test(sentence)) {
      return sentence + '?';
    }
    
    return sentence;
  }).join(' ');
  
  // Step 10: Clean up any double punctuation (before adding endings)
  formatted = formatted.replace(/([.!?]){2,}/g, '$1');
  formatted = formatted.replace(/,{2,}/g, ',');
  
  // Step 11: Ensure proper sentence endings
  if (!/[.!?]$/.test(formatted)) {
    formatted += '.';
  }
  
  // Step 12: Fix spacing around punctuation
  formatted = formatted.replace(/\s+([,.])/g, '$1'); // Remove space before comma/period
  formatted = formatted.replace(/,(?!\s)/g, ', '); // Add space after comma if missing
  formatted = formatted.replace(/\.(?!\s|$)/g, '. '); // Add space after period if missing
  
  // Final trim
  formatted = formatted.trim();
  
  return formatted;
}
