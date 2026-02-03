
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Service Worker', () => {
  let swModule;

  beforeEach(async () => {
    // Mock global self
    global.self = {
      addEventListener: vi.fn(),
      skipWaiting: vi.fn(),
      clients: {
        claim: vi.fn()
      }
    };

    // Mock global chrome
    global.chrome = {
      storage: {
        local: {
          get: vi.fn(),
          set: vi.fn()
        }
      },
      runtime: {
        getURL: vi.fn(path => path),
        getContexts: vi.fn(), // Added getContexts
        onMessage: {
          addListener: vi.fn()
        }
      },
      offscreen: {
        createDocument: vi.fn(),
        hasDocument: vi.fn().mockResolvedValue(false),
        Reason: { WORKERS: 'WORKERS' }
      },
      action: {
        setBadgeText: vi.fn(),
        setBadgeBackgroundColor: vi.fn()
      },
      scripting: {
        executeScript: vi.fn()
      },
      commands: {
        onCommand: {
          addListener: vi.fn()
        }
      },
      contextMenus: {
        create: vi.fn(),
        onClicked: {
          addListener: vi.fn()
        }
      } 
    };

    // We need to re-import execution or rely on exported functions.
    // We add timestamp to force reload
    swModule = await import('../../service-worker.js?t=' + Date.now());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete global.self;
    delete global.chrome;
  });

  describe('Settings Management', () => {
    it('loadSettings should retrieve values from storage', async () => {
      const mockSettings = { sttModel: 'whisper', whisperDownloaded: true };
      global.chrome.storage.local.get.mockResolvedValue({ vibeCodingSettings: mockSettings });
      
      // We can't access internal 'settings' variable directly, but we can verify side effects or reload behavior
      // But verify behavior allows us to check chrome.storage usage
      await swModule.loadSettings();
      
      expect(global.chrome.storage.local.get).toHaveBeenCalledWith(['vibeCodingSettings']);
    });

    it('saveSettings should save values to storage', async () => {
      global.chrome.storage.local.set.mockResolvedValue();
      
      const newSettings = { sttModel: 'whisper' };
      const result = await swModule.saveSettings(newSettings);
      
      expect(result.success).toBe(true);
      expect(global.chrome.storage.local.set).toHaveBeenCalledWith({
        vibeCodingSettings: expect.objectContaining({ sttModel: 'whisper' })
      });
    });
  });

  describe('Text Formatting', () => {
    it('applyBasicFormatting should capitalize and punctuate', () => {
      const input = "hello world";
      const output = swModule.applyBasicFormatting(input);
      expect(output).toBe("Hello world.");
    });
    
    it('applyBasicFormatting should remove filler words', () => {
        const input = "um, like, basically it works";
        const output = swModule.applyBasicFormatting(input);
        expect(output).toBe("It works.");
    });
  });

  describe('Model Initialization', () => {
      it('should ensure offscreen document', async () => {
          // Reset interaction
          global.chrome.runtime.getContexts.mockResolvedValue([]); // No existing contexts
          global.chrome.offscreen.hasDocument.mockResolvedValue(false);
          
          await swModule.initializeModels();
          
          expect(global.chrome.offscreen.createDocument).toHaveBeenCalled();
      });

      it('should not create offscreen if already exists', async () => {
        global.chrome.runtime.getContexts.mockResolvedValue([{ documentId: '1' }]); // Exists
        global.chrome.offscreen.hasDocument.mockResolvedValue(true);
        
        await swModule.initializeModels();
        
        expect(global.chrome.offscreen.createDocument).not.toHaveBeenCalled();
    });
  });
});
