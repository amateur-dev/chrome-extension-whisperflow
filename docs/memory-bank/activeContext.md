# activeContext

## Current Session
**Goal:** Fix user-reported "Model not loaded" error and "Formatting Infinite Hang".

## Current Focus
- Resolved WASM loading issue by bundling binary files locally (removed CDN dependency).
- Fixed WebLLM Worker communication breakdown (causing formatting hang).
- Added robust unit test for WebLLM Worker.

## Recent Changes
- **WASM Bundle Fix:**
  - Copied `ort-wasm-simd-threaded.wasm` to `lib/`.
  - Updated `moonshine-worker.js` to load from local path.
- **Worker Communication Fix:**
  - Updated `offscreen.js` to route `REWRITE` messages correctly.
  - Refactored `webllm-worker.js` to handle messages reliably & provide Stub/Fallback.
  - Fixed syntax error in `webllm-worker.js`.
- **Testing:**
  - Created `tests/unit/webllm.test.js` covering worker initialization and message handling.
  - Verified all 6 suite tests (61 tests total) pass.

## Previous Changes (Phase 3)
- Restored `content.js` Floating Mic logic.
- Fixed WASM thread safety loop.

## Next Steps
- [ ] Manual E2E test: Record audio -> Transcribe -> Format -> Check Result.
- [ ] Release Prep: Create a zip build for manual installation.
