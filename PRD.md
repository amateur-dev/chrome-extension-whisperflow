# VibeCoding Chrome Extension - Complete PRD

**Version:** 1.0  
**Date:** January 23, 2026  
**Build Time:** 60 minutes (workshop target)  
**Target Users:** Knowledge workers, developers, content creators  
**Platforms:** Chrome / Chromium-based browsers (Edge, Brave, etc.)

---

## 1. Executive Summary

**VibeCoding** is a lightweight Chrome Extension that transforms how people write by combining:
1. **Local speech-to-text** (Whisper.cpp WASM) – no cloud calls, no privacy leaks
2. **Local text rewriting/formatting** (WebLLM) – fixes grammar, tone, structure
3. **One-click insertion** – the formatted text appears directly in Gmail, Slack, Notion, LinkedIn, etc.

**Why it matters:** Knowledge workers spend ~40% of their day writing. VibeCoding reduces friction by letting them **speak naturally** → **AI cleans it up** → **paste it** (all offline, all private).

**Market positioning:** Like Grammarly meets voice input, but running 100% locally with no subscriptions or API keys.

---

## 2. Product Goals

### Must-Have (MVP)
- ✅ Record voice from any webpage
- ✅ Transcribe locally (no cloud)
- ✅ Rewrite/format text locally (no API key)
- ✅ Inject into active text field (Gmail, Slack, Notion, LinkedIn)
- ✅ Copy-to-clipboard fallback if injection fails
- ✅ Graceful degradation on unsupported browsers/devices

### Nice-to-Have (v2+)
- Tone selector (formal / casual / creative)
- Language support (beyond English)
- Recording history / re-record
- Keyboard shortcut (Alt+V)
- Analytics (anon. usage stats)

### Non-Goals
- Real-time transcription
- Multi-language real-time translation
- Plagiarism detection
- Cloud backup of recordings

---

## 3. Business Model & GTM

### Monetization (Future)
- **Free tier:** Basic transcription + rewrite (no model tuning)
- **Premium tier:** $3–5/month – priority inference, faster rewrites, custom tone profiles
- **B2B licensing:** For enterprise Slack/Teams workspaces

### Event Pitch (Feb 4)
*"In 60 minutes, we're building a AI-powered writing assistant that runs completely offline. No API keys. No cloud calls. Attendees get a fully working extension they can install and use immediately."*

---

## 4. Core Features & User Flow

### 4.1 Main Flow

```
User opens Gmail (or any text editor on the web)
    ↓
Clicks the VibeCoding extension icon
    ↓
POPUP APPEARS: "Click to Record" button + status indicator
    ↓
User clicks → Microphone activates (permission prompt on first use)
    ↓
User speaks naturally (e.g., "Hey, thanks for reaching out. I'd love to chat tomorrow.")
    ↓
[BEHIND THE SCENES]
  → Whisper.cpp transcribes locally to text
  → WebLLM rewrites/formats the text
  → Text is ready
    ↓
POPUP SHOWS: "Ready to insert" + preview of formatted text
    ↓
User clicks "Insert" button
    ↓
Extension's CONTENT SCRIPT injects text into the active text field
    (If the field doesn't accept JS injection, "Copy to Clipboard" appears as fallback)
    ↓
User can edit, send, or discard
```

### 4.2 Recording Process

1. **User clicks "Record"**
   - Popup shows **live waveform visualization** (animated bars)
   - Mic indicator shows **RMS (volume level)** to confirm audio is being captured
   - "Stop" button is shown

2. **User speaks**
   - Real-time audio buffering in the service worker
   - No feedback latency (UI is instant)

3. **User clicks "Stop"**
   - Audio blob is collected
   - Popup shows: **"Transcribing..."** (spinner)
   - Whisper.cpp (WASM) processes the audio (~5–15 seconds depending on length)
   - Popup shows: **Transcribed text (read-only preview)**

4. **Rewriting**
   - Popup shows: **"Formatting..."** (spinner)
   - WebLLM processes the transcribed text through a small LLM (~Phi-3.5-mini or Mistral-7B)
   - Popup shows: **Final formatted text** with a "Copy" + "Insert" buttons

