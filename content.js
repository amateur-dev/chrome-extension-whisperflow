// VibeCoding Chrome Extension - Content Script (Simplified MVP)
// Handles text injection into active elements

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
function insertTextIntoActiveElement(text) {
  try {
    const activeElement = document.activeElement;
    
    if (!activeElement) {
      return { success: false, error: 'No active element found' };
    }
    
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

console.log('VibeCoding content script loaded (MVP mode)');
