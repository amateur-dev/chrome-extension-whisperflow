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
    
    // Moonshine becomes ready once offscreen is created
    moonshineReady = true;
    
    // Whisper is ready only if downloaded
    whisperReady = whisperDownloaded;
    
    // LLM is ready for demo
    llmReady = true;
    
    // Overall ready state
    isReady = (currentModel === 'moonshine' && moonshineReady) || 
              (currentModel === 'whisper' && whisperReady);
    
    console.log('VibeCoding models initialized');
    console.log(`Moonshine: ${moonshineReady ? 'Ready' : 'Not Ready'}`);
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
  await ensureOffscreen();
  
  // Add target marker for offscreen document
  const offscreenMessage = { ...message, target: 'offscreen' };
  
  // Create promise with timeout
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Offscreen message timeout: ${message.type}`));
    }, timeout);
    
    chrome.runtime.sendMessage(offscreenMessage)
      .then(response => {
        clearTimeout(timeoutId);
        if (response === undefined) {
          reject(new Error('No response from offscreen document'));
        } else {
          resolve(response);
        }
      })
      .catch(error => {
        clearTimeout(timeoutId);
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
    
    if (!audioData) {
      return { success: false, error: 'No audio data provided' };
    }
    
    // Check if the selected model is ready
    if (currentModel === 'whisper' && !whisperReady) {
      return { 
        success: false, 
        error: 'Whisper model is not downloaded. Please download it in Settings first.' 
      };
    }
    
    console.log(`Transcribing audio with ${currentModel}...`);
    
    // Ensure offscreen document is ready
    await ensureOffscreen();
    
    let transcribedText;
    
    if (currentModel === 'moonshine') {
      transcribedText = await transcribeWithMoonshine(audioData, mimeType);
    } else {
      transcribedText = await transcribeWithWhisper(audioData, mimeType);
    }
    
    return {
      success: true,
      text: transcribedText,
      model: currentModel
    };
    
  } catch (error) {
    console.error('Transcription error:', error);
    return { success: false, error: error.message };
  }
}

// Transcription function using Moonshine via offscreen document
async function transcribeWithMoonshine(audioData, mimeType) {
  console.log('Using Moonshine Tiny for transcription via offscreen document');
  
  // Send transcription request to offscreen document using helper
  const response = await sendToOffscreen({
    type: 'TRANSCRIBE',
    audioData: audioData,
    sampleRate: 16000
  });
  
  if (!response || !response.success) {
    throw new Error(response?.error || 'Transcription failed');
  }
  
  console.log(`Transcription completed in ${response.processingTime}ms`);
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
  // For demo: Apply basic formatting rules
  return applyBasicFormatting(text);
}

/**
 * Apply basic text formatting rules (fallback when LLM not available)
 * @param {string} text - Raw text to format
 * @returns {string} - Formatted text
 */
function applyBasicFormatting(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  let formatted = text.trim();
  
  if (!formatted) return '';
  
  // Capitalize first letter
  formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
  
  // Remove filler words only when they appear as standalone hesitation markers
  const fillerPatterns = [
    /^(um|uh|er|ah),?\s+/gi,
    /\s+(um|uh|er|ah),?\s+/gi,
    /,?\s+(um|uh|er|ah)[,.]?\s*$/gi,
    /,\s*(um|uh|er|ah),/gi
  ];
  
  fillerPatterns.forEach(pattern => {
    formatted = formatted.replace(pattern, ' ');
  });
  
  // Fix multiple spaces
  formatted = formatted.replace(/\s+/g, ' ');
  
  // Ensure proper sentence endings
  if (!/[.!?]$/.test(formatted.trim())) {
    formatted = formatted.trim() + '.';
  }
  
  // Fix capitalization after periods
  formatted = formatted.replace(/\.\s+[a-z]/g, (match) => match.toUpperCase());
  
  // Capitalize standalone "i"
  formatted = formatted.replace(/\bi\b/g, 'I');
  
  // Fix common contractions
  const contractions = {
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
    "shouldn't": "shouldn't"
  };
  
  Object.entries(contractions).forEach(([wrong, right]) => {
    formatted = formatted.replace(new RegExp(`\\b${wrong}\\b`, 'gi'), right);
  });
  
  return formatted.trim();
}

// Initialize models on startup
loadSettings().then(() => initializeModels());
