
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

// Read the worker script once
const workerScriptPath = path.resolve(__dirname, '../../lib/webllm-worker.js');
const workerScriptContent = fs.readFileSync(workerScriptPath, 'utf-8');

describe('WebLLM Worker', () => {
  beforeEach(() => {
    // Mock global self which the worker expects
    global.self = {
      postMessage: vi.fn(),
      onmessage: null
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete global.self;
  });

  // Helper to execute worker script
  const runWorkerScript = () => {
    // Wrap in IIFE to avoid global scope pollution and allow re-running
    // This allows 'let' declarations to be scoped to the function execution
    const iife = `(async function() { 
      ${workerScriptContent}
    })();`;
    
    // execute in the current scope (where global.self is available)
    // using indirect eval or just eval
    eval(iife);
  };

  it('should initialize and report ready', async () => {
    runWorkerScript();
    expect(global.self.postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'WORKER_READY' }));
  });

  it('should handle REWRITE message without model loaded (stub behavior)', async () => {
    runWorkerScript();
    
    // Clear initial ready message
    global.self.postMessage.mockClear();

    // Trigger REWRITE
    const onMessage = global.self.onmessage;
    
    if (!onMessage) {
        throw new Error("onMessage not defined on global.self");
    }
    
    // Worker is async, so we await the handler
    // The worker expects { type: 'REWRITE', data: { text: '...' } }
    const messagePromise = onMessage({ 
      data: { 
        type: 'REWRITE', 
        data: { text: 'hello i am testing' } 
      } 
    });

    // The worker has simulated delays (500ms load + 800ms inference)
    // We wait enough time for it to complete
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Just to be safe, await the handler if it returned a promise
    await messagePromise;

    const calls = global.self.postMessage.mock.calls.map(c => c[0]);
    
    // 1. Should auto-load model first
    expect(calls).toContainEqual(expect.objectContaining({ type: 'LOADING' }));
    expect(calls).toContainEqual(expect.objectContaining({ type: 'MODEL_LOADED', success: true }));
    
    // 2. Should send REWRITING status
    expect(calls).toContainEqual(expect.objectContaining({ type: 'REWRITING' }));
    
    // 3. Should send REWRITE_COMPLETE with formatted text
    expect(calls).toContainEqual(expect.objectContaining({ 
      type: 'REWRITE_COMPLETE', 
      success: true
    }));
    
    const result = calls.find(c => c.type === 'REWRITE_COMPLETE');
    expect(result.text).toBe('Hello I am testing.');
  });
});
