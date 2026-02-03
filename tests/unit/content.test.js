
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

describe('Content Script - FloatingMicManager', () => {
  let FloatingMicManager;
  let dom;

  beforeEach(async () => {
    // 1. Setup JSDOM
    dom = new JSDOM('<!DOCTYPE html><body><input type="text" id="test-input" /></body>', {
      url: 'http://localhost',
      pretendToBeVisual: true
    });
    
    // Set globals
    vi.stubGlobal('window', dom.window);
    vi.stubGlobal('document', dom.window.document);
    vi.stubGlobal('HTMLElement', dom.window.HTMLElement);
    vi.stubGlobal('MutationObserver', vi.fn(() => ({
      observe: vi.fn(),
      disconnect: vi.fn(),
      takeRecords: vi.fn(),
    })));
    vi.stubGlobal('ResizeObserver', vi.fn(() => ({
      observe: vi.fn(),
      disconnect: vi.fn(),
      unobserve: vi.fn(),
    })));
    
    // Mock chrome API
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage: vi.fn(),
        onMessage: {
          addListener: vi.fn()
        },
        getURL: vi.fn(path => path)
      }
    });

    // Handle navigator separately
    const mockNavigator = {
        ...dom.window.navigator,
        clipboard: { writeText: vi.fn() },
        mediaDevices: { getUserMedia: vi.fn() }
    };
    vi.stubGlobal('navigator', mockNavigator);

    // Mock Element.getBoundingClientRect
    dom.window.HTMLElement.prototype.getBoundingClientRect = () => ({
      width: 100,
      height: 30,
      top: 10,
      left: 10,
      right: 110,
      bottom: 40
    });

    // 2. Import the module
    // We use a fresh import for each test to reset state
    // Note: Since content.js is not a pure module and has top-level execution code, 
    // we need to be careful. The export we added helps.
    const module = await import('../../content.js?t=' + Date.now());
    FloatingMicManager = module.FloatingMicManager;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete global.window;
    delete global.document;
    delete global.navigator;
    delete global.chrome;
  });

  it('should initialize and scan for existing inputs', () => {
    const manager = new FloatingMicManager();
    // It should have found the input from JSDOM setup
    expect(manager.buttons.size).toBe(1);
    const input = document.getElementById('test-input');
    expect(manager.buttons.has(input)).toBe(true);
  });

  it('should create a button for the input', () => {
    const manager = new FloatingMicManager();
    const input = document.getElementById('test-input');
    const btn = manager.buttons.get(input);
    
    expect(btn).toBeDefined();
    expect(btn.className).toBe('vibecoding-mic-btn');
    expect(document.body.contains(btn)).toBe(true);
  });

  it('should ignore small or invalid inputs', () => {
    // Setup small input
    const smallInput = document.createElement('input');
    document.body.appendChild(smallInput);
    
    // Override getBoundingClientRect for this specific input
    smallInput.getBoundingClientRect = () => ({ width: 10, height: 10, top: 0, left: 0 });
    
    const manager = new FloatingMicManager();
    // It scans on init. The test-input is valid, smallInput is not.
    // wait... getBoundingClientRect mock on prototype is static in this setup.
    // We need to inject the mock behavior differently or just rely on the default prototype mock.
    // Our prototype mock returns 100x30, which is valid (>40x20).
    
    // Let's create a disabled input
    const disabledInput = document.createElement('input');
    disabledInput.disabled = true;
    document.body.appendChild(disabledInput);
    
    // Re-scan
    manager.scanForInputs();
    
    expect(manager.buttons.has(disabledInput)).toBe(false);
  });

  it('should toggle recording on click', async () => {
    const manager = new FloatingMicManager();
    const input = document.getElementById('test-input');
    const btn = manager.buttons.get(input);
    
    // Mock getUserMedia success
    const mockStream = { getTracks: () => [] };
    global.navigator.mediaDevices.getUserMedia.mockResolvedValue(mockStream);
    
    // Mock MediaRecorder
    global.MediaRecorder = vi.fn(() => ({
      start: vi.fn(),
      stop: vi.fn(),
      addEventListener: vi.fn(),
      stream: mockStream
    }));
    
    // Click the button
    btn.dispatchEvent(new dom.window.Event('click'));
    
    // Wait for async startRecording
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
    expect(manager.recordingState.isRecording).toBe(true);
    expect(manager.recordingState.activeElement).toBe(input);
  });
});
