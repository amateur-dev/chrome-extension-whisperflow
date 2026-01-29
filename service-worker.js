// VibeCoding Chrome Extension - Service Worker
// Handles Whisper.cpp transcription and WebLLM text formatting

// State
let isReady = false;
let whisperReady = false;
let llmReady = false;

// Initialize on service worker startup
self.addEventListener('install', () => {
  console.log('VibeCoding service worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  console.log('VibeCoding service worker activated');
  initializeModels();
});

// Initialize AI models
async function initializeModels() {
  try {
    // For the workshop demo, we'll use a simplified approach
    // In production, this would load Whisper.cpp WASM and WebLLM
    
    console.log('Initializing VibeCoding models...');
    
    // Mark as ready for demo purposes
    // In production, this would actually load the models
    whisperReady = true;
    llmReady = true;
    isReady = true;
    
    console.log('VibeCoding models initialized');
  } catch (error) {
    console.error('Failed to initialize models:', error);
  }
}

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse);
  return true; // Keep message channel open for async response
});

async function handleMessage(message, sender) {
  console.log('Service worker received message:', message.type);
  
  switch (message.type) {
    case 'CHECK_STATUS':
      return {
        ready: isReady,
        whisperReady,
        llmReady,
        status: isReady ? 'Ready' : 'Initializing...'
      };
      
    case 'TRANSCRIBE':
      return await handleTranscribe(message);
      
    case 'REWRITE':
      return await handleRewrite(message);
      
    default:
      return { success: false, error: 'Unknown message type' };
  }
}

// Handle audio transcription
async function handleTranscribe(message) {
  try {
    const { audioData, mimeType } = message;
    
    if (!audioData) {
      return { success: false, error: 'No audio data provided' };
    }
    
    console.log('Transcribing audio...');
    
    // In production, this would use Whisper.cpp WASM
    // For the workshop demo, we'll use the Web Speech API as a fallback
    // or return a simulated transcription
    
    // Simulate transcription delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // For demo purposes, return a placeholder
    // In production, this would be the actual Whisper.cpp transcription
    const transcribedText = await transcribeWithWhisper(audioData, mimeType);
    
    return {
      success: true,
      text: transcribedText
    };
    
  } catch (error) {
    console.error('Transcription error:', error);
    return { success: false, error: error.message };
  }
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
    // In production, this would use WebLLM
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

// Transcription function (Whisper.cpp integration point)
async function transcribeWithWhisper(audioData, mimeType) {
  // TODO: In production, integrate Whisper.cpp WASM here
  // For now, we'll use a demo transcription
  
  // This is where Whisper.cpp WASM would process the audio
  // The actual implementation would:
  // 1. Load the Whisper model (tiny/base/small)
  // 2. Convert audio to 16kHz PCM
  // 3. Run inference
  // 4. Return transcribed text
  
  // Demo: Return a placeholder message indicating recording was received
  // In a real implementation, this would be the actual transcription
  
  // For demo purposes, we'll return a sample transcription
  // This simulates what Whisper would return
  return "Thanks for reaching out. I'd love to chat about this tomorrow afternoon if that works for you.";
}

// Text rewriting function (WebLLM integration point)
async function rewriteWithLLM(text) {
  // TODO: In production, integrate WebLLM here
  // For now, we'll use rule-based formatting
  
  // This is where WebLLM would process the text
  // The actual implementation would:
  // 1. Load the LLM (Phi-3.5-mini, SmolLM, etc.)
  // 2. Apply the system prompt for professional rewriting
  // 3. Run inference
  // 4. Return formatted text
  
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
  // Use word boundaries and context to avoid removing valid uses
  const fillerPatterns = [
    /^(um|uh|er|ah),?\s+/gi,  // At the start of text
    /\s+(um|uh|er|ah),?\s+/gi,  // In the middle with spaces
    /,?\s+(um|uh|er|ah)[,.]?\s*$/gi,  // At the end
    /,\s*(um|uh|er|ah),/gi  // Between commas (clear hesitation)
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
initializeModels();
