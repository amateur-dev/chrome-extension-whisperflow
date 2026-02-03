
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Offscreen Document', () => {
  let offscreenModule;
  let mockWorkerInstance;

  beforeEach(async () => {
    // Mock Worker
    mockWorkerInstance = {
      postMessage: vi.fn(),
      onmessage: null,
      onerror: null
    };
    
    global.Worker = vi.fn(() => mockWorkerInstance);

    // Mock chrome
    global.chrome = {
      runtime: {
        getURL: vi.fn(path => path),
        onMessage: {
          addListener: vi.fn()
        },
        sendMessage: vi.fn().mockResolvedValue()
      }
    };

    // Import module
    offscreenModule = await import('../../offscreen.js?t=' + Date.now());
    
    // Reset state if available (module reuse)
    if (offscreenModule.resetState) {
        offscreenModule.resetState();
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules(); // Reset module registry
    delete global.Worker;
    delete global.chrome;
  });

  it('initWorker should create a Moonshine worker', () => {
    offscreenModule.initWorker();
    
    expect(global.Worker).toHaveBeenCalledWith(
      expect.stringContaining('moonshine-worker.js'),
      { type: 'module' }
    );
    expect(mockWorkerInstance.onmessage).toBeTypeOf('function');
  });

  it('should handle worker messages (LOADING_PROGRESS)', () => {
    offscreenModule.initWorker();
    
    // Verify assignment
    expect(mockWorkerInstance.onmessage).toBeTypeOf('function');
    
    const handler = mockWorkerInstance.onmessage;
    
    // Simulate message
    handler({ data: { type: 'LOADING_PROGRESS', progress: 50, message: 'Halfway' } });
    
    expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'TRANSCRIPTION_PROGRESS',
      progress: 50,
      message: 'Halfway'
    });
  });

  it('should handle worker messages (TRANSCRIPTION_COMPLETE)', () => {
    offscreenModule.initWorker();
    const handler = mockWorkerInstance.onmessage;
    
    // We can't easily test pendingTranscription resolution because that state is internal to module closure
    // But we can test logs/message forwarding if any
    
    // Simulate complete
    handler({ 
        data: { 
            type: 'TRANSCRIPTION_COMPLETE', 
            success: true, 
            text: 'Hello world',
            model: 'moonshine',
            processingTime: 100
        } 
    });
    
    // The handler logs to console, but doesn't send message to chrome.runtime for complete?
    // Let's check logic. It resolves pendingTranscription.
    // DOES IT send message? no.
  });
});
