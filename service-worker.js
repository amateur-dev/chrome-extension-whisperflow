// VibeCoding Chrome Extension - Service Worker
// Handles speech-to-text (Moonshine/Whisper) and WebLLM text formatting

// Model configuration
const MODELS = {
  moonshine: {
    id: 'onnx-community/moonshine-tiny-ONNX',
    name: 'Moonshine Tiny',
    size: '~50 MB',
    params: '27M',
    license: 'MIT',
    url: 'https://huggingface.co/onnx-community/moonshine-tiny-ONNX'
  },
  whisper: {
    id: 'whisper-tiny',
    name: 'Whisper Tiny',
    size: '~71 MB',
    params: '39M',
    license: 'MIT',
    url: 'https://huggingface.co/openai/whisper-tiny'
  }
};

// State
let isReady = false;
let moonshineReady = false;
let whisperReady = false;
let whisperDownloaded = false;
let llmReady = false;
let currentModel = 'moonshine'; // Default to Moonshine
let offscreenCreated = false;

// Settings storage
let settings = {
  sttModel: 'moonshine',
  whisperDownloaded: false
};

// Initialize on service worker startup
self.addEventListener('install', () => {
  console.log('VibeCoding service worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  console.log('VibeCoding service worker activated');
  loadSettings().then(() => initializeModels());
});

// Load settings from storage
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(['vibeCodingSettings']);
    if (result.vibeCodingSettings) {
      settings = result.vibeCodingSettings;
      currentModel = settings.sttModel || 'moonshine';
      whisperDownloaded = settings.whisperDownloaded || false;
    }
  } catch (error) {
    console.log('Failed to load settings:', error);
  }
}

// Save settings to storage
async function saveSettings(newSettings) {
  try {
    settings = { ...settings, ...newSettings };
    currentModel = settings.sttModel || 'moonshine';
    whisperDownloaded = settings.whisperDownloaded || false;
    await chrome.storage.local.set({ vibeCodingSettings: settings });
    return { success: true };
  } catch (error) {
    console.error('Failed to save settings:', error);
    return { success: false, error: error.message };
  }
}

// Initialize AI models
async function initializeModels() {
  try {
    console.log('Initializing VibeCoding models...');
    console.log(`Current model: ${currentModel}`);
    
    // Ensure offscreen document is created for AI inference
    await ensureOffscreen();
    
    // Moonshine is "available" (offscreen ready) but model may not be downloaded yet
    // The actual model download happens on first transcription
    moonshineReady = true;
    
    // Whisper is ready only if downloaded
    whisperReady = whisperDownloaded;
    
    // LLM is ready for demo
    llmReady = true;
    
    // Overall ready state - ready to accept transcription requests
    isReady = (currentModel === 'moonshine' && moonshineReady) || 
              (currentModel === 'whisper' && whisperReady);
    
    console.log('VibeCoding models initialized');
    console.log(`Moonshine: ${moonshineReady ? 'Available' : 'Not Ready'}`);
    console.log(`Whisper: ${whisperReady ? 'Ready' : 'Not Downloaded'}`);
  } catch (error) {
    console.error('Failed to initialize models:', error);
  }
}

// Offscreen document management
const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';

/**
 * Send a message to offscreen document with timeout
 * @param {object} message - Message to send (target will be added)
 * @param {number} timeout - Timeout in ms (default 2 minutes for transcription)
 * @returns {Promise<object>} Response from offscreen
 */
