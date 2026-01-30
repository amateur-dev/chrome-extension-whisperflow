# systemPatterns

## Architecture Decisions
- **Vanilla JS:** To keep the extension lightweight and avoid complex build steps for the MVP.
- **Worker-First AI:** All heavy compute (Whisper, LLM) **MUST** run in dedicated Web Workers (`lib/*-worker.js`) to prevent blocking the UI thread (Popup).
- **Message Passing Hub:** `service-worker.js` acts as the router. Popup never talks to workers directly; it requests actions from the Service Worker, which delegates to the specific AI worker.

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

## DOM Injection Pattern (Content Script)
1. Try `document.activeElement` first.
2. Check for `selection` ranges.
3. Fallback: `document.execCommand('insertText')` (Deprecated but still widely reliable for legacy inputs).
4. Final Fallback: Copy to clipboard and alert user.
