# VibeCoding: Roadmap & Improvement Ideas

> **Goal:** Track what's working, what's not, and what should come next. This is a living document.

---

## 📊 Current Status

**Latest Release:** v1.0 (MVP)  
**Last Updated:** January 30, 2026  
**Active Development:** Feature requests & performance improvements  

### What Works Well ✅
- Local speech-to-text transcription (Whisper.cpp)
- Local text rewriting (WebLLM)
- One-click insertion into Gmail, Slack, Notion
- No cloud calls, no privacy concerns
- Graceful fallback to clipboard copy

### Known Issues 🐛
- Model loading on first use takes ~20s (user sees blank popup)
- LLM rewrite doesn't preserve links in pasted text
- Microphone permission prompt confuses some users
- No indication of which browser/platform isn't supported
- Mobile: popup UI squishes on small screens

---

## 🚀 v1.1 Planned Features (Next 2-4 weeks)

### High Priority

#### 1. **Tone Selector**
- **What:** Users choose tone before rewriting (Formal / Casual / Creative / Professional)
- **Why:** Different contexts need different voices (boss vs. friend)
- **How:** Add dropdown in popup, pass tone to WebLLM prompt
- **Owner:** [Assign someone]
- **Timeline:** 1 week
- **Status:** 🟡 Planned

#### 2. **Better Loading UX**
- **What:** Show model load progress instead of blank screen
- **Why:** User doesn't know if extension is broken or just slow
- **How:** Track WebLLM + Whisper model download progress, show % completed
- **Owner:** [Assign someone]
- **Timeline:** 3-5 days
- **Status:** 🟡 Planned

#### 3. **Recording History**
- **What:** Store last 5 transcriptions in popup (clickable to re-insert)
- **Why:** Users often want to insert the same phrase multiple times
- **How:** IndexedDB to store { timestamp, original, formatted } 
- **Owner:** [Assign someone]
- **Timeline:** 5 days
- **Status:** 🟡 Planned

### Medium Priority

#### 4. **Keyboard Shortcut (Alt+V)**
- **What:** Press Alt+V to activate recording from anywhere
- **Why:** Faster than clicking the extension icon
- **How:** Add to manifest.json `commands`, wire up in service-worker.js
- **Owner:** [Assign someone]
- **Timeline:** 2 days
- **Status:** 🟡 Planned

#### 5. **Multi-Language Support**
- **What:** Detect or let user choose: English, Spanish, French, Mandarin
- **Why:** International users exist
- **How:** Load language-specific Whisper model, translate LLM prompt
- **Owner:** [Assign someone]
- **Timeline:** 2 weeks (includes testing)
- **Status:** 🔴 Blocked (need Whisper multi-lang model)

#### 6. **Re-record Option**
- **What:** If user isn't happy, click "Re-record" instead of manual delete
- **Why:** Friction reduction
- **How:** Add button in popup after transcription step
- **Owner:** [Assign someone]
- **Timeline:** 1 day
- **Status:** 🟡 Planned

### Low Priority (Nice-to-Have)

#### 7. **Dark Mode**
- **What:** Popup theme follows OS preference
- **Why:** Eye comfort, consistency with other extensions
- **How:** CSS media query `prefers-color-scheme`
- **Owner:** [Assign someone]
- **Timeline:** 2 days
- **Status:** 🟡 Planned

#### 8. **Anonymous Usage Analytics**
- **What:** Track (no PII): how many recordings, avg length, rewrite time
- **Why:** Understand usage patterns, optimize where it matters
- **How:** Store locally, send anonymized to Plausible or similar
- **Owner:** [Assign someone]
- **Timeline:** 1 week
- **Status:** 🟡 Planned

#### 9. **Settings Panel**
- **What:** Page for default tone, language, audio input device
- **Why:** Power users want customization
- **How:** popup.html → new "Settings" tab, store in Chrome storage API
- **Owner:** [Assign someone]
- **Timeline:** 5 days
- **Status:** 🟡 Planned

---

## 🔧 Technical Improvements

### Performance

- [ ] **Lazy-load LLM model** – Only fetch if user clicks "Rewrite" (save initial load time)
  - *Effort:* Medium | *Impact:* High
  - *Owner:* [Assign someone] | *Timeline:* 1 week

- [ ] **Cache models locally** – Use Service Worker cache API
  - *Effort:* Medium | *Impact:* Medium (faster 2nd install)
  - *Owner:* [Assign someone] | *Timeline:* 3 days

- [ ] **Audio compression** – Send compressed audio to Whisper
  - *Effort:* Low | *Impact:* Low (marginal latency gain)
  - *Owner:* [Assign someone] | *Timeline:* 2 days

### Reliability

- [ ] **Offline detection** – Warn user if models aren't cached
  - *Effort:* Low | *Impact:* Medium (better error messages)
  - *Owner:* [Assign someone] | *Timeline:* 2 days

