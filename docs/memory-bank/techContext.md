# techContext

## Core Constraints
- **Platform:** Chrome Extension Manifest V3 (MV3).
- **Environment:**
    - **No remote code execution:** All AI models must be loaded via WASM or local execution.
    - **Service Worker lifecycle:** The background script can terminate at any time; state must be persisted to `chrome.storage`.
    - **CSP (Content Security Policy):** Strict limitations on `script-src`. `wasm-unsafe-eval` is key for Whisper.cpp.

## Technology Stack
- **Language:** Pure JavaScript (ES Modules, no transpilation).
- **UI:** HTML5 + CSS3 (No framework).
- **AI Models:**
    - **Speech:** Moonshine (Transformers.js) - primary, runs in Web Worker via offscreen document.
    - **Speech (Alt):** Whisper.cpp (WASM) - runs in a Web Worker.
    - **LLM:** WebLLM (MLC LLM) - runs in a Web Worker (uses WebGPU if available).

## Dependencies
- **Runtime (CDN-loaded in extension):**
    - `@huggingface/transformers` v3 (For Moonshine transcription).
    - `@mlc-ai/web-llm` (For text rewriting).
    - `whisper.cpp` WASM binaries (Alternative transcription).
- **Dev Dependencies (npm):**
    - `vitest` ^2.1.0 (Test framework).
    - `@huggingface/transformers` ^3.0.0 (For integration tests in Node.js).

## Development Setup
- **Build System:** None (Vanilla ES Modules). Direct load of `manifest.json`.
- **Testing:**
    - `npm test` — Unit tests (45 tests, ~300ms).
    - `npm run test:integration` — Real model transcription tests (4 tests, ~7s).
    - `npm run test:all` — Full test suite (49 tests).
- **Linting:** Standard JS style.

## Keyboard Shortcuts (chrome.commands)
- `_execute_action` — `Alt+Shift+V` opens popup (default behavior).
- `toggle-recording` — `Alt+Shift+R` toggles recording from any page.
- Shortcuts configurable at `chrome://extensions/shortcuts`.

## Known Technical Risks
- **WASM Memory Usage:** Large models might crash the extension process on low-RAM devices.
- **Cold Boot:** Model loading times (WASM download/init) can be slow on first run (~50MB for Moonshine-tiny).
- **DOM Injection:** `content.js` needs robust heuristics to find the "active" text field in complex apps (like Notion/Slack).
- **Mic Permissions in Popup:** Chrome popups can't reliably trigger `getUserMedia` permission prompt. Workaround: "Open in Tab" button.
- **CSS Conflicts:** Floating mic buttons use `.vibecoding-*` namespace to avoid conflicts with page styles.
