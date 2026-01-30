# techContext

## Core Constraints
- **Platform:** Chrome Extension Manifest V3 (MV3).
- **Environment:**
    - **No remote code execution:** All AI models must be loaded via WASM or local execution.
    - **Service Worker lifecycle:** The background script can terminate at any time; state must be persisted to `chrome.storage`.
    - **CSP (Content Security Policy):** Strict limitations on `script-src`. `wasm-unsafe-eval` is key for Whisper.cpp.

## Technology Stack
- **Language:** Pure JavaScript (No transpilation step setup currently).
- **UI:** HTML5 + CSS3 (No framework).
- **AI Models:**
    - **Speech:** Whisper.cpp (WASM) - runs in a Web Worker.
    - **LLM:** WebLLM (MLC LLM) - runs in a Web Worker (uses WebGPU if available).

## Dependencies
- **External Libs (Vendorized or CDN shimmed):**
    - `@mlc-ai/web-llm` (For rewriting).
    - `whisper.cpp` (WASM binaries).
    - *Note: Ensure these are handled compliant with MV3 offline requirements (bundling vs dynamic import).*

## Development Setup
- **Build System:** None (Vanilla). Direct load of `manifest.json`.
- **Linting:** Standard JS style.

## Known Technical Risks
- **WASM Memory Usage:** Large models might crash the extension process on low-RAM devices.
- **Cold Boot:** Model loading times (WASM download/init) can be slow on first run.
- **DOM Injection:** `content.js` needs robust heuristics to find the "active" text field in complex apps (like Notion/Slack).