async function sendToOffscreen(message, timeout = 120000) {
  console.log('[SW] sendToOffscreen: Ensuring offscreen exists...');
  await ensureOffscreen();
  
  // Add target marker for offscreen document
  const offscreenMessage = { ...message, target: 'offscreen' };
  console.log('[SW] sendToOffscreen: Sending message type:', message.type);
  
  // Create promise with timeout
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      console.error('[SW] sendToOffscreen: TIMEOUT after', timeout, 'ms');
      reject(new Error(`Offscreen message timeout: ${message.type}`));
    }, timeout);
    
    chrome.runtime.sendMessage(offscreenMessage)
      .then(response => {
        clearTimeout(timeoutId);
        console.log('[SW] sendToOffscreen: Got response:', response !== undefined ? 'defined' : 'undefined');
        if (response === undefined) {
          reject(new Error('No response from offscreen document'));
        } else {
          resolve(response);
        }
      })
      .catch(error => {
        clearTimeout(timeoutId);
        console.error('[SW] sendToOffscreen: Error:', error);
        reject(error);
      });
  });
}

/**
 * Ping offscreen document to check if it's ready
 * @returns {Promise<boolean>}
 */
async function pingOffscreen() {
  try {
    const response = await sendToOffscreen({ type: 'PING' }, 5000);
    return response?.success === true;
  } catch {
    return false;
  }
}

async function ensureOffscreen() {
  // Check if offscreen document already exists
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)]
  });
  
  if (existingContexts.length > 0) {
    offscreenCreated = true;
    return;
  }
  
  // Create offscreen document
  try {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_DOCUMENT_PATH,
      reasons: ['WORKERS'],
      justification: 'Run Moonshine AI model in Web Worker for speech-to-text transcription'
    });
    offscreenCreated = true;
    console.log('Offscreen document created');
  } catch (error) {
    if (error.message?.includes('already exists')) {
      offscreenCreated = true;
    } else {
      throw error;
    }
  }
}

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Ignore messages meant for offscreen document (let offscreen handle them)
  if (message.target === 'offscreen') {
    return false; // Don't keep channel open, let offscreen listener handle
  }
  
  handleMessage(message, sender).then(sendResponse);
  return true; // Keep message channel open for async response
});

async function handleMessage(message, sender) {
  console.log('Service worker received message:', message.type);
  
  switch (message.type) {
    case 'CHECK_STATUS':
      return {
        ready: isReady,
        moonshineReady,
        whisperReady,
        whisperDownloaded,
        llmReady,
        currentModel,
        status: isReady ? 'Ready' : 'Initializing...'
      };
      
    case 'GET_SETTINGS':
      return {
        sttModel: currentModel,
        whisperDownloaded,
        ...settings
      };
      
    case 'SAVE_SETTINGS':
      const saveResult = await saveSettings(message.settings);
      await initializeModels(); // Re-initialize with new settings
      return saveResult;
      
    case 'DOWNLOAD_WHISPER':
      return await handleDownloadWhisper();
      
    case 'TRANSCRIBE':
      return await handleTranscribe(message);
      
    case 'REWRITE':
      return await handleRewrite(message);
    
    // Messages from offscreen document
    case 'OFFSCREEN_READY':
      console.log('Offscreen document ready');
      moonshineReady = true;
      isReady = true;
      return { success: true };
      
    case 'MODEL_LOADED':
      console.log('Model loaded in offscreen:', message.success);
      return { success: true };
      
    case 'TRANSCRIPTION_PROGRESS':
      // Forward progress to popup
      console.log('Transcription progress:', message.message || `${message.progress}%`);
      // Broadcast to all extension views (popup will receive this)
      chrome.runtime.sendMessage({
        type: 'TRANSCRIPTION_PROGRESS',
        progress: message.progress,
        message: message.message
      }).catch(() => {}); // Ignore if popup is closed
      return { success: true };
    
    case 'TRANSCRIBE_AUDIO':
      // Handle transcription request from content script
      return await handleTranscribeFromContentScript(message);
      
    default:
      return { success: false, error: 'Unknown message type' };
  }
}