5. **Insertion**
   - User clicks **"Insert"**
   - Content script finds the active text field (e.g., Gmail compose box)
   - Text is pasted (simulating Ctrl+V)
   - Popup closes, user is back to Gmail/Slack/etc. with the text ready to send/edit

### 4.3 Fallback Behavior

- **Whisper.cpp unavailable:** Show error; user can copy raw text and paste manually
- **WebLLM unavailable (WebGPU not supported):** Show transcribed text as-is, skip rewrite step
- **Content script injection fails:** Offer "Copy to Clipboard" button
- **Microphone permission denied:** Show "Enable microphone in extension settings"

---

## 5. Technical Architecture

### 5.1 Extension Structure

```
vibe-coding-extension/
├── manifest.json              # Chrome Extension Manifest V3
├── service-worker.js          # Background service worker (handles LLM inference)
├── popup.html                 # UI for recording & preview
├── popup.js                   # Popup logic (recording, display)
├── content.js                 # Content script (DOM injection)
├── styles.css                 # Popup styling
├── assets/
│   ├── icon-16.png
│   ├── icon-48.png
│   ├── icon-128.png
│   └── logo.png
└── lib/
    ├── whisper-worker.js      # Web Worker for Whisper.cpp WASM
    ├── webllm-worker.js       # Web Worker for WebLLM inference
    └── utils.js               # Shared utilities
```

### 5.2 Technology Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Speech-to-Text** | Whisper.cpp (WASM) | Runs offline, no API, ~70MB–140MB models |
| **Text Rewriting** | WebLLM (WebGPU) | In-browser LLM inference, no API keys, WebWorker safe |
| **Extension framework** | Manifest V3 | Modern Chrome standard, service workers, security |
| **UI/UX** | Vanilla JS + CSS | Lightweight, no build step friction during workshop |
| **Storage** | Chrome Storage API + IndexedDB | For model caching, settings |

### 5.3 Service Worker (LLM Hub)

The **service worker** is the "brain" of the extension:

```javascript
// service-worker.js (pseudocode)

import { WebLLMRuntime } from '@mlc-ai/web-llm';
import { loadModel as loadWhisperWasm } from './lib/whisper-worker.js';

const llmRuntime = new WebLLMRuntime();
let selectedModel = 'Phi-3.5-mini'; // Default model

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === 'TRANSCRIBE') {
    // Whisper.cpp transcription
    const audioBlob = message.audioBlob;
    const text = await transcribeWithWhisper(audioBlob);
    sendResponse({ transcribedText: text });
  }
  
  if (message.type === 'REWRITE') {
    // WebLLM rewriting
    const rawText = message.text;
    const formatted = await rewriteWithLLM(rawText, selectedModel);
    sendResponse({ formattedText: formatted });
  }
});

async function transcribeWithWhisper(audioBlob) {
  // Use Whisper.cpp WASM to transcribe locally
  // Returns: { text: "transcribed text" }
}

async function rewriteWithLLM(text, model) {
  // Use WebLLM to rewrite text
  // Prompt: "Clean up this text, fix grammar, make it professional."
  // Returns: { text: "formatted text" }
}
```

### 5.4 Content Script (DOM Injection)

```javascript
// content.js (simplified)

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'INSERT_TEXT') {
    const textToInsert = message.text;
    
    // Find the active text field
    const activeElement = document.activeElement;
    
    if (activeElement instanceof HTMLTextAreaElement || 
        activeElement instanceof HTMLInputElement) {
      // Direct insertion for textarea/input
      activeElement.value += textToInsert;
      activeElement.dispatchEvent(new Event('input', { bubbles: true }));
      sendResponse({ success: true });
    } else if (activeElement.contentEditable === 'true') {
      // For contenteditable divs (Gmail, etc.)
      const selection = window.getSelection();
      const range = selection.getRangeAt(0);
      const textNode = document.createTextNode(textToInsert);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
      sendResponse({ success: true });
    } else {
      // Fallback: couldn't inject
      sendResponse({ success: false, error: 'Cannot inject into this element' });
    }
  }
});
```

