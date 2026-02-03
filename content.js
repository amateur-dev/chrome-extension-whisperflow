// VibeCoding Chrome Extension - Content Script
// Handles text injection and floating mic buttons on input fields

/**
 * State management for content script
 */
const VibeCoding = {
  isRecording: false,
  targetElement: null,
  mediaRecorder: null,
  audioChunks: [],
  recordingOverlay: null,
  micButtons: new WeakMap(), // Track which elements have mic buttons
  observer: null,
  recordingStartTime: null
};

// Mic SVG icon (inline to avoid loading issues)
const MIC_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white">
  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
</svg>`;

const STOP_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white">
  <rect x="6" y="6" width="12" height="12" rx="2"/>
</svg>`;

const SPINNER_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white">
  <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" opacity=".3"/>
  <path d="M20 12h2A10 10 0 0 0 12 2v2a8 8 0 0 1 8 8z"/>
</svg>`;

/**
 * Initialize the content script
 */
function init() {
  // Add mic buttons to existing inputs
  addMicButtonsToInputs();
  
  // Watch for dynamically added inputs
  observeDOM();
  
  // Listen for messages from popup/service worker
  chrome.runtime.onMessage.addListener(handleMessage);
  
  console.log('VibeCoding content script loaded with floating mic buttons');
}

/**
 * Handle messages from popup or service worker
 */
function handleMessage(message, sender, sendResponse) {
  switch (message.type) {
    case 'INSERT_TEXT':
      const result = insertTextIntoElement(message.text, VibeCoding.targetElement);
      sendResponse(result);
      break;
      
    case 'TRANSCRIPTION_RESULT':
      handleTranscriptionResult(message);
      sendResponse({ success: true });
      break;
      
    case 'TRANSCRIPTION_ERROR':
      handleTranscriptionError(message.error);
      sendResponse({ success: true });
      break;
      
    case 'TOGGLE_RECORDING':
      toggleRecordingFromShortcut();
      sendResponse({ success: true });
      break;
  }
  return true;
}

/**
 * Add mic buttons to all text input elements on the page
 */
function addMicButtonsToInputs() {
  const selectors = [
    'textarea:not([disabled]):not([readonly])',
    'input[type="text"]:not([disabled]):not([readonly])',
    'input[type="email"]:not([disabled]):not([readonly])',
    'input[type="search"]:not([disabled]):not([readonly])',
    'input[type="url"]:not([disabled]):not([readonly])',
    'input:not([type]):not([disabled]):not([readonly])',
    '[contenteditable="true"]',
    '[contenteditable=""]',
    '[role="textbox"]'
  ];
  
  const elements = document.querySelectorAll(selectors.join(', '));
  
  elements.forEach(element => {
    addMicButtonToElement(element);
  });
}

/**
 * Add a mic button to a specific input element
 */
function addMicButtonToElement(element) {
  // Skip if already has a mic button
  if (VibeCoding.micButtons.has(element)) return;
  
  // Skip hidden or very small elements
  const rect = element.getBoundingClientRect();
  if (rect.width < 50 || rect.height < 20) return;
  
  // Skip elements that aren't visible
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return;
  
  // Create mic button
  const micBtn = document.createElement('button');
  micBtn.className = 'vibecoding-mic-btn';
  micBtn.innerHTML = MIC_ICON_SVG;
  micBtn.setAttribute('data-tooltip', 'Voice input (Alt+Shift+R)');
  micBtn.setAttribute('type', 'button'); // Prevent form submission
  
  // Position the button
  positionMicButton(micBtn, element);
  
  // Handle click
  micBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleRecording(element, micBtn);
  });
  
  // Add to page
  document.body.appendChild(micBtn);
  
  // Track the button
  VibeCoding.micButtons.set(element, micBtn);
  
  // Update position on scroll/resize
  const updatePosition = () => positionMicButton(micBtn, element);
  element.addEventListener('focus', updatePosition);
  window.addEventListener('scroll', updatePosition, { passive: true });
  window.addEventListener('resize', updatePosition, { passive: true });
  
  // Remove button if element is removed
  const observer = new MutationObserver((mutations) => {
    if (!document.contains(element)) {
      micBtn.remove();
      VibeCoding.micButtons.delete(element);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * Position the mic button relative to an input element
 */
function positionMicButton(micBtn, element) {
  const rect = element.getBoundingClientRect();
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  
  // Position at the right side, vertically centered
  micBtn.style.top = `${rect.top + scrollY + (rect.height - 24) / 2}px`;
  micBtn.style.left = `${rect.right + scrollX - 30}px`;
  
  // Check if button is visible
  if (rect.top < -50 || rect.bottom > window.innerHeight + 50) {
    micBtn.style.display = 'none';
  } else {
    micBtn.style.display = 'flex';
  }
}

/**
 * Observe DOM for dynamically added inputs
 */
function observeDOM() {
  VibeCoding.observer = new MutationObserver((mutations) => {
    let shouldScan = false;
    
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        shouldScan = true;
        break;
      }
    }
    
    if (shouldScan) {
      // Debounce the scan
      clearTimeout(VibeCoding.scanTimeout);
      VibeCoding.scanTimeout = setTimeout(addMicButtonsToInputs, 500);
    }
  });
  
  VibeCoding.observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

/**
 * Toggle recording on/off
 */
async function toggleRecording(targetElement, micBtn) {
  if (VibeCoding.isRecording) {
    stopRecording();
  } else {
    await startRecording(targetElement, micBtn);
  }
}

/**
 * Toggle recording from keyboard shortcut (uses focused element)
 */
async function toggleRecordingFromShortcut() {
  const activeElement = document.activeElement;
  const micBtn = VibeCoding.micButtons.get(activeElement);
  
  if (VibeCoding.isRecording) {
    stopRecording();
  } else if (activeElement && isEditableElement(activeElement)) {
    await startRecording(activeElement, micBtn);
  } else {
    // Try to find nearest editable element
    const editable = findNearestEditable();
    if (editable) {
      const btn = VibeCoding.micButtons.get(editable);
      await startRecording(editable, btn);
    } else {
      showNotification('Please focus on a text field first', 'error');
    }
  }
}

/**
 * Start recording audio
 */
async function startRecording(targetElement, micBtn) {
  try {
    // Request microphone permission
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 16000
      }
    });
    
    VibeCoding.isRecording = true;
    VibeCoding.targetElement = targetElement;
    VibeCoding.audioChunks = [];
    VibeCoding.recordingStartTime = Date.now();
    
    // Update mic button state
    if (micBtn) {
      micBtn.classList.add('recording');
      micBtn.innerHTML = STOP_ICON_SVG;
      micBtn.setAttribute('data-tooltip', 'Stop recording');
    }
    
    // Update all mic buttons to show recording state
    updateAllMicButtons('recording');
    
    // Show recording overlay
    showRecordingOverlay();
    
    // Set up media recorder
    const mimeType = getSupportedMimeType();
    VibeCoding.mediaRecorder = new MediaRecorder(stream, { mimeType });
    
    VibeCoding.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        VibeCoding.audioChunks.push(event.data);
      }
    };
    
    VibeCoding.mediaRecorder.onstop = () => {
      handleRecordingStop(stream);
    };
    
    // Start recording
    VibeCoding.mediaRecorder.start(100);
    
    // Auto-stop after 5 minutes
    VibeCoding.recordingTimeout = setTimeout(() => {
      if (VibeCoding.isRecording) {
        stopRecording();
        showNotification('Recording stopped (5 minute limit)', 'info');
      }
    }, 5 * 60 * 1000);
    
  } catch (error) {
    console.error('VibeCoding: Error starting recording:', error);
    
    if (error.name === 'NotAllowedError') {
      showNotification('Microphone access denied. Please allow microphone permission.', 'error');
    } else {
      showNotification('Error starting recording: ' + error.message, 'error');
    }
  }
}

/**
 * Stop recording
 */
function stopRecording() {
  if (VibeCoding.mediaRecorder && VibeCoding.isRecording) {
    VibeCoding.mediaRecorder.stop();
    clearTimeout(VibeCoding.recordingTimeout);
  }
}

/**
 * Handle recording stop - process and send for transcription
 */
async function handleRecordingStop(stream) {
  VibeCoding.isRecording = false;
  
  // Stop all audio tracks
  stream.getTracks().forEach(track => track.stop());
  
  // Update UI
  hideRecordingOverlay();
  updateAllMicButtons('processing');
  
  // Check if we have audio data
  if (VibeCoding.audioChunks.length === 0) {
    updateAllMicButtons('idle');
    showNotification('No audio recorded', 'error');
    return;
  }
  
  // Create blob from chunks
  const mimeType = VibeCoding.mediaRecorder.mimeType;
  const audioBlob = new Blob(VibeCoding.audioChunks, { type: mimeType });
  
  // Convert to base64
  const reader = new FileReader();
  reader.onloadend = async () => {
    const base64Audio = reader.result.split(',')[1];
    
    try {
      // Send to service worker for transcription
      const response = await chrome.runtime.sendMessage({
        type: 'TRANSCRIBE_AUDIO',
        audioData: base64Audio,
        mimeType: mimeType,
        source: 'content_script'
      });
      
      if (response?.success && response?.text) {
        // Insert text into target element
        const insertResult = insertTextIntoElement(response.text, VibeCoding.targetElement);
        
        if (insertResult.success) {
          showNotification('Text inserted!', 'success');
        } else {
          // Copy to clipboard as fallback
          await navigator.clipboard.writeText(response.text);
          showNotification('Text copied to clipboard', 'info');
        }
      } else {
        showNotification(response?.error || 'Transcription failed', 'error');
      }
      
    } catch (error) {
      console.error('VibeCoding: Transcription error:', error);
      showNotification('Error: ' + error.message, 'error');
    } finally {
      updateAllMicButtons('idle');
    }
  };
  
  reader.readAsDataURL(audioBlob);
}

/**
 * Handle transcription result from service worker
 */
function handleTranscriptionResult(message) {
  updateAllMicButtons('idle');
  
  if (message.text && VibeCoding.targetElement) {
    const result = insertTextIntoElement(message.text, VibeCoding.targetElement);
    
    if (result.success) {
      showNotification('Text inserted!', 'success');
    } else {
      navigator.clipboard.writeText(message.text).then(() => {
        showNotification('Text copied to clipboard', 'info');
      });
    }
  }
}

/**
 * Handle transcription error
 */
function handleTranscriptionError(error) {
  updateAllMicButtons('idle');
  showNotification('Transcription failed: ' + error, 'error');
}

/**
 * Update all mic buttons to reflect current state
 */
function updateAllMicButtons(state) {
  const buttons = document.querySelectorAll('.vibecoding-mic-btn');
  
  buttons.forEach(btn => {
    btn.classList.remove('recording', 'processing');
    
    switch (state) {
      case 'recording':
        btn.classList.add('recording');
        btn.innerHTML = STOP_ICON_SVG;
        btn.setAttribute('data-tooltip', 'Stop recording');
        break;
        
      case 'processing':
        btn.classList.add('processing');
        btn.innerHTML = SPINNER_ICON_SVG;
        btn.setAttribute('data-tooltip', 'Processing...');
        break;
        
      case 'idle':
      default:
        btn.innerHTML = MIC_ICON_SVG;
        btn.setAttribute('data-tooltip', 'Voice input (Alt+Shift+R)');
        break;
    }
  });
}

/**
 * Show recording overlay
 */
function showRecordingOverlay() {
  if (VibeCoding.recordingOverlay) return;
  
  const overlay = document.createElement('div');
  overlay.className = 'vibecoding-recording-overlay';
  overlay.innerHTML = '<span class="dot"></span> Recording...';
  
  document.body.appendChild(overlay);
  VibeCoding.recordingOverlay = overlay;
  
  // Update duration
  VibeCoding.durationInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - VibeCoding.recordingStartTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    overlay.innerHTML = `<span class="dot"></span> Recording ${mins}:${secs.toString().padStart(2, '0')}`;
  }, 1000);
}

/**
 * Hide recording overlay
 */
function hideRecordingOverlay() {
  if (VibeCoding.recordingOverlay) {
    VibeCoding.recordingOverlay.remove();
    VibeCoding.recordingOverlay = null;
  }
  
  if (VibeCoding.durationInterval) {
    clearInterval(VibeCoding.durationInterval);
    VibeCoding.durationInterval = null;
  }
}

/**
 * Show notification toast
 */
function showNotification(message, type = 'info') {
  // Remove existing notification
  const existing = document.querySelector('.vibecoding-notification');
  if (existing) existing.remove();
  
  const notification = document.createElement('div');
  notification.className = 'vibecoding-notification';
  notification.style.cssText = `
    position: fixed !important;
    bottom: 20px !important;
    right: 20px !important;
    padding: 12px 20px !important;
    background: ${type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#3498db'} !important;
    color: white !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    font-size: 14px !important;
    border-radius: 8px !important;
    z-index: 9999999 !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
    animation: vibecoding-slideIn 0.3s ease !important;
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

/**
 * Get supported mime type for MediaRecorder
 */
function getSupportedMimeType() {
  const mimeTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4'
  ];
  
  for (const mimeType of mimeTypes) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }
  return 'audio/webm';
}

