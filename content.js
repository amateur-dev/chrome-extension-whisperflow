// VibeCoding Chrome Extension - Content Script
// Handles floating mic buttons and text injection

const MIC_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>`;

/**
 * Manager for floating mic buttons
 */
class FloatingMicManager {
  constructor() {
    this.buttons = new Map(); // Element -> Button
    this.observer = null;
    this.resizeObserver = null;
    this.recordingState = {
      isRecording: false,
      activeElement: null,
      mediaRecorder: null,
      audioChunks: []
    };
    
    this.init();
  }
  
  init() {
    // Observe DOM mutations to add buttons to new inputs
    this.observer = new MutationObserver((mutations) => {
      this.scanForInputs();
    });
    
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Handle resizes
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (this.buttons.has(entry.target)) {
          this.repositionButton(entry.target);
        }
      }
    });

    // Initial scan
    this.scanForInputs();
    
    // Global scroll listener to update positions
    window.addEventListener('scroll', () => this.updateAllPositions(), { capture: true, passive: true });
    window.addEventListener('resize', () => this.updateAllPositions(), { passive: true });
    
    console.log('VibeCoding: Mic Manager initialized');
  }
  
  scanForInputs() {
    const inputs = document.querySelectorAll('input[type="text"], input[type="search"], input[type="email"], textarea, [contenteditable="true"]');
    
    inputs.forEach(input => {
      if (this.isValidInput(input) && !this.buttons.has(input)) {
        this.createButton(input);
      }
    });
    
    // Cleanup removed inputs
    for (const [input, btn] of this.buttons.entries()) {
      if (!document.body.contains(input)) {
        btn.remove();
        this.buttons.delete(input);
      }
    }
  }
  
  isValidInput(element) {
    if (element.readOnly || element.disabled) return false;
    // Check size - ignore tiny inputs
    const rect = element.getBoundingClientRect();
    if (rect.width < 40 || rect.height < 20) return false;
    return true;
  }
  
  createButton(input) {
    const btn = document.createElement('div');
    btn.className = 'vibecoding-mic-btn';
    btn.innerHTML = MIC_ICON_SVG;
    btn.title = 'Record with VibeCoding';
    
    // Events
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleRecording(input, btn);
    });
    
    // Attach to body to avoid overflow issues
    document.body.appendChild(btn);
    this.buttons.set(input, btn);
    this.resizeObserver.observe(input);
    
    this.repositionButton(input);
  }
  
  repositionButton(input) {
    const btn = this.buttons.get(input);
    if (!btn) return;
    
    const rect = input.getBoundingClientRect();
    
    // Check if input is visible
    if (rect.width === 0 || rect.height === 0 || window.getComputedStyle(input).display === 'none') {
      btn.style.display = 'none';
      return;
    }
    
    btn.style.display = 'flex';
    
    // Position inside right edge
    const btnSize = 24;
    const padding = 8;
    
    const top = rect.top + window.scrollY + (rect.height - btnSize) / 2;
    const left = rect.left + window.scrollX + rect.width - btnSize - padding;
    
    // Apply position
    btn.style.top = `${top}px`;
    btn.style.left = `${left}px`;
  }
  
  updateAllPositions() {
    requestAnimationFrame(() => {
      for (const input of this.buttons.keys()) {
        this.repositionButton(input);
      }
    });
  }
  
  async toggleRecording(input, btn) {
    if (this.recordingState.isRecording) {
      if (this.recordingState.activeElement === input) {
        this.stopRecording();
      } else {
        // Stop current and start new? Or just ignore
        console.log('Already recording elsewhere');
      }
    } else {
      await this.startRecording(input, btn);
    }
  }
  
  async startRecording(input, btn) {
    try {
      console.log('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      this.recordingState.activeElement = input;
      this.recordingState.isRecording = true;
      this.recordingState.audioChunks = [];
      
      const mediaRecorder = new MediaRecorder(stream);
      this.recordingState.mediaRecorder = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordingState.audioChunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => this.handleRecordingStop(input, btn);
      
      mediaRecorder.start();
      console.log('Recording started');
      
      // Update UI
      btn.classList.add('recording');
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('VibeCoding: Microphone access needed. Please check site permissions.');
    }
  }
  
  stopRecording() {
    if (this.recordingState.mediaRecorder && this.recordingState.isRecording) {
      this.recordingState.mediaRecorder.stop();
      this.recordingState.mediaRecorder.stream.getTracks().forEach(track => track.stop());
      this.recordingState.isRecording = false;
    }
  }
  
  async handleRecordingStop(input, btn) {
    btn.classList.remove('recording');
    btn.classList.add('processing');
    
    try {
      const audioBlob = new Blob(this.recordingState.audioChunks, { type: 'audio/webm' });
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = this.arrayBufferToBase64(arrayBuffer);
      
      console.log('Sending audio to background...');
      const response = await chrome.runtime.sendMessage({
        type: 'TRANSCRIBE',
        audioData: base64Audio,
        mimeType: 'audio/webm'
      });
      
      if (response && response.success) {
        let text = response.text;
        
        // Rewrite/Format automatically
        console.log('Transcription success. Rewriting...');
        const rewriteResponse = await chrome.runtime.sendMessage({
            type: 'REWRITE',
            text: text
        });
        
        if (rewriteResponse && rewriteResponse.success) {
            text = rewriteResponse.text;
        }
        
        this.insertText(input, text);
      } else {
        console.error('Transcription failed:', response?.error);
        alert('Transcription failed: ' + (response?.error || 'Unknown error'));
      }
      
    } catch (e) {
      console.error('Processing error:', e);
    } finally {
      btn.classList.remove('processing');
      this.recordingState = {
        isRecording: false,
        activeElement: null,
        mediaRecorder: null,
        audioChunks: []
      };
    }
  }
  
  insertText(element, text) {
    // Utilize the existing insert logic
    insertTextIntoActiveElement(text, element);
  }
  
  arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

// Initialize
const micManager = new FloatingMicManager();

/**
 * Handle messages from popup or service worker
 */
function handleMessage(message, sender, sendResponse) {
  console.log('Content script received:', message.type);
  
  switch (message.type) {
    case 'INSERT_TEXT':
      const result = insertTextIntoActiveElement(message.text);
      sendResponse(result);
      break;
      
    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }
  return true;
}

/**
 * Insert text into the currently active/focused element
 */
function insertTextIntoActiveElement(text, targetElement = null) {
  try {
    const activeElement = targetElement || document.activeElement;
    
    if (!activeElement) {
      return { success: false, error: 'No active element found' };
    }
    
    activeElement.focus();
    
    // Handle different input types
    if (activeElement.tagName === 'TEXTAREA' || 
        (activeElement.tagName === 'INPUT' && isTextInput(activeElement))) {
      // Standard text inputs
      const start = activeElement.selectionStart || 0;
      const end = activeElement.selectionEnd || 0;
      const before = activeElement.value.substring(0, start);
      const after = activeElement.value.substring(end);
      activeElement.value = before + text + after;
      activeElement.selectionStart = activeElement.selectionEnd = start + text.length;
      
      // Trigger input event for React/Vue/etc
      activeElement.dispatchEvent(new Event('input', { bubbles: true }));
      activeElement.dispatchEvent(new Event('change', { bubbles: true }));
      
      return { success: true };
    }
    
    // Contenteditable elements (Gmail, Slack, Notion, etc.)
    if (activeElement.isContentEditable || activeElement.contentEditable === 'true') {
      // Try execCommand first (works for most rich editors)
      const inserted = document.execCommand('insertText', false, text);
      if (inserted) {
        return { success: true };
      }
      
      // Fallback: insert at selection
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
        range.collapse(false);
        return { success: true };
      }
      
      // Last resort: append to element
      activeElement.textContent += text;
      return { success: true };
    }
    
    // Fallback: copy to clipboard
    return copyToClipboard(text);
    
  } catch (error) {
    console.error('VibeCoding insert error:', error);
    return copyToClipboard(text);
  }
}

/**
 * Check if an input element is a text-type input
 */
function isTextInput(element) {
  const textTypes = ['text', 'search', 'email', 'url', 'tel', 'password', ''];
  return textTypes.includes(element.type?.toLowerCase() || '');
}

/**
 * Copy text to clipboard as fallback
 */
function copyToClipboard(text) {
  try {
    navigator.clipboard.writeText(text);
    return { success: true, fallback: 'clipboard', message: 'Copied to clipboard' };
  } catch (error) {
    return { success: false, error: 'Failed to insert or copy text' };
  }
}

// Listen for messages
chrome.runtime.onMessage.addListener(handleMessage);

console.log('VibeCoding content script loaded (Full mode)');

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FloatingMicManager };
}