// Handle Whisper model download
async function handleDownloadWhisper() {
  try {
    console.log('Downloading Whisper model...');
    
    // TODO: In production, this would download the actual Whisper model
    // For the workshop demo, we simulate the download
    
    // Simulate download delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mark Whisper as downloaded and ready
    whisperDownloaded = true;
    whisperReady = true;
    
    // Save to settings
    await saveSettings({ whisperDownloaded: true });
    
    console.log('Whisper model downloaded successfully');
    
    return { success: true, message: 'Whisper model downloaded' };
    
  } catch (error) {
    console.error('Whisper download error:', error);
    return { success: false, error: error.message };
  }
}

// Handle audio transcription
async function handleTranscribe(message) {
  try {
    const { audioData, mimeType } = message;
    
    console.log('[SW] handleTranscribe Step 1: Received audio');
    console.log('[SW] Audio data length:', audioData?.length || 0);
    console.log('[SW] MIME type:', mimeType);
    
    if (!audioData) {
      console.error('[SW] No audio data provided!');
      return { success: false, error: 'No audio data provided' };
    }
    
    // Check if the selected model is ready
    if (currentModel === 'whisper' && !whisperReady) {
      return { 
        success: false, 
        error: 'Whisper model is not downloaded. Please download it in Settings first.' 
      };
    }
    
    console.log('[SW] handleTranscribe Step 2: Using model:', currentModel);
    
    // Ensure offscreen document is ready
    console.log('[SW] handleTranscribe Step 3: Ensuring offscreen document...');
    await ensureOffscreen();
    console.log('[SW] handleTranscribe Step 4: Offscreen ready');
    
    let transcribedText;
    
    if (currentModel === 'moonshine') {
      console.log('[SW] handleTranscribe Step 5: Calling transcribeWithMoonshine...');
      transcribedText = await transcribeWithMoonshine(audioData, mimeType);
      console.log('[SW] handleTranscribe Step 6: Transcription result:', transcribedText);
    } else {
      transcribedText = await transcribeWithWhisper(audioData, mimeType);
    }
    
    return {
      success: true,
      text: transcribedText,
      model: currentModel
    };
    
  } catch (error) {
    console.error('[SW] handleTranscribe ERROR:', error);
    return { success: false, error: error.message };
  }
}

// Handle transcription request from content script (floating mic buttons)
async function handleTranscribeFromContentScript(message) {
  try {
    const { audioData, mimeType } = message;
    
    if (!audioData) {
      return { success: false, error: 'No audio data provided' };
    }
    
    console.log('Transcribing audio from content script...');
    
    // Ensure offscreen document is ready
    await ensureOffscreen();
    
    // Use Moonshine for transcription (always, for content script requests)
    const transcribedText = await transcribeWithMoonshine(audioData, mimeType);
    
    // Apply formatting
    const formattedText = applyBasicFormatting(transcribedText);
    
    return {
      success: true,
      text: formattedText,
      rawText: transcribedText,
      model: 'moonshine'
    };
    
  } catch (error) {
    console.error('Content script transcription error:', error);
    return { success: false, error: error.message };
  }
}

// Transcription function using Moonshine via offscreen document
async function transcribeWithMoonshine(audioData, mimeType) {
  console.log('[SW] transcribeWithMoonshine Step 1: Preparing to send to offscreen');
  console.log('[SW] Audio data length to send:', audioData.length);
  
  // Send transcription request to offscreen document using helper
  console.log('[SW] transcribeWithMoonshine Step 2: Calling sendToOffscreen...');
  const startTime = Date.now();
  
  const response = await sendToOffscreen({
    type: 'TRANSCRIBE',
    audioData: audioData,
    sampleRate: 16000
  });
  
  console.log('[SW] transcribeWithMoonshine Step 3: Got response after', Date.now() - startTime, 'ms');
  console.log('[SW] Response:', JSON.stringify(response));
  
  if (!response || !response.success) {
    throw new Error(response?.error || 'Transcription failed');
  }
  
  console.log('[SW] transcribeWithMoonshine Step 4: Success! Text:', response.text);
  return response.text;
}

