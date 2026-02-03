# activeContext

## Current Session
**Goal:** Improve text formatting without LLM overhead — comprehensive basic formatting.

## Current Focus
- MVP transcription flow working end-to-end.
- Text output quality via rule-based formatting (no LLM).

## Recent Changes
- **Enhanced `applyBasicFormatting()` (Phase 3 alternative):**
  - Removes hesitation markers: um, uh, er, ah, hmm, hm
  - Removes discourse fillers: like, you know, I mean, basically, actually, so, anyway
  - Removes repeated words: "the the" → "the"
  - Auto-capitalizes 30+ proper nouns (Gmail, Slack, Notion, days, months)
  - Uppercases 5 known acronyms (AI, API, URL, HTML, CSS)
  - Detects questions via 25 question words (what, how, can, etc.)
  - Handles tag questions (right?, correct?, isn't it?)
  - Normalizes 40+ contractions with case preservation
  - Fixes spacing around punctuation
  - Removes duplicate punctuation marks
- **45 unit tests** covering all formatting edge cases.
- **Synced service-worker.js** with same improved formatting logic.

## Previous Changes (Phase 1-2)
- Fixed service-worker ↔ offscreen communication
- Added transcription progress UI
- Added 5-minute recording limit
- Added worker cleanup after 5-minute idle

## Next Steps
- [ ] Manual E2E test: Load extension in Chrome, record audio, verify transcription.
- [ ] Add model download retry logic (3 attempts with backoff).
- [ ] Privacy audit: Verify no external API calls in Network tab.
- [ ] Consider WebLLM in v2 if users request "professional tone" feature.
