# ARCH

High-level architecture & file layout notes.

Suggested sections:
- `src/` — extension sources (popup, background, content scripts)
- `public/` — static assets
- `docs/memory-bank/` — long-term AI context

Data flow summary:
- User -> popup UI -> background worker -> Whisper -> transcript -> storage