// Transcription function (Whisper.cpp integration point)
// NOTE: Whisper WASM is not yet implemented. Use Moonshine (default) for transcription.
async function transcribeWithWhisper(audioData, mimeType) {
  // TODO: In production, integrate Whisper.cpp WASM here via offscreen document
  // Similar pattern to Moonshine - would use sendToOffscreen()
  
  // For now, throw error directing user to use Moonshine
  throw new Error('Whisper WASM is not yet implemented. Please use Moonshine in Settings.');
}

// Handle text rewriting with LLM
async function handleRewrite(message) {
  try {
    const { text } = message;
    
    if (!text) {
      return { success: false, error: 'No text provided' };
    }
    
    console.log('Formatting text with LLM...');
    
    // Simulate LLM processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Format the text using our formatting logic
    const formattedText = await rewriteWithLLM(text);
    
    return {
      success: true,
      text: formattedText
    };
    
  } catch (error) {
    console.error('Rewrite error:', error);
    return { success: false, error: error.message };
  }
}

// Text rewriting function (WebLLM integration point)
async function rewriteWithLLM(text) {
  // Apply comprehensive text formatting
  return applyBasicFormatting(text);
}

/**
 * Words that should always be capitalized (proper nouns, acronyms)
 */
const ALWAYS_CAPITALIZE = [
  'gmail', 'google', 'slack', 'notion', 'linkedin', 'twitter', 'facebook',
  'microsoft', 'apple', 'amazon', 'github', 'youtube', 'instagram', 'whatsapp',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august',
  'september', 'october', 'november', 'december',
  'ai', 'api', 'url', 'html', 'css', 'javascript', 'python', 'nodejs'
];

/**
 * Standard contractions map for text formatting
 */
const CONTRACTIONS_MAP = {
  "i'm": "I'm", "i'd": "I'd", "i'll": "I'll", "i've": "I've",
  "don't": "don't", "can't": "can't", "won't": "won't", "didn't": "didn't",
  "wouldn't": "wouldn't", "couldn't": "couldn't", "shouldn't": "shouldn't",
  "isn't": "isn't", "aren't": "aren't", "wasn't": "wasn't", "weren't": "weren't",
  "haven't": "haven't", "hasn't": "hasn't", "hadn't": "hadn't",
  "let's": "let's", "that's": "that's", "there's": "there's", "here's": "here's",
  "what's": "what's", "who's": "who's", "it's": "it's", "he's": "he's", "she's": "she's",
  "we're": "we're", "they're": "they're", "you're": "you're",
  "we've": "we've", "they've": "they've", "you've": "you've",
  "we'll": "we'll", "they'll": "they'll", "you'll": "you'll", "he'll": "he'll", "she'll": "she'll",
  "we'd": "we'd", "they'd": "they'd", "you'd": "you'd", "he'd": "he'd", "she'd": "she'd"
};

/**
 * Question words for detecting questions
 */
const QUESTION_WORDS = ['what', 'when', 'where', 'why', 'how', 'who', 'which', 'whose', 'whom', 'is', 'are', 'was', 'were', 'do', 'does', 'did', 'can', 'could', 'would', 'should', 'will', 'shall', 'have', 'has', 'had'];

/**
 * Apply comprehensive text formatting for speech-to-text output
 * @param {string} text - Raw text to format
 * @returns {string} - Formatted text
 */
