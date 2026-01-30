# systemPatterns

Purpose: record architectural and code-pattern decisions (the repo's "DNA").

Examples (edit to match project):
- All UI components are functional React (or vanilla JS for extension UI).
- Prefer a single `background` service worker for long-running tasks.
- Use a shared `useFetch`/`apiClient` abstraction for remote calls.

When to update: whenever a new pattern is introduced or an existing one changes.
