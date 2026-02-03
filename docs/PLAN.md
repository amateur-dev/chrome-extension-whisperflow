# PLAN

## Phase 0: Testing Infrastructure ✅
- [x] **Vitest Setup**: `package.json`, `vitest.config.js` for ES Modules.
- [x] **Chrome API Mocks**: `tests/mocks/chrome.js` for storage, runtime, tabs.
- [x] **Unit Tests**: 30 tests for `lib/utils.js` (base64, formatting, debounce, storage).
- [x] **Integration Tests**: Real Moonshine transcription with audio fixtures.
- [x] **Audio Fixtures**: 16kHz mono WAV files with keyword validation.
- [x] **Documentation**: Updated `TECH_STACK.md`, `RULES.md` with test commands.

## Phase 1: Foundation & Wiring (Context: "The Nervous System")
- [x] **Project Scaffold**: Manifest V3, directory structure, icons.
- [x] **UI Skeleton**: `popup.html` with screens (Idle, Recording, Preview).
- [x] **UI Logic**: `popup.js` State Machine basics (switching screens).
- [ ] **Service Worker Hub**: Implement `onMessage` routing in `service-worker.js` to dispatch tasks to specific workers.
- [ ] **Worker Generation**: Ensure `lib/whisper-worker.js` and `lib/webllm-worker.js` instantiate correctly without silent failures.

## Phase 2: The Ear (Audio & Transcription)
- [ ] **Audio Capture**: Implement `MediaRecorder` in `popup.js` to capture Blob data.
- [ ] **Audio Message Protocol**: Define `TRANSCRIBE_AUDIO` message format (Blob -> ArrayBuffer -> Offscreen Doc?).
- [ ] **Whisper Core**:
    - [ ] Download/load `whisper.cpp` WASM binaries (check `assets/`).
    - [ ] Implement `loadModel` in `whisper-worker.js`.
    - [ ] Implement `transcribe` function in `whisper-worker.js`.
- [ ] **Transcription Feedback**: Stream partial results or progress % back to Popup.

## Phase 3: The Brain (Refinement)
- [ ] **WebLLM Setup**:
    - [ ] Configure `webllm-worker.js` with `MLCEngine`.
    - [ ] Select efficient small model (e.g., `Llama-3-8B-Quant` or `Gemma-2B`).
- [ ] **Prompt Engineering**:
    - [ ] Create system prompt for "Fix Grammar" mode.
    - [ ] Create system prompt for "Professional Tone" mode.
- [ ] **Streaming Response**: Handle token streaming from Worker -> ServiceWorker -> Popup.

## Phase 4: The Hands (Injection & Output)
- [ ] **Active Element Detection**: `content.js` heuristics to find the right `<textarea>` or `contenteditable`.
- [ ] **Injection Logic**: Implement `insertText` command.
- [ ] **Clipboard Fallback**: Reliable fallback if injection fails.

## Phase 5: Vibe Checks & Hardening
- [ ] **Memory Management**: Ensure Workers terminate/suspend to save RAM when idle.
- [ ] **Error Vibe**: Graceful UI when WASM fails to load (network error/memory error).
- [ ] **Privacy Check**: Audit network tab to ensure NO calls to OpenAI/google.com.