### 5.5 Popup UI (Vue-Free, Vanilla JS)

The popup is the "face" of the extension. It handles:
- **Recording state:** "Ready" → "Recording" → "Transcribing" → "Formatting" → "Preview"
- **Live feedback:** Waveform visualization, volume meter
- **Text preview:** Show transcribed + formatted text before insertion
- **Action buttons:** Record, Stop, Insert, Copy, Retry

---

## 6. UI/UX Specification

### 6.1 Screen 1: Idle State (Popup Opens)

```
┌─────────────────────────────────┐
│  🎙️  VibeCoding                 │  ← Icon + Title
├─────────────────────────────────┤
│                                 │
│      [🎙️ CLICK TO RECORD]      │  ← Large button, primary action
│                                 │
├─────────────────────────────────┤
│  Status: Ready                  │  ← Micro status text
│  Model: Phi-3.5-mini (ready)   │  ← Shows if model is loaded
├─────────────────────────────────┤
│  ⚙️ Settings   📋 History       │  ← Secondary actions
└─────────────────────────────────┘
```

**Design notes:**
- Width: 350px, Height: 280px
- Color scheme: Dark mode (to match modern Chrome)
  - Background: `#1e1e1e`
  - Text: `#e0e0e0`
  - Primary button: `#6c5ce7` (purple/vibe color)
  - Accent: `#00b894` (green, for "ready")

### 6.2 Screen 2: Recording State

```
┌─────────────────────────────────┐
│  🎙️ Recording...                │  ← Title changes
├─────────────────────────────────┤
│     ▁▃▅▇▅▃▁ ▁▃▅▇▅▃▁            │  ← Animated waveform
│     (Live audio visualization)  │
├─────────────────────────────────┤
│  Volume: ▰▰▰▰▰▰▰▰▯▯            │  ← RMS level bar
│  Duration: 0:04                 │  ← Elapsed time
├─────────────────────────────────┤
│        [⏹️ STOP RECORDING]      │  ← Red stop button
└─────────────────────────────────┘
```

**Design notes:**
- Waveform: Real-time update from audio buffer (canvas-based or CSS bars)
- Color: Red accents during recording (danger/alert vibe)
- Duration updates every 100ms

### 6.3 Screen 3: Transcribing State

```
┌─────────────────────────────────┐
│  🔄 Transcribing...             │
├─────────────────────────────────┤
│                                 │
│    [⠿⠯⠼⠦⠧⠇⠏]  Processing   │  ← Loading spinner
│                                 │
│  Processing audio with          │
│  Whisper.cpp (local)            │  ← Reassuring message
│                                 │
└─────────────────────────────────┘
```

### 6.4 Screen 4: Formatting State

```
┌─────────────────────────────────┐
│  ✨ Formatting...               │
├─────────────────────────────────┤
│                                 │
│    [⠿⠯⠼⠦⠧⠇⠏]  Rewriting    │  ← Loading spinner
│                                 │
│  Applying AI polish             │
│  (no cloud calls)               │  ← Privacy reassurance
│                                 │
└─────────────────────────────────┘
```

### 6.5 Screen 5: Preview State (The "Magic" Moment)

```
┌─────────────────────────────────┐
│  ✅ Ready to Send!              │
├─────────────────────────────────┤
│  ORIGINAL:                      │
│  "hey thanks for reaching out"  │
│  (transcribed text, smaller)    │
├─────────────────────────────────┤
│  FORMATTED:                     │
│  ────────────────────────────   │
│  Thank you for reaching out.    │
│  I'd be happy to help.          │
│  ────────────────────────────   │
│                                 │
├─────────────────────────────────┤
│  [📋 COPY]  [➡️ INSERT]         │  ← Two action buttons
│  [🔁 RETRY] [🗑️ CLEAR]         │  ← Secondary actions
└─────────────────────────────────┘
```

