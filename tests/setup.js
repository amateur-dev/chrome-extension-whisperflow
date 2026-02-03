/**
 * Global test setup for Vitest
 * Runs before all tests
 */

import { vi, beforeAll, afterAll, afterEach } from 'vitest';
import { installChromeMock, uninstallChromeMock } from './mocks/chrome.js';

// Install Chrome mock globally before all tests
let chromeMock;

beforeAll(() => {
  chromeMock = installChromeMock();
  
  // Mock btoa/atob for Node.js (used in arrayBufferToBase64/base64ToArrayBuffer)
  if (typeof globalThis.btoa === 'undefined') {
    globalThis.btoa = (str) => Buffer.from(str, 'binary').toString('base64');
  }
  if (typeof globalThis.atob === 'undefined') {
    globalThis.atob = (b64) => Buffer.from(b64, 'base64').toString('binary');
  }
  
  // Mock console.warn/error to reduce noise (can be spied on in tests)
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  // Reset Chrome mock state between tests
  if (chromeMock && chromeMock.__reset) {
    chromeMock.__reset();
  }
  // Clear all mock call history
  vi.clearAllMocks();
});

afterAll(() => {
  uninstallChromeMock();
  vi.restoreAllMocks();
});
