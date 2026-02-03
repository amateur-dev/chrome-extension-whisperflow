
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Moonshine Worker Concurrency', () => {
  
  beforeEach(() => {
    // Setup global self which the worker expects specific to the test context
    global.self = {
      postMessage: vi.fn(),
      onmessage: null,
      importScripts: vi.fn(), // Just in case
    };
    
    // Mock performance.now for logging
    global.performance = { now: () => Date.now() };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    delete global.self;
  });

  it('should prevent multiple pipeline initializations when loadModel is triggered concurrently', async () => {
    // 1. Setup the controlled Promise to simulate slow loading
    let resolvePipeline;
    const pipelinePromise = new Promise((resolve) => {
      resolvePipeline = resolve;
    });

    // 2. Mock the transformers library (LOCAL FILE import)
    vi.doMock('../../lib/transformers.min.js', () => ({
      pipeline: vi.fn(() => pipelinePromise),
      env: { 
        allowLocalModels: true, // properties assigned by consumer
        useBrowserCache: true,
        backends: { 
          onnx: { 
            wasm: { numThreads: 1, proxy: false } 
          } 
        } 
      }
    }));

    // 3. Import the worker (triggers execution)
    // We add a timestamp to ensure unique module import if caching issues arise
    await import('../../lib/moonshine-worker.js?t=' + Date.now());

    // 4. Verify message handler attached
    expect(global.self.onmessage).toBeTypeOf('function');

    // 5. Get the mock to spy on it
    const { pipeline } = await import('../../lib/transformers.min.js');

    // 6. Simulate Race Condition:
    // Call LOAD_MODEL twice effectively in parallel (synchronous loop start)
    console.log('--- Triggering Request 1 ---');
    const request1 = global.self.onmessage({ data: { type: 'LOAD_MODEL' } });
    
    console.log('--- Triggering Request 2 ---');
    const request2 = global.self.onmessage({ data: { type: 'LOAD_MODEL' } });

    // 7. Verify pipeline was only called ONCE at this point
    expect(pipeline).toHaveBeenCalledTimes(1);
    console.log('Assertion Passed: Pipeline called exactly once during load');

    // 8. Allow the loading to finish
    console.log('--- Resolving Pipeline ---');
    resolvePipeline(async () => ({ text: "ready" }));

    // 9. Wait for both "threads" to complete
    await Promise.all([request1, request2]);

    // 10. Verify pipeline was STILL only called once (no second call after resolution)
    expect(pipeline).toHaveBeenCalledTimes(1);
    console.log('Assertion Passed: Pipeline called exactly once after completion');

    // 11. Check success messages
    const successMessages = global.self.postMessage.mock.calls
      .map(call => call[0])
      .filter(msg => msg.type === 'MODEL_LOADED' && msg.success === true);
    
    expect(successMessages.length).toBeGreaterThan(0);
  });
});
