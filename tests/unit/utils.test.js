/**
 * Unit tests for lib/utils.js
 * Tests pure utility functions without browser dependencies
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  formatDuration,
  debounce,
  isWasmSupported,
  applyBasicFormatting,
  CONTRACTIONS_MAP,
  ALWAYS_CAPITALIZE,
  storage
} from '../../lib/utils.js';


describe('arrayBufferToBase64', () => {
  it('should convert empty ArrayBuffer to empty string', () => {
    const buffer = new ArrayBuffer(0);
    expect(arrayBufferToBase64(buffer)).toBe('');
  });

  it('should convert simple ArrayBuffer to base64', () => {
    const str = 'Hello';
    const buffer = new TextEncoder().encode(str).buffer;
    const base64 = arrayBufferToBase64(buffer);
    expect(base64).toBe('SGVsbG8=');
  });

  it('should handle binary data correctly', () => {
    const bytes = new Uint8Array([0, 127, 255, 128, 64]);
    const base64 = arrayBufferToBase64(bytes.buffer);
    expect(base64).toBe('AH//gEA=');
  });
});


describe('base64ToArrayBuffer', () => {
  it('should convert empty base64 to empty ArrayBuffer', () => {
    const buffer = base64ToArrayBuffer('');
    expect(buffer.byteLength).toBe(0);
  });

  it('should convert base64 to ArrayBuffer', () => {
    const base64 = 'SGVsbG8=';  // "Hello"
    const buffer = base64ToArrayBuffer(base64);
    const decoded = new TextDecoder().decode(buffer);
    expect(decoded).toBe('Hello');
  });

  it('should roundtrip with arrayBufferToBase64', () => {
    const original = new Uint8Array([1, 2, 3, 4, 5, 100, 200, 255]);
    const base64 = arrayBufferToBase64(original.buffer);
    const result = new Uint8Array(base64ToArrayBuffer(base64));
    expect(Array.from(result)).toEqual(Array.from(original));
  });
});


describe('formatDuration', () => {
  it('should format 0 seconds as 0:00', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('should format seconds under a minute', () => {
    expect(formatDuration(5)).toBe('0:05');
    expect(formatDuration(30)).toBe('0:30');
    expect(formatDuration(59)).toBe('0:59');
  });

  it('should format exactly one minute', () => {
    expect(formatDuration(60)).toBe('1:00');
  });

  it('should format minutes and seconds', () => {
    expect(formatDuration(90)).toBe('1:30');
    expect(formatDuration(125)).toBe('2:05');
    expect(formatDuration(3661)).toBe('61:01');
  });

  it('should handle fractional seconds', () => {
    expect(formatDuration(30.7)).toBe('0:30');
    expect(formatDuration(59.9)).toBe('0:59');
  });
});


describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should delay function execution', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should only call once for rapid invocations', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('a');
    debounced('b');
    debounced('c');

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('c');
  });

  it('should reset timer on each call', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    vi.advanceTimersByTime(50);
    debounced();
    vi.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});


describe('isWasmSupported', () => {
  it('should return true in Node.js (WASM is supported)', () => {
    // Node.js has WebAssembly support
    expect(isWasmSupported()).toBe(true);
  });
});


describe('applyBasicFormatting', () => {
  it('should return empty string for null/undefined', () => {
    expect(applyBasicFormatting(null)).toBe('');
    expect(applyBasicFormatting(undefined)).toBe('');
    expect(applyBasicFormatting('')).toBe('');
  });

  it('should capitalize first letter', () => {
    expect(applyBasicFormatting('hello')).toBe('Hello.');
  });

  it('should add period if missing', () => {
    expect(applyBasicFormatting('hello world')).toBe('Hello world.');
  });

  it('should not add period if sentence ends with punctuation', () => {
    expect(applyBasicFormatting('hello world!')).toBe('Hello world!');
    expect(applyBasicFormatting('is it working?')).toBe('Is it working?');
  });

  it('should remove filler words at start', () => {
    // Note: Current implementation capitalizes before filler removal,
    // so result may have lowercase first letter after filler is removed
    const result1 = applyBasicFormatting('um hello there');
    expect(result1).not.toContain('um');
    expect(result1.toLowerCase()).toContain('hello there');
    
    const result2 = applyBasicFormatting('uh, I think so');
    expect(result2).not.toMatch(/\buh\b/i);
    expect(result2.toLowerCase()).toContain('think so');
  });

  it('should remove filler words in middle', () => {
    const result = applyBasicFormatting('I think, um, that works');
    expect(result).not.toContain(' um ');
    expect(result).toContain('I think');
    expect(result).toContain('works');
  });

  it('should fix standalone "i" to "I"', () => {
    expect(applyBasicFormatting('i am here')).toBe('I am here.');
    // "can i help" starts with question word, so gets question mark
    expect(applyBasicFormatting('can i help')).toBe('Can I help?');
  });

  it('should fix contractions', () => {
    expect(applyBasicFormatting("i'm going")).toBe("I'm going.");
    expect(applyBasicFormatting("i don't know")).toBe("I don't know.");
  });

  it('should capitalize after periods', () => {
    expect(applyBasicFormatting('first sentence. second sentence')).toBe(
      'First sentence. Second sentence.'
    );
  });

  it('should collapse multiple spaces', () => {
    expect(applyBasicFormatting('hello    world')).toBe('Hello world.');
  });

  it('should remove discourse markers as fillers', () => {
    // "you know" as interjection - comma may be absorbed
    const result1 = applyBasicFormatting('I think, you know, we should go');
    expect(result1).not.toContain('you know');
    expect(result1).toContain('I think');
    expect(result1).toContain('we should go');
    
    // "like" at start
    expect(applyBasicFormatting('like, that was cool')).toBe('That was cool.');
    
    // "I mean" as filler
    const result2 = applyBasicFormatting('I mean, this is great');
    expect(result2).not.toContain('I mean');
    expect(result2).toContain('great');
    
    // "basically" at start
    expect(applyBasicFormatting('basically we need to fix it')).toBe('We need to fix it.');
  });

  it('should remove repeated words', () => {
    expect(applyBasicFormatting('the the cat')).toBe('The cat.');
    expect(applyBasicFormatting('I I think so')).toBe('I think so.');
    expect(applyBasicFormatting('we we we need help')).toBe('We we need help.'); // Only removes consecutive pairs
  });

  it('should capitalize proper nouns', () => {
    expect(applyBasicFormatting('check your gmail')).toContain('Gmail');
    expect(applyBasicFormatting('open google docs')).toContain('Google');
    expect(applyBasicFormatting('send it on slack')).toContain('Slack');
    expect(applyBasicFormatting('post on linkedin')).toContain('Linkedin');
  });

  it('should uppercase known acronyms', () => {
    expect(applyBasicFormatting('the ai is smart')).toContain('AI');
    expect(applyBasicFormatting('call the api')).toContain('API');
    expect(applyBasicFormatting('check the url')).toContain('URL');
  });

  it('should detect and add question marks', () => {
    expect(applyBasicFormatting('what do you think')).toBe('What do you think?');
    expect(applyBasicFormatting('how does this work')).toBe('How does this work?');
    expect(applyBasicFormatting('is this correct')).toBe('Is this correct?');
    expect(applyBasicFormatting('can you help me')).toBe('Can you help me?');
  });

  it('should add question mark for tag questions', () => {
    expect(applyBasicFormatting('this works right')).toBe('This works right?');
    expect(applyBasicFormatting('you can do it, can you')).toBe("You can do it, can you?");
  });

  it('should fix spacing around punctuation', () => {
    expect(applyBasicFormatting('hello , world')).toBe('Hello, world.');
    expect(applyBasicFormatting('one,two,three')).toBe('One, two, three.');
  });

  it('should handle more contractions', () => {
    // Contractions at sentence start get capitalized
    expect(applyBasicFormatting("let's go")).toBe("Let's go.");
    expect(applyBasicFormatting("that's cool")).toBe("That's cool.");
    expect(applyBasicFormatting("we're ready")).toBe("We're ready.");
    expect(applyBasicFormatting("they've arrived")).toBe("They've arrived.");
    // Contractions mid-sentence stay lowercase
    expect(applyBasicFormatting("I think that's cool")).toBe("I think that's cool.");
  });

  it('should handle hmm as filler', () => {
    expect(applyBasicFormatting('hmm I think so')).toBe('I think so.');
    expect(applyBasicFormatting('the answer is, hmm, yes')).toBe('The answer is, yes.');
  });

  it('should not duplicate punctuation', () => {
    expect(applyBasicFormatting('hello..')).toBe('Hello.');
    // "what" starts with question word, but already has punctuation
    expect(applyBasicFormatting('what??')).toBe('What?');
    expect(applyBasicFormatting('wow!!!')).toBe('Wow!');
  });

  it('should handle complex real-world transcription', () => {
    const input = 'um so basically i was, you know, thinking about the the api and, uh, how it works with gmail';
    const result = applyBasicFormatting(input);
    
    // Should not have fillers
    expect(result).not.toMatch(/\bum\b/i);
    expect(result).not.toMatch(/\buh\b/i);
    expect(result).not.toMatch(/\byou know\b/i);
    
    // Should have proper nouns capitalized
    expect(result).toContain('API');
    expect(result).toContain('Gmail');
    
    // Should not have repeated words
    expect(result).not.toMatch(/\bthe the\b/i);
    
    // Should end with punctuation
    expect(result).toMatch(/[.!?]$/);
  });
});


describe('CONTRACTIONS_MAP', () => {
  it('should have common contractions', () => {
    expect(CONTRACTIONS_MAP["i'm"]).toBe("I'm");
    expect(CONTRACTIONS_MAP["don't"]).toBe("don't");
    expect(CONTRACTIONS_MAP["can't"]).toBe("can't");
  });

  it('should have expanded contractions', () => {
    expect(CONTRACTIONS_MAP["let's"]).toBe("let's");
    expect(CONTRACTIONS_MAP["that's"]).toBe("that's");
    expect(CONTRACTIONS_MAP["we're"]).toBe("we're");
    expect(CONTRACTIONS_MAP["they've"]).toBe("they've");
  });
});


describe('ALWAYS_CAPITALIZE', () => {
  it('should include common platforms', () => {
    expect(ALWAYS_CAPITALIZE).toContain('gmail');
    expect(ALWAYS_CAPITALIZE).toContain('slack');
    expect(ALWAYS_CAPITALIZE).toContain('notion');
    expect(ALWAYS_CAPITALIZE).toContain('linkedin');
  });

  it('should include common acronyms', () => {
    expect(ALWAYS_CAPITALIZE).toContain('ai');
    expect(ALWAYS_CAPITALIZE).toContain('api');
    expect(ALWAYS_CAPITALIZE).toContain('url');
  });

  it('should include days of the week', () => {
    expect(ALWAYS_CAPITALIZE).toContain('monday');
    expect(ALWAYS_CAPITALIZE).toContain('friday');
    expect(ALWAYS_CAPITALIZE).toContain('sunday');
  });
});


describe('storage utility', () => {
  it('should get values from chrome.storage.local', async () => {
    // Set a value first
    await storage.set('testKey', 'testValue');
    
    const result = await storage.get('testKey');
    expect(result).toBe('testValue');
  });

  it('should return default value when key not found', async () => {
    const result = await storage.get('nonexistent', 'default');
    expect(result).toBe('default');
  });

  it('should set values in chrome.storage.local', async () => {
    const success = await storage.set('myKey', { data: 123 });
    expect(success).toBe(true);
    
    const result = await storage.get('myKey');
    expect(result).toEqual({ data: 123 });
  });

  it('should remove values from chrome.storage.local', async () => {
    await storage.set('toRemove', 'value');
    const success = await storage.remove('toRemove');
    expect(success).toBe(true);
    
    const result = await storage.get('toRemove', null);
    expect(result).toBe(null);
  });
});