**Design notes:**
- Show both "ORIGINAL" (to show what was heard) and "FORMATTED" (final output)
- Large, clear text so user can review
- Highlight the transformation ("Magic happened here")
- "INSERT" button is the primary CTA (bright green)

---

## 7. User Experience Flow (Wireframe Sequence)

### Happy Path: Record → Transcribe → Format → Insert

```
User in Gmail
│
├─ Clicks VibeCoding icon
│  └─ Popup opens (Idle state)
│
├─ Clicks "CLICK TO RECORD"
│  └─ Popup shows Recording state (animated waveform)
│
├─ Speaks: "Thanks for the email. Let's chat tomorrow afternoon."
│  └─ Visual feedback: waveform bounces to music
│
├─ Clicks "STOP RECORDING"
│  └─ Popup shows "Transcribing..." spinner (5–10 seconds)
│
├─ Whisper.cpp returns: "thanks for the email let's chat tomorrow afternoon"
│  └─ Popup shows "Formatting..." spinner (2–5 seconds)
│
├─ WebLLM returns: "Thank you for your email. I'd be happy to chat tomorrow afternoon."
│  └─ Popup shows Preview state with original + formatted text
│
├─ User reviews the formatted text and clicks "INSERT"
│  └─ Content script injects text into Gmail compose box
│
├─ Gmail compose box now contains: "Thank you for your email..."
│  └─ User can edit, add more, and send
│
└─ VibeCoding popup closes, user is back to Gmail
```

### Unhappy Path: Device doesn't support WebGPU

```
User clicks Record
│
├─ Whisper.cpp transcribes ✅
│
├─ WebLLM tries to initialize
│  └─ Error: "WebGPU not supported"
│
├─ Popup shows Preview with ONLY transcribed text
│  └─ Message: "Formatting skipped (WebGPU not available)"
│
├─ User can still "INSERT" the raw transcribed text
│  └─ No loss of functionality, graceful degradation
│
└─ User gets a gentle notification to use Chrome on a supported device for full features
```

---

## 8. Data Model & Storage

### Chrome Storage API (Settings)

```json
{
  "settings": {
    "selectedModel": "Phi-3.5-mini",
    "autoInsert": false,
    "language": "en",
    "tone": "professional"
  },
  "history": [
    {
      "id": "rec-001",
      "timestamp": "2026-02-04T10:30:00Z",
      "original": "thanks for reaching out",
      "formatted": "Thank you for reaching out.",
      "duration": 3200
    }
  ],
  "modelStatus": {
    "whisper": { "loaded": true, "size": "71MB" },
    "phi": { "loaded": true, "size": "2.4GB" }
  }
}
```

### IndexedDB (Model Caching)

- **Store name:** `models`
- **Purpose:** Cache downloaded Whisper & LLM model weights (~2–5GB total)
- **TTL:** No automatic expiry; user can clear manually

---

## 9. AI Integration (No API Keys)

### Whisper.cpp WASM

**What it does:** Converts voice audio → text

```
Input:  audio blob (WAV/MP3)
│
├─ WASM runtime initializes
├─ Audio is resampled to 16kHz (if needed)
├─ Spectrogram features are extracted
├─ Model inference (runs on CPU, single-threaded)
│
Output: { text: "transcribed text" }
```

**Model details:**
- **tiny:** 71 MB, ~5–10 sec per 30-sec audio
- **base:** 140 MB, ~3–7 sec per 30-sec audio
- **small:** 466 MB, ~2–4 sec per 30-sec audio (recommended for workshop)

### WebLLM (Text Rewriting)

**What it does:** Formats transcribed text using a local LLM

```
Input:  { text: "thanks for reaching out" }
│
├─ WebLLM runtime initializes (WebGPU or WASM fallback)
├─ Prompt: "Clean up this text for professional communication. 
     Fix grammar, add punctuation, improve clarity. 
     Keep the original meaning."
├─ Token-by-token generation
│
Output: { text: "Thank you for reaching out. I'd be happy to help." }
```

