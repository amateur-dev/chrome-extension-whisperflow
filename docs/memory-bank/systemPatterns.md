# systemPatterns

## Architecture Decisions
- **Vanilla JS:** To keep the extension lightweight and avoid complex build steps for the MVP.
- **Worker-First AI:** All heavy compute (Whisper, LLM) **MUST** run in dedicated Web Workers (`lib/*-worker.js`) to prevent blocking the UI thread (Popup).
- **Message Passing Hub:** `service-worker.js` acts as the router. Popup never talks to workers directly; it requests actions from the Service Worker, which delegates to the specific AI worker.
- **Offscreen Document:** Required for Web Workers in MV3 (service workers can't spawn workers directly).

## Code style & Conventions
- **Classes for UI:** Use `class` syntax for the Popup manager (e.g., `VibeCodingPopup`) to organize DOM state.
- **Async/Await:** Prefer over raw promises for readability.
- **Error Handling:** AI model failures must fail gracefully with user-visible errors in the Popup, not just console logs.

## State Management
- **Ephemeral:** RAM state in `popup.js` (current recording buffer).
- **Persistent:** `chrome.storage.local` for:
    - User settings (Model selection).
    - Cached transcripts (History).
    - Model download status.

## Testing Patterns
- **Unit Tests:** Pure functions in `lib/utils.js` tested directly with Vitest.
- **Chrome API Mocking:** `tests/mocks/chrome.js` provides stubs for `chrome.storage`, `chrome.runtime`, etc.
- **Integration Tests:** Real Moonshine model inference via `@huggingface/transformers` in Node.js.
- **Audio Fixtures:** 16kHz mono WAV files in `tests/fixtures/` with keyword-based validation.
- **No Browser Required:** Integration tests run in Node.js using the same Transformers.js library.

## DOM Injection Pattern (Content Script)
1. Try `document.activeElement` first.
2. Check for `selection` ranges.
3. Fallback: `document.execCommand('insertText')` (Deprecated but still widely reliable for legacy inputs).
4. Final Fallback: Copy to clipboard and alert user.
