# activeContext

## Current Session
**Goal:** Fix user-reported UX issues (Hang, Hallucinations, UI Clutter).

## Current Focus
- Switched AI Model from `Moonshine Tiny` to `Whisper Tiny` for better accuracy/speed.
- Reduced Formatting Timeout to 5s.
- Cleaned up UI (Auto-hiding duplicate original text).

## Recent Changes
- **Model Switch:**
  - Upgraded `moonshine-worker.js` to use `Xenova/whisper-tiny` (40MB).
  - Significantly faster download and better "1700 hours" handling.
- **UX Fixes:**
  - **Timeout:** Reduced `offscreen.js` rewrite timeout from 120s -> 5s.
  - **UI Clutter:** Updated `popup.js` to hide "Original" box if identical to "Formatted".
- **Previous Fixes:**
  - Resolved WASM loading (local bundle).
  - Fixed WebLLM Worker communication.

## Next Steps
- [ ] Manual E2E test: Record audio -> Transcribe (Whisper) -> Format -> Check UI.
- [ ] Release Prep: Create a zip build for manual installation.
