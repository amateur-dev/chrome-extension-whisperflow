# ARCH

## High-Level Architecture

VibeCoding operates entirely within the browser sandbox using a multi-worker architecture to handle heavy AI tasks without freezing the UI.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BROWSER SANDBOX                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────┐          ┌─────────────────────────┐                     │
│   │  Popup UI    │◄────────►│  Background Service     │                     │
│   │  (popup.js)  │  chrome  │  Worker                 │                     │
│   └──────────────┘  .runtime│  (service-worker.js)    │                     │
│                     .sendMsg└───────────┬─────────────┘                     │
│   ┌──────────────┐          ▲           │                                   │
│   │Content Script│◄─────────┘           │                                   │
│   │ (content.js) │                      │                                   │
│   └──────────────┘                      ▼                                   │
│                           ┌─────────────────────────────┐                   │
│                           │   Offscreen Document        │                   │
│                           │   (offscreen.js)            │                   │
│                           └─────────────┬───────────────┘                   │
│                                         │ postMessage                       │
│                                         ▼                                   │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    AI WORKERS (Off-Main-Thread)                      │   │
│   ├─────────────────────┬─────────────────────┬─────────────────────────┤   │
│   │  Moonshine Worker   │   Whisper Worker    │    WebLLM Worker        │   │
│   │  (Transformers.js)  │   (WASM)            │    (WebGPU/WASM)        │   │
│   │                     │                     │                         │   │
│   │  ┌───────────────┐  │  ┌───────────────┐  │  ┌───────────────────┐  │   │
│   │  │ moonshine-    │  │  │ whisper-      │  │  │ webllm-worker.js  │  │   │
│   │  │ worker.js     │  │  │ worker.js     │  │  │                   │  │   │
│   │  └───────────────┘  │  └───────────────┘  │  └───────────────────┘  │   │
│   └─────────────────────┴─────────────────────┴─────────────────────────┘   │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                           STORAGE                                    │   │
│   │                    chrome.storage.local                              │   │
│   │              (settings, transcripts, model cache)                    │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Directory Structure

- **root**
  - `manifest.json` : Entry point, permissions, MV3 config, keyboard shortcuts.
  - `service-worker.js` : Central orchestrator, handles message passing, worker lifecycle, and keyboard commands.
  - `popup.html` / `popup.js` : User interface, recording controls, transcript display.
  - `content.js` : Floating mic buttons, recording overlay, auto-paste into inputs.
  - `content.css` : Styles for mic buttons, recording overlay, animations.
  - `styles.css` : Global styles for popup.

- **lib/** (AI Core)
  - `moonshine-worker.js`: Primary speech-to-text worker (Transformers.js).
  - `whisper-worker.js` : Legacy/Alternative WASM wrapper.
  - `webllm-worker.js` : Wrapper for LLM rewriting logic.
  - `utils.js` : Shared helpers.

- **assets/** : Icons and media resources.

- **docs/memory-bank/** : Active documentation for AI agents.

## Key Data Flows

1. **Recording:**
   User clicks Record -> `popup.js` (or `content.js`) captures `MediaRecorder` stream -> blobs sent to `service-worker.js`.

2. **Transcription:**
   `service-worker.js` forwards audio to `offscreen.js` -> `moonshine-worker.js` -> Text returned -> stored/sent back.

3. **Refinement (Rewrite):**
   User clicks "Format" -> `popup.js` requests rewrite -> `webllm-worker.js` processes text -> clean text returned.

4. **Injection:**
   User clicks "Insert" -> `popup.js` sends message to `content.js` -> text inserted into active DOM element.

5. **Floating Mic Buttons:**
   User clicks mic icon on any input -> `content.js` starts recording -> sends audio to `service-worker.js` -> forwarded to `moonshine-worker.js` -> transcription returned -> text auto-inserted.

6. **Keyboard Shortcuts:**
   User presses `Alt+Shift+R` -> `chrome.commands` triggers `service-worker.js` -> broadcasts to active tab's `content.js` -> toggles recording.
