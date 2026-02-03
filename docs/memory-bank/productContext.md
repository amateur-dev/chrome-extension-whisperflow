# productContext

## Project: VibeCoding
**The "Voice-First Writer" Chrome Extension**

### Mission
Transform how knowledge workers write by combining local speech-to-text with local AI text refinement. Remove the friction of typing and editing.
*Philosophy:* **Speak naturally → AI cleans it up → Insert directly.**

### Core Value Proposition
1. **100% Offline/Private:** No audio or text ever leaves the user's machine. No API keys needed.
2. **Frictionless:** One-click integration into existing workflows (Gmail, Slack, Notion).
3. **Free:** Leverages user's hardware (WASM/WebGL) instead of cloud tokens.

### User Stories (MVP) ✅
- **As a user,** I want to click a mic button in a popup to start recording my thoughts on any tab. ✅
- **As a user,** I want my messy spoken stream-of-consciousness to be transcribed accurately. ✅
- **As a user,** I want an AI to rewrite my transcript into professional grammar/structure automatically. ✅ (via rule-based formatting)
- **As a user,** I want to click "Insert" to paste the final text into my active cursor position (e.g., a reply box). ✅
- **As a user,** I want to save my recent recordings/transcripts in case I close the popup. ✅
- **As a user,** I want a mic button on every input field so I don't have to open the popup. ✅ (NEW)
- **As a user,** I want keyboard shortcuts to start/stop recording without clicking. ✅ (NEW)

### Experience Goals ("Vibes")
- **Fast:** The popup opens instantly.
- **Trustworthy:** Visual indicators that "Nothing is being sent to the cloud."
- **Magical:** The "Rewrite" button turns gibberish into prose.

### Success Criteria / Done State
- [x] User can record 30s of audio without UI freeze.
- [x] Transcription uses local Moonshine model (50MB, faster than Whisper).
- [x] Content Script successfully identifies and injects text into:
    - Standard `<textarea>` ✅
    - `contenteditable` divs (Gmail, Notion) ✅
    - Floating mic buttons on all inputs ✅ (NEW)
- [x] "Copy to Clipboard" fallback works 100% of the time.
- [x] Keyboard shortcuts work globally (`Alt+Shift+R`). ✅ (NEW)

### Source of Truth
- **Primary:** `PRD.md` (root directory) contains the detailed business and functional requirements.

### Vision Reference
See `docs/CORE_IDEA.md` for the overarching system philosophy.