/**
 * Check if an element is editable
 */
function isEditableElement(element) {
  if (!element) return false;
  
  if (element instanceof HTMLTextAreaElement) return true;
  if (element instanceof HTMLInputElement) {
    const type = element.type.toLowerCase();
    return ['text', 'email', 'search', 'url', 'tel', 'password', ''].includes(type);
  }
  if (element.isContentEditable || element.contentEditable === 'true') return true;
  if (element.getAttribute('role') === 'textbox') return true;
  
  return false;
}

/**
 * Insert text into an element
 */
function insertTextIntoElement(text, element) {
  // Use target element if specified, otherwise use active element
  const targetElement = element || document.activeElement;
  
  if (!targetElement) {
    return { success: false, error: 'No target element' };
  }
  
  try {
    // Handle textarea and input elements
    if (targetElement instanceof HTMLTextAreaElement ||
        (targetElement instanceof HTMLInputElement && isEditableElement(targetElement))) {
      return insertIntoInputElement(targetElement, text);
    }
    
    // Handle contenteditable elements
    if (targetElement.isContentEditable || targetElement.contentEditable === 'true') {
      return insertIntoContentEditable(targetElement, text);
    }
    
    // Try to find a nearby editable element
    const editable = findNearestEditable();
    if (editable) {
      if (editable instanceof HTMLTextAreaElement || editable instanceof HTMLInputElement) {
        return insertIntoInputElement(editable, text);
      }
      if (editable.isContentEditable) {
        return insertIntoContentEditable(editable, text);
      }
    }
    
    return { success: false, error: 'Cannot find editable element' };
    
  } catch (error) {
    console.error('VibeCoding insert error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Insert text into a textarea or input element
 */
function insertIntoInputElement(element, text) {
  try {
    element.focus();
    
    const start = element.selectionStart || 0;
    const end = element.selectionEnd || 0;
    const currentValue = element.value;
    
    const newValue = currentValue.substring(0, start) + text + currentValue.substring(end);
    element.value = newValue;
    
    const newCursorPos = start + text.length;
    element.setSelectionRange(newCursorPos, newCursorPos);
    
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    
    return { success: true };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Insert text into a contenteditable element
 */
function insertIntoContentEditable(element, text) {
  try {
    element.focus();
    
    const selection = window.getSelection();
    
    if (!selection || selection.rangeCount === 0) {
      const range = document.createRange();
      range.selectNodeContents(element);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    const range = selection.getRangeAt(0);
    range.deleteContents();
    
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);
    
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
    element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    
    return { success: true };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Find nearest editable element
 */
function findNearestEditable() {
  const selectors = [
    'textarea:not([disabled])',
    'input[type="text"]:not([disabled])',
    'input:not([type]):not([disabled])',
    '[contenteditable="true"]',
    '[role="textbox"]',
    '.editable',
    '[data-qa="message_input"]',
    '[data-content-editable-leaf="true"]',
    '.ql-editor'
  ];
  
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
      if (isElementVisible(element)) {
        return element;
      }
    }
  }
  
  return null;
}

/**
 * Check if element is visible
 */
function isElementVisible(element) {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.visibility !== 'hidden' &&
    style.display !== 'none' &&
    style.opacity !== '0'
  );
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