- [ ] **Timeout handling** – If Whisper takes >10s, auto-fail gracefully
  - *Effort:* Low | *Impact:* High (prevents hung UI)
  - *Owner:* [Assign someone] | *Timeline:* 1 day

- [ ] **Test on different browsers** – Edge, Brave, Vivaldi, Firefox
  - *Effort:* Low | *Impact:* High (discover browser bugs early)
  - *Owner:* [Assign someone] | *Timeline:* Ongoing

### Code Quality

- [ ] **Extract worker communication** – Centralize postMessage logic (utils.js)
  - *Effort:* Medium | *Impact:* Low (maintainability)
  - *Owner:* [Assign someone] | *Timeline:* 3 days

- [ ] **Add JSDoc comments** – Document function signatures
  - *Effort:* Low | *Impact:* Medium (easier onboarding)
  - *Owner:* [Assign someone] | *Timeline:* 1 week

- [ ] **TypeScript migration** – Optional long-term (low priority)
  - *Effort:* High | *Impact:* Medium (type safety, IDE support)
  - *Owner:* [Assign someone] | *Timeline:* 2+ weeks

---

## 🎯 Future Versions (v2+)

### v2.0 (Q2 2026)

- **Voice Profiles:** Save custom tone + language combos
- **Editing Tools:** Built-in grammar checker, tone meter
- **Slack/Teams Integration:** Native workflow (not just text field injection)
- **Premium Tier:** Faster inference, priority model updates

### v3.0+ Concepts

- **Real-time transcription:** Live preview of voice-to-text as speaking
- **Document Context:** Load surrounding text from email/Slack to improve rewrites
- **Custom LLM Fine-tuning:** Users train model on their own writing style
- **Mobile App:** Companion app for phones (if demand exists)

---

## 📈 Metrics to Track

### User Experience
- **Time to First Interaction:** Current ~500ms → Target: <300ms
- **Transcription Accuracy:** Measure against manual transcripts (monthly)
- **LLM Rewrite Quality:** A/B test different prompts, user ratings

### Technical
- **Extension Size:** Current ~95MB → Keep under 120MB
- **Memory Usage:** Monitor Chrome task manager during use
- **Model Load Time:** Current ~20s → Target: <10s (v1.1)

### Adoption
- **Weekly Active Users:** (if analytics enabled)
- **Feature Usage:** Which features used most?
- **Error Rate:** % of sessions with failures

---

## 🐛 Known Bugs & TODOs

### Service Worker

```javascript
// TODO: Replace audioContext with Web Audio Worklet
// (Current approach: audio buffer accumulation in chunks)
// Issue: High CPU during recording, especially on older machines
// Fix: Use AudioWorkletProcessor for zero-latency audio processing
// Blocker: Testing on 5+ machines needed before commit
```

### Content Script

```javascript
// BUG: LinkedIn comment fields don't accept injected text
// Root cause: Shadow DOM prevents querySelector traversal
// Workaround: Copy-to-clipboard fallback (currently implemented)
// Fix: Use LinkedIn's native text-editing API (if accessible)
// Owner: @[someone] | Timeline: Investigate this week
```

### LLM Rewrite

```javascript
// TODO: Preserve markdown links in rewritten text
// Current: Links get stripped, user has to re-add manually
// Fix: Parse before sending to LLM, re-inject after rewrite
// Timeline: 2-3 days
```

---

## 💡 Community Feedback & Feature Requests

### From Users
- "Can I use this with Discord?" → Roadmap addition
- "Is there a privacy policy?" → Create one ASAP
- "Model download failed—what do I do?" → Better error messages (v1.1)

### From QA / Beta Testers
- [Add feedback here as it arrives]

---

## 🏆 Success Criteria for v1.1

- [ ] Model load time < 10s (show progress UI)
- [ ] Tone selector working in Gmail, Slack, Notion
- [ ] Recording history persisting across sessions
- [ ] Keyboard shortcut (Alt+V) functional
- [ ] Mobile UI doesn't break on phones
- [ ] Zero net new bugs introduced
- [ ] User feedback collected & prioritized

---

## 📋 How to Contribute

### Want to Pick Up an Issue?
1. Comment on the item above (e.g., "I'll work on Tone Selector")
2. Create a branch: `git checkout -b feature/tone-selector`
3. Make your changes, test manually
4. Create a PR with a description
5. Get reviewed & merged!

### Reporting Bugs
- Open a GitHub issue with:
  - What you were doing
  - What you expected
  - What happened instead
  - Browser + OS (Chrome 123.0 on macOS 14.2)
  - Steps to reproduce

### Suggesting Features
- Open a GitHub Discussion or issue with:
  - The problem it solves
  - How it improves the user experience
  - Any potential challenges

---

## 📞 Contact & Questions

- **Maintainer:** @amateur-dev
- **Discussion:** GitHub Discussions
- **Urgent Issues:** GitHub Issues (label: `critical`)
- **General Chat:** [Slack channel or Discord, if applicable]

---

**Last Updated:** January 30, 2026  
**Next Review:** February 15, 2026
