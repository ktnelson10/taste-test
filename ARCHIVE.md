# ARCHIVE.md — work log

A running history of what's been built, why, and what was decided. Newest at the bottom of each
session. Add a new `## Session N` heading for each future session.

---

## Session 1 — initial build → production (single long session)

Goal: replace the paper-and-pencil family taste test with an online tool that's dead simple for
kids-to-grandparents, auto-compiles results, and removes the manual sheet prep.

### Phase 1 — first working version
- Chose the stack: static `index.html` on Cloudflare Pages + Google Apps Script bound to a Google
  Sheet as a free backend + the Sheet for storage.
- Built the participant flow (name → match samples → rank favorites → submit), a host area, and a
  results reveal gated by the host. Backend scored matches and aggregated rankings.
- Verified scoring logic in Node against hand calculations (leaderboard, points, avg rank, match %).

### Phase 2 — usability + results iterations
- Switched samples from "Sample 1/2/3" to **letters A, B, C…** (numbers were confusing next to
  ranking positions).
- Added **per-participant drill-down**: tap a name on the leaderboard to see their guesses
  (guessed vs actual, ✓/✗) and their ranking.
- Prototyped **3 single-screen layouts** (A: cards + sticky dropdown; B: cards + draggable brand
  chips; C: two zones) so both matching and ranking happen on one screen. **User picked Layout B.**
- Stripped A/C. Refined B: **fixed left rail** of position numbers (1..N) that don't move with the
  cards, with FAVORITE/LEAST labels. Fixed the dropped-chip styling so brands fill the box cleanly
  and wrap for long names.
- Reworked the results page: **Group favorites at the top**, then leaderboard, then per-item detail;
  folded the answer key into labels like "Aunt Jemima (Sample B)" and removed the standalone key.

### Phase 3 — robustness: sessions + archiving
- First real test run failed: scores all came back 0. **Root cause:** the answer-key column still
  held numbers while the app used letters. Fixes:
  - **Live re-scoring** in `buildResults_` (recompute against the current key every time).
  - A **Check Setup** validator (later superseded by in-app create validation).
- Added menu-driven "Start New Taste Test" + **History** and **Archive** tabs so every event is
  saved with its date. Confirmed the destructive risk of the old "Clear all" button.

### Phase 4 — fully web-based host flow (no more Sheet editing)
- User request: never edit the Sheet by hand; create sessions on the website; never lose data.
- Chose: **host assigns letters** on the create form; **single persistent admin password** (Script
  Properties, default 1234, changeable in-app); one live session at a time.
- Rebuilt backend with states **idle/open/closed** and actions `createSession`, `newsession`
  (archive+clear+idle), `close`, `reopen`, `setPassword`. Guaranteed archiving with a session-id
  dedupe so nothing is double-saved or lost. Removed the destructive delete path entirely.
- Rebuilt frontend with three page states and a host **Create Session** form (event name, expected,
  item+letter rows with add/remove) plus in-app change-password. Verified validation + archive
  dedupe + syntax in Node.

### Phase 5 — ship it
- Diagnosed a deploy bug: creating a **new** Apps Script deployment (instead of a new version of the
  existing one) produced a different `/exec` URL, so `createSession` hit old code → "Could not create
  the session." Fixed by pasting the new URL into `index.html` and re-deploying correctly.
- **GitHub**: initialized repo, pushed to `https://github.com/ktnelson10/taste-test` (private).
- **Cloudflare**: connected the repo for auto-deploy on push; shut down the old direct-upload page.
- Moved the working copy to `/Users/kylenelson/code/taste-test` (single source of truth) and
  connected it to the session to end the two-copy drift.

### Phase 6 — host UX polish
- Made host navigation seamless: **remembered login** (no password re-entry per switch), a
  **persistent footer toggle** between Host and Taster views, a **"Take the taste test myself"**
  button on the live dashboard, and easy return to revealed results — all without hard refreshes.
  Every switch re-fetches status so the screen matches the true state.

### Phase 7 — documentation
- Added `CLAUDE.md` (architecture/handoff), this `ARCHIVE.md`, a human-friendly `README.md`, and the
  existing `SETUP_GUIDE.md`.

### Phase 8 — performance + flow polish
- Site felt slow to load. Diagnosed it as Apps Script latency (cold start + the script.google.com →
  googleusercontent.com redirect + several per-cell Sheet reads), not Cloudflare. Fixes:
  - `getSetup_` now reads the whole config block in **one** `getValues()` call.
  - The public `config` boot call is **cached in `CacheService` for 8s**, invalidated immediately on
    any session state change (`createSession`/`close`/`reopen`/`newsession`).
  - Friendlier branded loading card.
  - (Not fixed in code: Apps Script cold start. Durable fix = move backend to a Cloudflare Worker +
    KV/D1 if load speed remains a problem.)
- Flow change: removed the "Review your options" page. The tasting screen now **submits directly**.
  The thanks screen adds **"Update my selections"**, which reopens the tasting screen **pre-filled**
  with the taster's prior answers; re-submitting **overwrites** their entry (backend replaces by name).

### Key decisions
- Letters over numbers for samples. Layout B for tasting. One live session + full archive history.
- Host assigns letters; single admin password. No delete path; archive-before-clear always.
- Frontend auto-deploys from GitHub; backend needs a "new version" redeploy only on code changes.

### Known follow-ups / ideas (not yet built)
- Optional: printable QR code page for the live link.
- Optional: per-item vote-distribution chart in results.
- Optional: a simple in-app viewer for past events (currently in the History/Archive tabs).
