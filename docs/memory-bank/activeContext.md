# activeContext

## Current Session
**Goal:** MVP Complete — floating mic buttons on inputs + keyboard shortcuts.

## Current Focus
- MVP transcription flow working end-to-end.
- UX enhancements for frictionless voice input.

## Recent Changes
- **Floating Mic Buttons (New):**
  - Mic button injected on every `<input>`, `<textarea>`, `[contenteditable]`.
  - `MutationObserver` detects dynamically added inputs.
  - Click mic → recording overlay with pulse animation.
  - Transcription auto-inserted into the specific clicked input.
  - WeakMap tracks which elements have buttons attached.
  - CSS with `.vibecoding-*` namespace to avoid conflicts.
  
- **Keyboard Shortcuts (New):**
  - `Alt+Shift+V` — Open popup (like clicking extension icon).
  - `Alt+Shift+R` — Toggle recording from anywhere on the page.
  - Configurable via `chrome://extensions/shortcuts`.
  
- **Files Modified:**
  - `content.js` — Complete rewrite with VibeCoding state object.
  - `content.css` — New file for mic button styles, animations.
  - `manifest.json` — Added commands, content.css, web_accessible_resources.
  - `service-worker.js` — Added keyboard command handler.
  - `assets/mic-icon.svg` — New microphone icon.

## Previous Changes (Phase 1-2)
- Fixed service-worker ↔ offscreen communication
- Added transcription progress UI
- Added 5-minute recording limit
- Added worker cleanup after 5-minute idle

## Next Steps
- [ ] Manual E2E test: Load extension in Chrome, record audio, verify transcription.
- [ ] Test floating mic buttons on various sites (Gmail, Notion, Slack).
- [ ] Add model download retry logic (3 attempts with backoff).
- [ ] Privacy audit: Verify no external API calls in Network tab.
- [ ] Consider WebLLM in v2 if users request "professional tone" feature.
