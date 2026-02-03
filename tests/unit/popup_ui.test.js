// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Popup UI Logic', () => {
  let PopupModule;
  let popupInstance;

  beforeEach(async () => {
    // Setup basic DOM
    document.body.innerHTML = `
      <div id="idleScreen"></div>
      <div id="recordingScreen"></div>
      <div id="transcribingScreen"></div>
      <div id="formattingScreen"></div>
      <div id="previewScreen"></div>
      <div id="errorScreen"></div>
      <div id="settingsScreen"></div>
      
      <button id="recordBtn"></button>
      <button id="stopBtn"></button>
      <button id="insertBtn"></button>
      <button id="copyBtn"></button>
      <button id="retryBtn"></button>
      <button id="clearBtn"></button>
      <button id="errorRetryBtn"></button>
      <button id="settingsBtn"></button>
      <button id="saveSettingsBtn"></button>
      <button id="backBtn"></button>
      <span id="status"></span>
      <span id="modelStatus"></span>
      <span id="duration"></span>
      <span id="volumeBar"></span>
      <canvas id="waveform"></canvas>
      <div id="originalTextWrapper">
          <p id="originalText"></p>
      </div>
      <p id="formattedText"></p>
      <p id="errorMessage"></p>
      <p id="transcribingInfo"></p>
      <input id="moonshineRadio" type="radio" />
      <input id="whisperRadio" type="radio" />
      <span id="moonshineStatus"></span>
      <span id="whisperStatus"></span>
      
      <div id="downloadSection">
          <div id="downloadText"></div>
          <div id="progressFill"></div>
          <div id="downloadPercent"></div>
      </div>
    `;

    // Mock chrome
    global.chrome = {
      runtime: {
        sendMessage: vi.fn(),
        onMessage: { addListener: vi.fn() }
      },
      storage: {
        local: {
            get: vi.fn().mockResolvedValue({}),
            set: vi.fn().mockResolvedValue()
        }
      }
    };

    // Import the popup module
    PopupModule = await import('../../popup.js?t=' + Date.now());
    
    // Instantiate
    popupInstance = new PopupModule.VibeCodingPopup();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(popupInstance).toBeDefined();
  });

  it('should hide original text wrapper if formatted text is identical', () => {
    // Setup overlap
    popupInstance.transcribedText = "Hello world";
    popupInstance.formattedText = "Hello world";
    
    // Mock elements
    const originalText = document.getElementById('originalText');
    const formattedText = document.getElementById('formattedText');
    const originalWrapper = document.getElementById('originalTextWrapper');
    
    // We need to override the elements map in the instance because the constructor already ran
    // and fetched elements. Our DOM setup in beforeEach must match constructor behavior OR we manually update.
    // The constructor pulls elements from document.getElementById. Since we set innerHTML BEFORE import/constructor, 
    // it should have picked them up.
    
    // Verify initial pick up (VibeCodingPopup selects by ID)
    // Wait, VibeCodingPopup constructor runs immediately upon import?
    // No, usually it's just a class definition in the export.
    // BUT the file has `const popup = new VibeCodingPopup();` at the end likely? 
    // If so, it ran once.
    // Testing the exported class allows us to `new` it again.
    
    // Check if originalText is correctly linked
    // The previous tests might fail if constructor didn't find elements.
    // Let's force update elements just in case
    popupInstance.elements.originalText = originalText;
    popupInstance.elements.formattedText = formattedText;
    
    // We assume the code checks parentElement
    // Let's call showPreview
    popupInstance.showPreview();
    
    expect(originalText.textContent).toBe("Hello world");
    expect(formattedText.textContent).toBe("Hello world");
    expect(originalText.parentElement.style.display).toBe('none');
  });

  it('should show original text wrapper if text differs', () => {
    popupInstance.transcribedText = "hello world"; // lowercase
    popupInstance.formattedText = "Hello world."; // formatted
    
    const originalText = document.getElementById('originalText');
    popupInstance.elements.originalText = originalText;
    
    popupInstance.showPreview();
    
    expect(originalText.parentElement.style.display).toBe('block');
  });
  
  it('should show original text wrapper if text differs meaningfully', () => {
    popupInstance.transcribedText = "1700 hours";
    popupInstance.formattedText = "17:00"; 
    
    const originalText = document.getElementById('originalText');
    popupInstance.elements.originalText = originalText;
    
    popupInstance.showPreview();
    
    expect(originalText.parentElement.style.display).toBe('block');
  });
});