function applyBasicFormatting(text) {
  if (!text || typeof text !== 'string') return '';
  
  let formatted = text.trim();
  if (!formatted) return '';
  
  // Step 1: Remove hesitation markers (um, uh, er, ah, hmm)
  const hesitationPatterns = [
    /^(um|uh|er|ah|hmm|hm),?\s+/gi,
    /\s+(um|uh|er|ah|hmm|hm),?\s+/gi,
    /,?\s+(um|uh|er|ah|hmm|hm)[,.]?\s*$/gi,
    /,\s*(um|uh|er|ah|hmm|hm),/gi
  ];
  hesitationPatterns.forEach(pattern => {
    formatted = formatted.replace(pattern, ' ');
  });
  
  // Step 2: Remove discourse markers as fillers
  formatted = formatted.replace(/^like,?\s+/gi, '');
  formatted = formatted.replace(/,\s*like,\s*/gi, ', ');
  formatted = formatted.replace(/,?\s*you know,?\s*/gi, ' ');
  formatted = formatted.replace(/^you know,?\s*/gi, '');
  formatted = formatted.replace(/,?\s*i mean,?\s*/gi, ' ');
  formatted = formatted.replace(/^i mean,?\s*/gi, '');
  formatted = formatted.replace(/^so,?\s+/gi, '');
  formatted = formatted.replace(/^basically,?\s*/gi, '');
  formatted = formatted.replace(/^actually,?\s*/gi, '');
  formatted = formatted.replace(/^anyway,?\s*/gi, '');
  formatted = formatted.replace(/^anyways,?\s*/gi, '');
  
  // Step 3: Remove repeated words (the the → the)
  formatted = formatted.replace(/\b(\w+)\s+\1\b/gi, '$1');
  
  // Step 4: Fix multiple spaces and trim
  formatted = formatted.replace(/\s+/g, ' ').trim();
  if (!formatted) return '';
  
  // Step 5: Capitalize first letter
  formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
  
  // Step 6: Fix "i" to "I" when standalone
  formatted = formatted.replace(/\bi\b/g, 'I');
  
  // Step 7: Fix contractions (preserve initial capitalization)
  Object.entries(CONTRACTIONS_MAP).forEach(([pattern, replacement]) => {
    formatted = formatted.replace(new RegExp(`\\b${pattern}\\b`, 'gi'), (match) => {
      if (match.charAt(0) === match.charAt(0).toUpperCase()) {
        return replacement.charAt(0).toUpperCase() + replacement.slice(1);
      }
      return replacement;
    });
  });
  
  // Step 8: Capitalize proper nouns and acronyms
  ALWAYS_CAPITALIZE.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    formatted = formatted.replace(regex, (match) => {
      if (['ai', 'api', 'url', 'html', 'css'].includes(word.toLowerCase())) {
        return word.toUpperCase();
      }
      return match.charAt(0).toUpperCase() + match.slice(1).toLowerCase();
    });
  });
  
  // Step 9: Fix capitalization after sentence-ending punctuation
  formatted = formatted.replace(/([.!?])\s+([a-z])/g, (match, punct, letter) => {
    return punct + ' ' + letter.toUpperCase();
  });
  
  // Step 10: Detect and add question marks for questions
  const sentences = formatted.split(/(?<=[.!?])\s+/);
  formatted = sentences.map(sentence => {
    if (/[.!?]$/.test(sentence)) return sentence;
    const firstWord = sentence.split(/\s+/)[0]?.toLowerCase();
    if (firstWord && QUESTION_WORDS.includes(firstWord)) return sentence + '?';
    if (/\b(right|correct|okay|ok|isn't it|aren't you|don't you|won't you|can you|could you|would you)\s*$/i.test(sentence)) {
      return sentence + '?';
    }
    return sentence;
  }).join(' ');
  
  // Step 11: Clean up double punctuation
  formatted = formatted.replace(/([.!?]){2,}/g, '$1');
  formatted = formatted.replace(/,{2,}/g, ',');
  
  // Step 12: Ensure proper sentence endings
  if (!/[.!?]$/.test(formatted)) formatted += '.';
  
  // Step 13: Fix spacing around punctuation
  formatted = formatted.replace(/\s+([,.])/g, '$1');
  formatted = formatted.replace(/,(?!\s)/g, ', ');
  formatted = formatted.replace(/\.(?!\s|$)/g, '. ');
  
  return formatted.trim();
}

// Initialize models on startup
loadSettings().then(() => initializeModels());
