# TECH_STACK

## Core Runtime
- **Environment:** Chrome Extension (Manifest V3)
- **Language:** Vanilla JavaScript (ES2022+)
- **Runtime:** Service Workers (Background), DOM API (Popup/Content Scripts)

## AI & ML (Local/Edge)
- **Speech-to-Text:** Whisper.cpp (WASM port)
  - Wrapper: `lib/whisper-worker.js`
- **Text Refinement:** WebLLM (Browser-native LLM inference)
  - Wrapper: `lib/webllm-worker.js`
  - *No cloud API keys required*

## Frontend (Popup & Content)
- **Framework:** Vanilla JS (No React/Vue/Svelte)
- **Styling:** CSS3 (Variables, Flexbox/Grid) in `styles.css`
- **Bundler:** None (Native ES Modules)

## Architecture specific
- **Storage:** `chrome.storage.local` for transcripts and settings
- **Communication:**
  - `chrome.runtime.sendMessage` / `onMessage` for Popup <-> Background
  - `Worker.postMessage` for Background <-> AI Workers (Moonshine, Whisper, WebLLM)

## Testing
- **Framework:** Vitest (ES Module native, Node.js)
- **Unit Tests:** `npm test` — 45 tests for pure functions (utils, formatting)
- **Integration Tests:** `npm run test:integration` — Real model transcription with audio fixtures
- **All Tests:** `npm run test:all` — 49 tests total
- **Manual Checks:** E2E "Vibe Checks" for browser-specific functionality

## UX Features
- **Floating Mic Buttons:** Injected on `<input>`, `<textarea>`, `[contenteditable]`
- **Dynamic Detection:** `MutationObserver` for SPA-friendly input detection
- **Keyboard Shortcuts:** `Alt+Shift+V` (popup), `Alt+Shift+R` (toggle recording)
- **Recording Overlay:** Purple pulse animation during recording
- **Auto-Paste:** Transcription inserted into clicked input automatically