**Model options:**
- **Phi-3.5-mini:** 3.8 GB quantized, ~2–3 sec per rewrite (recommended)
- **SmolLM:** 1–2 GB, ~1–2 sec per rewrite (fastest)
- **Mistral-7B:** 4–5 GB quantized, ~3–5 sec per rewrite (most capable)

**System prompt:**
```
You are a professional writing assistant. 
Your job is to clean up voice transcriptions for professional communication.

Rules:
- Fix grammar and punctuation
- Improve clarity and flow
- Maintain the original meaning
- Keep the tone professional but warm
- Remove filler words (um, uh, like)
- Add proper capitalization

Input (raw): [USER_TEXT]
Output (clean): 
```

---

## 10. Success Metrics (Post-Workshop)

### Product Metrics
- **Time to first insertion:** < 15 seconds (record → format → insert)
- **Error rate:** < 5% (failed injections, transcription errors)
- **Device support:** Works on 85%+ of Chrome users' devices
- **Model load time:** < 30 seconds for first-time users

### Engagement Metrics (if analytics added)
- **Daily active users (DAU):** Target 100 users in week 1
- **Average recordings per session:** 2–3
- **Insertion success rate:** > 90%
- **Retention (30-day):** > 40%

---

## 11. Deployment & Installation (60-Min Workshop)

### For Attendees

1. **Clone / Download Repository**
   ```bash
   git clone <workshop-repo>
   cd vibe-coding-extension
   ```

2. **Install Dependencies** (already bundled for workshop)
   - Whisper.cpp WASM + model files (included in repo)
   - WebLLM + Phi model (pre-downloaded for the workshop, OR users download on first run)

3. **Load Extension in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode" (top-right toggle)
   - Click "Load unpacked"
   - Select the `vibe-coding-extension/` folder
   - Done!

4. **Open Gmail/Slack/Notion**
   - Click the VibeCoding icon
   - Click "Record"
   - Speak
   - Click "Insert"

### For the Workshop (Organizers)

- **Pre-build step:** Clone the repo, run `npm build` to bundle everything
- **QR code:** Share a link to the GitHub repo for attendees to clone
- **Pre-download models (optional):** If internet is slow, bring pre-downloaded model files on a USB stick

---

## 12. Marketing & Pitch

### Event Pitch (Feb 4)

**Slide 1: The Problem**
> "Knowledge workers spend 40% of their day writing emails, Slack messages, and docs. Most of that time is spent fixing grammar, restructuring sentences, and hunting for the right words."

**Slide 2: The Solution**
> "VibeCoding: Speak naturally. AI cleans it up. Insert it directly into any text field."

**Slide 3: The Wow**
> "It runs 100% offline. No API keys. No cloud calls. Your voice never leaves your device."

**Slide 4: The Build**
> "In 60 minutes, we're building this from scratch using local LLMs (Whisper.cpp + WebLLM) and Chrome Extension APIs."

**Slide 5: The Outcome**
> "You walk out with a working extension you can use immediately. Plus, you'll understand how to build offline AI tools."

### Positioning

| Competitor | vs. VibeCoding |
|-----------|----------------|
| **Grammarly** | Grammarly is for *written* text. VibeCoding is for *spoken* ideas → polished text. |
| **Otter.ai** | Otter requires a subscription and sends data to the cloud. VibeCoding is free, offline, local. |
| **OpenAI Whisper (API)** | Whisper API costs money per call. VibeCoding uses Whisper locally for free, forever. |

---

## 13. Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| **WebGPU not supported on attendee's device** | Fall back to WASM (slower, but works). Show warning. |
| **Models take too long to download** | Pre-bundle smaller models in the extension repo. Or download on first use with progress bar. |
| **Content script injection fails** | Offer "Copy to Clipboard" as fallback. User can paste manually. |
| **Whisper.cpp crashes (WASM errors)** | Add try-catch. Show error message. Offer manual text input as fallback. |
| **Demo doesn't work on stage** | Have a pre-recorded demo video as backup. Or use Chrome DevTools to show the code working. |

---

## 14. Development Checklist (60-Min Workshop)

