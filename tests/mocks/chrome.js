/**
 * Chrome API Mock for testing
 * Provides stub implementations of chrome.* APIs used in the extension
 */

import { vi } from 'vitest';

/**
 * Create a fresh Chrome API mock
 * @returns {object} Mocked chrome object
 */
export function createChromeMock() {
  const storage = new Map();
  
  return {
    runtime: {
      sendMessage: vi.fn().mockResolvedValue(undefined),
      onMessage: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
        hasListener: vi.fn().mockReturnValue(false)
      },
      getURL: vi.fn((path) => `chrome-extension://test-id/${path}`),
      getContexts: vi.fn().mockResolvedValue([]),
      id: 'test-extension-id',
      lastError: null
    },
    
    storage: {
      local: {
        get: vi.fn(async (key) => {
          if (typeof key === 'string') {
            const value = storage.get(key);
            return value !== undefined ? { [key]: value } : {};
          }
          if (Array.isArray(key)) {
            const result = {};
            key.forEach(k => {
              if (storage.has(k)) result[k] = storage.get(k);
            });
            return result;
          }
          // Object with defaults
          const result = {};
          Object.keys(key).forEach(k => {
            result[k] = storage.has(k) ? storage.get(k) : key[k];
          });
          return result;
        }),
        set: vi.fn(async (items) => {
          Object.entries(items).forEach(([k, v]) => storage.set(k, v));
        }),
        remove: vi.fn(async (keys) => {
          const keyList = Array.isArray(keys) ? keys : [keys];
          keyList.forEach(k => storage.delete(k));
        }),
        clear: vi.fn(async () => storage.clear())
      },
      sync: {
        get: vi.fn().mockResolvedValue({}),
        set: vi.fn().mockResolvedValue(undefined)
      }
    },
    
    offscreen: {
      createDocument: vi.fn().mockResolvedValue(undefined),
      closeDocument: vi.fn().mockResolvedValue(undefined),
      Reason: {
        AUDIO_PLAYBACK: 'AUDIO_PLAYBACK',
        WORKERS: 'WORKERS'
      }
    },
    
    tabs: {
      query: vi.fn().mockResolvedValue([{ id: 1, url: 'https://example.com' }]),
      sendMessage: vi.fn().mockResolvedValue(undefined),
      create: vi.fn().mockResolvedValue({ id: 2 }),
      update: vi.fn().mockResolvedValue(undefined)
    },
    
    action: {
      setBadgeText: vi.fn(),
      setBadgeBackgroundColor: vi.fn(),
      setIcon: vi.fn()
    },
    
    // Helper to reset all mocks
    __reset: () => {
      storage.clear();
    },
    
    // Helper to access internal storage for assertions
    __storage: storage
  };
}

/**
 * Install chrome mock globally
 * @returns {object} The installed mock
 */
export function installChromeMock() {
  const mock = createChromeMock();
  globalThis.chrome = mock;
  return mock;
}

/**
 * Remove global chrome mock
 */
export function uninstallChromeMock() {
  delete globalThis.chrome;
}
