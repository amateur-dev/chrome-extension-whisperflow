// VibeCoding Chrome Extension - WebLLM Worker
// This is a Web Worker that handles WebLLM inference for text rewriting

/**
 * WebLLM Worker for VibeCoding
 * 
 * This worker handles text rewriting using WebLLM with models like:
 * - Phi-3.5-mini (3.8GB, recommended)
 * - SmolLM (1-2GB, fastest)
 * - Mistral-7B (4-5GB, most capable)
 * 
 * In production, this would:
 * 1. Initialize the WebLLM runtime
 * 2. Load the model weights
 * 3. Process text prompts and return formatted text
 * 
 * For the workshop demo, we provide a placeholder implementation
 * that can be replaced with actual WebLLM integration.
 */

let llmEngine = null;
let modelLoaded = false;
let currentModel = 'Phi-3.5-mini';

// System prompt for professional text rewriting
const SYSTEM_PROMPT = `You are a professional writing assistant. 
Your job is to clean up voice transcriptions for professional communication.

Rules:
- Fix grammar and punctuation
- Improve clarity and flow
- Maintain the original meaning
- Keep the tone professional but warm
- Remove filler words (um, uh, like)
- Add proper capitalization

Respond with ONLY the cleaned up text, no explanations.`;

// Message handler
self.onmessage = async function(event) {
  const { type, data } = event.data;
  
  switch (type) {
    case 'LOAD_MODEL':
      await loadModel(data.modelName);
      break;
      
    case 'REWRITE':
      await rewriteText(data.text);
      break;
      
    case 'GET_STATUS':
      self.postMessage({
        type: 'STATUS',
        ready: modelLoaded,
        modelLoaded,
        currentModel
      });
      break;
      
    default:
      console.warn('Unknown message type:', type);
  }
};

/**
 * Load a WebLLM model
 * @param {string} modelName - Name of the model to load
 */
async function loadModel(modelName) {
  try {
    self.postMessage({ type: 'LOADING', message: `Loading ${modelName}...` });
    
    // TODO: In production, load actual WebLLM model
    // Example with WebLLM:
    // 
    // import { CreateWebWorkerEngine } from '@mlc-ai/web-llm';
    // 
    // llmEngine = await CreateWebWorkerEngine(
    //   modelName,
    //   {
    //     initProgressCallback: (progress) => {
    //       self.postMessage({ 
    //         type: 'LOADING_PROGRESS', 
    //         progress: progress.progress,
    //         message: progress.text
    //       });
    //     }
    //   }
    // );
    
    // Simulate model loading for demo
    await new Promise(resolve => setTimeout(resolve, 500));
    
    currentModel = modelName;
    modelLoaded = true;
    
    self.postMessage({ 
      type: 'MODEL_LOADED', 
      success: true,
      model: modelName,
      message: `${modelName} loaded successfully`
    });
    
  } catch (error) {
    console.error('Failed to load LLM model:', error);
    self.postMessage({ 
      type: 'MODEL_LOADED', 
      success: false,
      error: error.message
    });
  }
}

/**
 * Rewrite text using the loaded LLM
 * @param {string} text - Raw transcribed text to rewrite
 */
async function rewriteText(text) {
  try {
    // Input validation
    if (!text || typeof text !== 'string' || !text.trim()) {
      self.postMessage({
        type: 'REWRITE_COMPLETE',
        success: false,
        error: 'Invalid or empty text provided'
      });
      return;
    }
    
    if (!modelLoaded) {
      await loadModel(currentModel);
    }
    
    self.postMessage({ type: 'REWRITING', message: 'Formatting text...' });
    
    // Fall back to rule-based formatting (Placeholder implementation)
    // In production this would call llmEngine.chat.completions.create({...})
    const formatted = applyBasicFormatting(text);
    
    // Simulate inference delay
    await new Promise(resolve => setTimeout(resolve, 800));

    self.postMessage({
      type: 'REWRITE_COMPLETE',
      success: true,
      text: formatted,
      formatted: true
    });
    
  } catch (error) {
    // Example:
    // 
    // const response = await llmEngine.chat.completions.create({
    //   messages: [
    //     { role: 'system', content: SYSTEM_PROMPT },
    //     { role: 'user', content: text }
    //   ],
    //   temperature: 0.3,
    //   max_tokens: 500
    // });
    // 
    // const formattedText = response.choices[0].message.content;
    
    // Simulate LLM inference delay for demo
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Apply formatting (in production, LLM would do this)
    const formattedText = applyBasicFormatting(text);
    
    self.postMessage({
      type: 'REWRITE_COMPLETE',
      success: true,
      text: formattedText
    });
    
  } catch (error) {
    console.error('Rewrite error:', error);
    
    // Fall back to basic formatting on error
    const fallbackText = applyBasicFormatting(text);
    self.postMessage({
      type: 'REWRITE_COMPLETE',
      success: true,
      text: fallbackText,
      fallback: true,
      error: error.message
    });
  }
}

/**
 * Apply basic text formatting rules
 * This is used as a fallback when LLM is not available
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
  // Use word boundaries and context to avoid removing valid uses like "I like apples"
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
  if (!/[.!?]$/.test(formatted)) {
    formatted += '.';
  }
  
  // Fix capitalization after periods
  formatted = formatted.replace(/\.\s+[a-z]/g, (match) => match.toUpperCase());
  
  // Fix "i" to "I"
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
    "shouldn't": "shouldn't",
    "isn't": "isn't",
    "aren't": "aren't",
    "wasn't": "wasn't",
    "weren't": "weren't",
    "haven't": "haven't",
    "hasn't": "hasn't",
    "hadn't": "hadn't"
  };
  
  Object.entries(contractions).forEach(([wrong, right]) => {
    formatted = formatted.replace(new RegExp(`\\b${wrong}\\b`, 'gi'), right);
  });
  
  // Trim again
  formatted = formatted.trim();
  
  return formatted;
}

// Post ready message when worker starts
self.postMessage({ type: 'WORKER_READY', message: 'WebLLM worker initialized' });
