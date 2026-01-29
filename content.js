// VibeCoding Chrome Extension - Content Script
// Handles text injection into web page text fields

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'INSERT_TEXT') {
    const result = insertTextIntoActiveElement(message.text);
    sendResponse(result);
  }
  return true;
});

/**
 * Insert text into the currently active/focused element on the page
 * Supports various text input types: textarea, input, contenteditable
 */
function insertTextIntoActiveElement(text) {
  try {
    const activeElement = document.activeElement;
    
    if (!activeElement) {
      return { success: false, error: 'No active element found' };
    }
    
    // Handle textarea and input elements
    if (activeElement instanceof HTMLTextAreaElement || 
        (activeElement instanceof HTMLInputElement && isTextInput(activeElement))) {
      return insertIntoInputElement(activeElement, text);
    }
    
    // Handle contenteditable elements (Gmail, Notion, Slack, etc.)
    if (activeElement.isContentEditable || activeElement.contentEditable === 'true') {
      return insertIntoContentEditable(activeElement, text);
    }
    
    // Try to find a nearby editable element
    const editableElement = findNearestEditable();
    if (editableElement) {
      if (editableElement instanceof HTMLTextAreaElement || 
          editableElement instanceof HTMLInputElement) {
        return insertIntoInputElement(editableElement, text);
      }
      if (editableElement.isContentEditable) {
        return insertIntoContentEditable(editableElement, text);
      }
    }
    
    return { 
      success: false, 
      error: 'Cannot find an editable text field. Please click on a text field first.' 
    };
    
  } catch (error) {
    console.error('VibeCoding insert error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if an input element is a text-type input
 */
function isTextInput(input) {
  const textTypes = ['text', 'email', 'search', 'url', 'tel', 'password'];
  return textTypes.includes(input.type.toLowerCase());
}

/**
 * Insert text into a textarea or input element
 */
function insertIntoInputElement(element, text) {
  try {
    // Focus the element
    element.focus();
    
    // Get current cursor position
    const start = element.selectionStart || 0;
    const end = element.selectionEnd || 0;
    const currentValue = element.value;
    
    // Insert text at cursor position (or replace selection)
    const newValue = currentValue.substring(0, start) + text + currentValue.substring(end);
    element.value = newValue;
    
    // Move cursor to end of inserted text
    const newCursorPos = start + text.length;
    element.setSelectionRange(newCursorPos, newCursorPos);
    
    // Dispatch events to notify frameworks (React, Vue, etc.)
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    
    return { success: true };
    
  } catch (error) {
    console.error('Error inserting into input:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Insert text into a contenteditable element
 * This handles rich text editors like Gmail, Notion, Slack
 */
function insertIntoContentEditable(element, text) {
  try {
    // Focus the element
    element.focus();
    
    // Get the current selection
    const selection = window.getSelection();
    
    if (!selection || selection.rangeCount === 0) {
      // No selection, try to create one at the end
      const range = document.createRange();
      range.selectNodeContents(element);
      range.collapse(false); // Collapse to end
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    const range = selection.getRangeAt(0);
    
    // Delete any selected content
    range.deleteContents();
    
    // Create text node with our content
    const textNode = document.createTextNode(text);
    
    // Insert the text node
    range.insertNode(textNode);
    
    // Move cursor to after the inserted text
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Dispatch input event for frameworks
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    
    // For some editors (like Gmail), we need to dispatch a keyboard event
    element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
    element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    
    return { success: true };
    
  } catch (error) {
    console.error('Error inserting into contenteditable:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Try to find a nearby editable element if the active element isn't editable
 * This helps with complex web apps where focus might be on a container
 */
function findNearestEditable() {
  // Common selectors for text input areas
  const selectors = [
    'textarea:not([disabled])',
    'input[type="text"]:not([disabled])',
    'input:not([type]):not([disabled])',
    '[contenteditable="true"]',
    '[contenteditable=""]',
    // Gmail specific
    '[role="textbox"]',
    '.editable',
    // Slack specific
    '[data-qa="message_input"]',
    // Notion specific
    '[data-content-editable-leaf="true"]',
    // LinkedIn specific
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
 * Check if an element is visible in the viewport
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

// Log that content script is loaded
console.log('VibeCoding content script loaded');
