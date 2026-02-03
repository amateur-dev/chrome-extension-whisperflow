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
  - `manifest.json` : Entry point, permissions, MV3 config.
  - `service-worker.js` : Central orchestrator, handles message passing and worker lifecycle.
  - `popup.html` / `popup.js` : User interface, recording controls, transcript display.
  - `content.js` : Injects text into active page inputs (Gmail, Slack, etc.).
  - `styles.css` : Global styles for popup.

- **lib/** (AI Core)
  - `whisper-worker.js` : Wrapper for Whisper.cpp WASM inference.
  - `webllm-worker.js` : Wrapper for LLM rewriting logic.
  - `moonshine-worker.js`: Alternative STT worker support.
  - `utils.js` : Shared helpers.

- **assets/** : Icons and media resources.

- **docs/memory-bank/** : Active documentation for AI agents.

## Key Data Flows

1. **Recording:**
   User clicks Record -> `popup.js` captures `MediaRecorder` stream -> blobs sent to `service-worker.js`.

2. **Transcription:**
   `service-worker.js` sends audio chunks to `whisper-worker.js` -> Text returned -> stored in `chrome.storage.local`.

3. **Refinement (Rewrite):**
   User clicks "Format" -> `popup.js` requests rewrite -> `webllm-worker.js` processes text -> clean text returned.

4. **Injection:**
   User clicks "Insert" -> `popup.js` sends message to `content.js` -> text inserted into active DOM element.
