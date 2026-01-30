# ARCH

## High-Level Architecture

VibeCoding operates entirely within the browser sandbox using a multi-worker architecture to handle heavy AI tasks without freezing the UI.

```mermaid
flowchart LR
    Popup[Popup UI] <--> ServiceWorker[Background Service Worker]
    ContentScript[Content Script] <--> ServiceWorker
    
    subgraph "AI Workers (Off-Main-Thread)"
        ServiceWorker <--> Whisper[Whisper Worker (WASM)]
        ServiceWorker <--> WebLLM[WebLLM Worker]
        ServiceWorker <--> Moonshine[Moonshine Worker]
    end
    
    subgraph "Storage"
        ChromeStorage[(chrome.storage.local)]
    end
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
