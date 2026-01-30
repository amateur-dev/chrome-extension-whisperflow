# VibeCoding: Development Vibe & Guidelines

> **The philosophy:** Ship fast, keep it simple, prioritize user experience over perfect architecture. Build like you're in a 60-minute workshop where every line counts.

---

## 🎯 Core Principles

### 1. **Local-First, Always**
- No cloud calls. No API keys. No tracking.
- Users' speech stays on their machine.
- If we can run it in the browser via WASM, we do.
- Privacy is a feature, not an afterthought.

### 2. **Friction is the Enemy**
- One click to record.
- One click to insert.
- If something takes 3 steps, ask if it can take 1.
- Don't make users think about how it works—just make it work.

### 3. **Graceful Degradation**
- Browser doesn't support Web Audio API? Fall back gracefully.
- Field doesn't accept JS injection? Offer copy-to-clipboard.
- Model load slow? Show a real progress indicator, not a fake spinner.
- Always have a fallback; never leave the user hanging.

### 4. **Code is Communication**
- Write code for the next person reading it (even if that's you in 3 months).
- Comments explain *why*, not what. (The code already says what.)
- Function names should be clear enough that you don't need a comment explaining them.
- If it's confusing, refactor it—don't just add a comment.

### 5. **Ship > Perfect**
- A feature that ships is better than a feature that's perfect in 2 weeks.
- Technical debt is OK if we know about it and have a plan.
- Users find bugs faster than any test suite.
- Get it in front of people quickly.

---

## 📁 Project Structure & Responsibilities

```
content.js           → DOM manipulation, text field injection
popup.js + popup.html → UI for recording, text preview, insert button
service-worker.js    → Orchestration, file loading, inference calls
manifest.json        → Extension metadata & permissions
styles.css           → Keep it minimal; avoid bloated frameworks
lib/
  whisper-worker.js  → Audio → Speech (local WASM model)
  webllm-worker.js   → Text rewriting (local LLM)
  moonshine-worker.js → Alternative lightweight STT
  utils.js           → Shared helpers (no side effects)
assets/              → Icons, UI images
```

**Key Rule:** Each file has ONE clear purpose. If a file is doing 3 things, split it.

---

## 🎨 Coding Style

### JavaScript/ES6

**Variables:**
```javascript
// ✅ DO: Clear, descriptive names
const transcribedText = audioBuffer.transcribe();
const formattedResponse = llm.rewrite(transcribedText);

// ❌ DON'T: Cryptic abbreviations
const tt = audioBuffer.t();
const fr = llm.rw(tt);
```

**Functions:**
```javascript
// ✅ DO: Verb-first, describe the action
async function captureAudio() { }
function validateTextField(element) { }
function sendToLLMWorker(text) { }

// ❌ DON'T: Passive or unclear
async function audio() { }
function check(e) { }
function process(t) { }
```

**Error Handling:**
```javascript
// ✅ DO: Catch, log, and provide user-facing feedback
try {
  const result = await whisperWorker.transcribe(audioData);
} catch (error) {
  console.error('[Whisper]', error);
  updateUI({ status: 'error', message: 'Transcription failed. Please try again.' });
}

// ❌ DON'T: Silent failures
try {
  const result = await whisperWorker.transcribe(audioData);
} catch { }
```

**Async/Await over Callbacks:**
```javascript
// ✅ DO: Modern async syntax
async function processAudio() {
  const transcription = await transcribe(audio);
  const formatted = await rewrite(transcription);
  return formatted;
}

// ❌ DON'T: Callback hell
transcribe(audio, (transcription) => {
  rewrite(transcription, (formatted) => {
    // ...
  });
});
```

### HTML/CSS

**Keep it lean:**
- Use semantic HTML (`<button>`, `<input>`, not `<div>` for everything).
- CSS should be readable and minimal. No tailwind chains that span 15 classes.
- Avoid inline styles; keep them in `styles.css`.

```html
<!-- ✅ DO -->
<button id="record-btn" class="btn btn-primary">Record</button>
<div id="waveform" class="visualizer"></div>

<!-- ❌ DON'T -->
<div onclick="record()" style="padding: 10px; background: blue; color: white; cursor: pointer;">
  Click me
</div>
```

---

## 🧪 Testing & Quality

### Manual Testing Checklist (Before Any Release)
- [ ] Record audio → Check transcription in console
- [ ] Verify text is injected into Gmail, Slack, Notion
- [ ] Test fallback (copy-to-clipboard) if injection fails
- [ ] Check on different screen sizes (popup shouldn't break on mobile)
- [ ] Permissions: First-time users see the microphone permission prompt
- [ ] Error states: Unplug mic mid-recording → see graceful error message

### No Heavy Testing Framework
We're not building a banking system. Jest/Mocha overhead ≠ value for a 60-min workshop build.
- Use `console.log()` and DevTools for debugging.
- Real users are the best QA team.
- Document bugs in GitHub issues when found.

---

## 🚀 Development Workflow

### Getting Started
1. Clone the repo.
2. In Chrome: `chrome://extensions/` → Enable "Developer Mode" → "Load unpacked" → select this folder.
3. Open a text field (Gmail, Slack, etc.).
4. Click the VibeCoding icon.
5. Check the browser console for logs.

### Making Changes
- Edit `popup.js`, `content.js`, or `service-worker.js` → refresh the extension in DevTools.
- Edit `popup.html` or `styles.css` → refresh the popup window.
- Edit worker files (`whisper-worker.js`, etc.) → hard refresh or reload the service worker.

### Logging
```javascript
// Prefix logs with context for easy filtering
console.log('[Popup]', 'Recording started');
console.error('[ServiceWorker]', 'Model load failed:', error);
console.warn('[ContentScript]', 'Could not inject into field');
```

### Debugging
- Open DevTools on the popup: Right-click extension icon → "Inspect popup".
- View service worker logs: `chrome://extensions/` → find VibeCoding → "Service Worker" link.
- View content script logs: Open DevTools on any web page (F12).

---

## 📝 Commit Messages & PR Guidelines

### Commit Format
```
[Scope] Concise description

Optional: Longer explanation if needed.
- Bullet point for complex changes
- Another detail

Closes #123 (if applicable)
```

Examples:
```
[Audio] Add noise suppression to Whisper transcription
[UI] Fix popup width on mobile devices
[Worker] Increase LLM model timeout to 30s
[Docs] Update setup instructions in README
```

### PR Title Format
- Aim for clarity: "Add tone selector dropdown" not "Update popup.js"
- Reference issues: "#42 Add tone selector"

### PR Description
- What does this do?
- Why was it needed?
- How was it tested?
- Any breaking changes or TODOs?

---

## 🔄 Iteration & Feedback Loops

### When to Refactor
- If a function is >50 lines, it probably does too much.
- If you're explaining logic in comments, refactor the code to be self-explanatory.
- If two pieces of code are nearly identical, extract a helper.

### When to NOT Refactor
- The code works and is understandable.
- You're 2 weeks from a deadline.
- Refactoring introduces new bugs.

### Technical Debt
Document it:
```javascript
// TODO: Replace audioContext with Web Audio Worklet for better performance
// (Deferred: Browser support still limited, revisit in 6 months)
```

---

## 🎯 Performance Mindset

### Key Metrics
1. **Time to First Interaction:** < 500ms (user clicks "Record" → mic is live)
2. **Transcription Latency:** < 3s (user stops speaking → text ready)
3. **LLM Rewrite Time:** < 5s (text sent to LLM → formatted response)
4. **Bundle Size:** Keep extension < 100MB (most of that is the model)

### Do's & Don'ts
- ✅ Load models once, reuse them.
- ✅ Use Web Workers for heavy computation (don't block the UI).
- ✅ Show progress indicators during long operations.
- ❌ Don't load every library under the sun; prefer browser APIs.
- ❌ Don't make synchronous calls to workers; always use async.

---

## 🤝 Collaboration & Communication

### Code Review Expectations
- Reviews are helpful, not judgmental.
- "Why did you choose X over Y?" is a genuine question, not criticism.
- Small PRs are easier to review and merge faster.

### Asking for Help
- Post in Slack or GitHub Discussions with:
  - What you're trying to do
  - What you've already tried
  - Error messages or screenshots
- No such thing as a dumb question in a 60-min build.

### Documentation
- Update docs when you change behavior.
- If a feature is "non-obvious," add a comment.
- README should have a "Getting Started" section.

---

## 🏁 Release Checklist

Before merging to `main` or publishing:
- [ ] Code follows style guide (no random `console.log` statements)
- [ ] Manual testing passes (see Testing section)
- [ ] No console errors or warnings
- [ ] Commit messages are clear
- [ ] README or docs updated if user-facing changes
- [ ] Version bumped in `manifest.json` if releasing
- [ ] CHANGELOG updated

---

## 📚 Further Reading

- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [WebLLM Docs](https://github.com/mlc-ai/web-llm)
- [Whisper.cpp WASM](https://github.com/ggerganov/whisper.cpp)

---

**Last Updated:** January 30, 2026  
**Maintainer:** @amateur-dev