- [ ] **00:00–05:00** - Manifest.json + folder structure setup
- [ ] **05:00–15:00** - Popup HTML/CSS (Idle, Recording, Transcribing, Preview screens)
- [ ] **15:00–25:00** - Whisper.cpp WASM integration (record → transcribe)
- [ ] **25:00–35:00** - WebLLM integration (transcribe → format)
- [ ] **35:00–40:00** - Content script + DOM injection
- [ ] **40:00–45:00** - Error handling & graceful degradation
- [ ] **45:00–50:00** - Testing (Gmail, Slack, Notion, LinkedIn)
- [ ] **50:00–60:00** - Polish + attendee questions

---

## 15. Appendix: Code Stubs & Examples

### A. Manifest.json (Manifest V3)

```json
{
  "manifest_version": 3,
  "name": "VibeCoding - Voice-First Writer",
  "version": "1.0.0",
  "description": "Speak naturally. AI cleans it up. Insert it directly.",
  "permissions": [
    "storage",
    "activeTab",
    "scripting"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "assets/icon-16.png",
      "48": "assets/icon-48.png",
      "128": "assets/icon-128.png"
    }
  },
  "background": {
    "service_worker": "service-worker.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"]
    }
  ]
}
```

### B. Popup.html (UI Structure)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="assets/logo.png" alt="VibeCoding" class="logo">
      <h1>VibeCoding</h1>
    </div>

    <!-- Idle State -->
    <div class="screen idle-screen active">
      <button id="recordBtn" class="btn btn-primary">
        🎙️ CLICK TO RECORD
      </button>
      <p class="status" id="status">Ready</p>
    </div>

    <!-- Recording State -->
    <div class="screen recording-screen">
      <p class="title">🎙️ Recording...</p>
      <canvas id="waveform" class="waveform"></canvas>
      <p class="duration" id="duration">0:00</p>
      <button id="stopBtn" class="btn btn-danger">⏹️ STOP</button>
    </div>

    <!-- Transcribing State -->
    <div class="screen transcribing-screen">
      <p class="title">🔄 Transcribing...</p>
      <div class="spinner"></div>
    </div>

    <!-- Formatting State -->
    <div class="screen formatting-screen">
      <p class="title">✨ Formatting...</p>
      <div class="spinner"></div>
    </div>

    <!-- Preview State -->
    <div class="screen preview-screen">
      <p class="title">✅ Ready to Send!</p>
      <div class="preview">
        <div class="original">
          <label>ORIGINAL:</label>
          <p id="originalText"></p>
        </div>
        <div class="formatted">
          <label>FORMATTED:</label>
          <p id="formattedText"></p>
        </div>
      </div>
      <div class="actions">
        <button id="insertBtn" class="btn btn-success">➡️ INSERT</button>
        <button id="copyBtn" class="btn btn-secondary">📋 COPY</button>
      </div>
    </div>
  </div>

  <script src="popup.js"></script>
</body>
</html>
```

### C. Service Worker (Stub)

```javascript
// service-worker.js

// Initialize WebLLM
const runtime = new WebLLMRuntime();

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === 'TRANSCRIBE') {
    try {
      const audioBlob = message.audioBlob;
      const text = await transcribeWithWhisper(audioBlob);
      sendResponse({ success: true, text });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  }

  if (message.type === 'REWRITE') {
    try {
      const text = message.text;
      const formatted = await rewriteWithLLM(text);
      sendResponse({ success: true, text: formatted });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  }
});

async function transcribeWithWhisper(audioBlob) {
  // Load Whisper.cpp WASM model
  // Transcribe audio
  // Return text
}

async function rewriteWithLLM(text) {
  // Initialize WebLLM (if not already)
  // Run inference with system prompt
  // Return formatted text
}
```

---

## End of PRD

**Next Steps:**
1. Share this PRD with Cursor / Claude to start coding
2. Clone a starter repo with Whisper.cpp + WebLLM already integrated
3. Build the UI in parallel with the backend logic
4. Test on real websites (Gmail, Slack, Notion)
5. Deploy to Chrome Web Store (optional; can stay local for workshop)

**Questions?** Ask in the workshop or in the GitHub issues.
