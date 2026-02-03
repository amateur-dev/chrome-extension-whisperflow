# PLAN

## Phase 0: Testing Infrastructure ✅
- [x] **Vitest Setup**: `package.json`, `vitest.config.js` for ES Modules.
- [x] **Chrome API Mocks**: `tests/mocks/chrome.js` for storage, runtime, tabs.
- [x] **Unit Tests**: 30 tests for `lib/utils.js` (base64, formatting, debounce, storage).
- [x] **Integration Tests**: Real Moonshine transcription with audio fixtures.
- [x] **Audio Fixtures**: 16kHz mono WAV files with keyword validation.
- [x] **Documentation**: Updated `TECH_STACK.md`, `RULES.md` with test commands.

## Phase 1: Foundation & Wiring ✅
- [x] **Project Scaffold**: Manifest V3, directory structure, icons.
- [x] **UI Skeleton**: `popup.html` with screens (Idle, Recording, Preview).
- [x] **UI Logic**: `popup.js` State Machine basics (switching screens).
- [x] **Service Worker Hub**: Fixed `onMessage` routing with `sendToOffscreen()` helper.
- [x] **Offscreen Communication**: Added timeout wrapper and ping check for reliability.
- [x] **Progress Forwarding**: Service worker relays progress to popup for UI updates.

## Phase 2: Audio & Transcription ✅ (Moonshine)
- [x] **Audio Capture**: `MediaRecorder` in `popup.js` captures Blob data.
- [x] **Audio Message Protocol**: Base64 encoding via `arrayBufferToBase64()`.
- [x] **Moonshine Core**: Full implementation via Transformers.js in `moonshine-worker.js`.
- [x] **Transcription Feedback**: Progress % shown in popup during model loading.
- [x] **Recording Limit**: Auto-stop at 5 minutes to prevent memory issues.
- [ ] **Whisper Core**: Deferred (Moonshine is primary, Whisper WASM stub exists).

## Phase 3: The Brain (Refinement) — Future
- [ ] **WebLLM Setup**: Configure `webllm-worker.js` with `MLCEngine`.
- [ ] **Model Selection**: SmolLM2-1.7B-Instruct (~1.5GB) recommended.
- [ ] **Prompt Engineering**: "Fix Grammar" and "Professional Tone" modes.
- [ ] **Streaming Response**: Token streaming from Worker → Popup.
- [x] **Basic Formatting**: `applyBasicFormatting()` in utils.js works as fallback.

## Phase 4: Injection & Output ✅
- [x] **Active Element Detection**: `content.js` handles textarea, input, contenteditable.
- [x] **Rich Editor Support**: Gmail, Slack, Notion, LinkedIn specific handling.
- [x] **Clipboard Fallback**: Falls back to clipboard with user notification.
- [ ] **Shadow DOM Support**: Not yet implemented (edge case).

## Phase 5: Hardening ✅ (Partial)
- [x] **Memory Management**: Worker terminates after 5 min idle via `terminateWorker()`.
- [x] **Timeout Handling**: 2-minute timeout on transcription requests.
- [x] **Error Messages**: Whisper throws clear "not implemented" error.
- [ ] **Retry Logic**: Model download retry not yet implemented.
- [ ] **Privacy Audit**: Network tab audit pending.
