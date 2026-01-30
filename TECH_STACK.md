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
- **Strategy:** Manual "Vibe Checks" (E2E)
