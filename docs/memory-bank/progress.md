# progress

## Project Status: MVP Development
**Estimated Completion:** ~75% (Core transcription flow complete, WebLLM refinement pending)

## Milestones
- [x] **Project Scaffold:** Manifest, Popup, Background script created.
- [x] **UI Implementation:** `popup.html` and `popup.js` structure exists.
- [x] **Testing Infrastructure:**
  - [x] Vitest configured with ES Module support.
  - [x] Chrome API mocks for unit testing.
  - [x] 30 unit tests for `lib/utils.js` (all passing).
  - [x] 4 integration tests with real Moonshine transcription.
  - [x] Audio fixtures with 16kHz WAV format.
- [x] **Service Worker Hub:**
  - [x] `sendToOffscreen()` helper with timeout.
  - [x] Progress message forwarding to popup.
- [x] **Audio Capture:** `MediaRecorder` with 5-min limit.
- [x] **Moonshine Integration:**
  - [x] Full Transformers.js pipeline in `moonshine-worker.js`.
  - [x] Progress callbacks during model loading.
  - [x] Worker idle cleanup after 5 minutes.
- [x] **Text Injection:** `content.js` handles rich editors.
- [ ] **WebLLM Integration:** `webllm-worker.js` not yet implemented.
- [ ] **Whisper Integration:** Placeholder only (Moonshine is primary).

## Known Blockers
- None for MVP. WebLLM is enhancement, not blocker.

## Test Commands
```bash
npm test              # Unit tests (~1s)
npm run test:integration  # Real model transcription (~9s)
npm run test:all      # All 34 tests
```
