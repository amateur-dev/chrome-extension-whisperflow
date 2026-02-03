# progress

## Project Status: MVP Complete ✅
**Estimated Completion:** 100% (Core transcription + formatting + UX enhancements)

## Milestones
- [x] **Project Scaffold:** Manifest, Popup, Background script created.
- [x] **UI Implementation:** `popup.html` and `popup.js` structure exists.
- [x] **Testing Infrastructure:**
  - [x] Vitest configured with ES Module support.
  - [x] Chrome API mocks for unit testing.
  - [x] 45 unit tests for `lib/utils.js` (all passing).
  - [x] 4 integration tests with real Moonshine transcription.
  - [x] Audio fixtures with 16kHz WAV format.
- [x] **Service Worker Hub:**
  - [x] `sendToOffscreen()` helper with timeout.
  - [x] Progress message forwarding to popup.
  - [x] Keyboard shortcut command handling.
- [x] **Audio Capture:** `MediaRecorder` with 5-min limit.
- [x] **Moonshine Integration:**
  - [x] Full Transformers.js pipeline in `moonshine-worker.js`.
  - [x] Progress callbacks during model loading.
  - [x] Worker idle cleanup after 5 minutes.
- [x] **Text Formatting (Phase 3 Alternative):**
  - [x] Enhanced `applyBasicFormatting()` with 12-step pipeline.
  - [x] Filler/hesitation word removal (um, uh, like, you know, etc.).
  - [x] Repeated word cleanup, proper noun capitalization.
  - [x] Question detection, contraction normalization.
  - [x] WebLLM skipped for MVP — basic formatting sufficient.
- [x] **Text Injection:** `content.js` handles rich editors.
- [x] **UX Enhancements:**
  - [x] Floating mic buttons on all inputs/textareas.
  - [x] MutationObserver for dynamically added inputs.
  - [x] Recording overlay with pulse animation.
  - [x] Auto-paste transcription into target input.
  - [x] Keyboard shortcuts: Alt+Shift+V (popup), Alt+Shift+R (record).
- [x] **Whisper Integration:** Replaced Moonshine with `Xenova/whisper-tiny` for better accuracy.

## Post-Launch Stability (Phase 4)
- [x] Fix "Model not loaded properly" race condition.
- [x] Fix WASM backend loading (Local Bundle).
- [x] Fix "Infinite Formatting Hang" (Timeout reduced + Stub Worker).
- [x] **Model Upgrade:** Switched to `Whisper Tiny` (40MB) for better stability/speed.
- [x] **UX Polish:** Auto-hide redundant textual output.
- [x] Comprehensive Unit Test Suite (100% Pass).

## Known Blockers
- None for MVP.

## Test Commands
```bash
npm test                  # Unit tests (45 tests, ~300ms)
npm run test:integration  # Real model transcription (~7s)
npm run test:all          # All 49 tests
```
