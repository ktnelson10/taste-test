# CLAUDE.md — Taste Test project handoff

Read this first at the start of any session. It's the architectural state and the
conventions/gotchas needed to work on this project safely.

## What this is
A mobile-first web app for running **blind taste tests**. Participants guess which numbered
sample is which brand (matching) and rank samples favorite → least (ranking). The host runs
everything from the website; results are revealed on the host's cue. Built to be usable by
anyone from young kids to grandparents.

## Architecture (3 pieces, all free)
1. **Frontend — `index.html`** (single static file). Vanilla HTML/CSS/JS + SortableJS (CDN) for
   drag-and-drop. Hosted on **Cloudflare Pages**, which **auto-deploys from GitHub `main`**.
   Contains both the participant flow and the password-gated host area.
2. **Backend — `Code.gs`** (Google Apps Script) bound to a Google Sheet, deployed as a **Web app**.
   Serves JSON and stores data. No server to run. The web-app `/exec` URL is hard-coded into
   `index.html` as `API_URL`.
3. **Storage — the Google Sheet** (in the host's Google account). Tabs, all app-managed:
   - `Setup` — current session config (event name B1, status B2, expected B4, items+letters from row 7).
   - `Submissions` — current session's raw responses.
   - `History` — one dated summary row per finished session.
   - `Archive` — every finished session's raw per-person rows, dated.

## Key URLs / identifiers
- GitHub repo (private): `https://github.com/ktnelson10/taste-test`
- Live site: `https://taste-tester.pages.dev`
- Apps Script web app: `…/macros/s/AKfycbxy3tOME_zpiXAz0Avi9y0ykyM1TnlUTw8QnYF78KTJ-vyJjzICYG3JHbZCjnOSSaFkAA/exec`
  (this exact string is in `index.html` `API_URL`; if the deployment URL changes, update it there)
- Local working folder (source of truth): `/Users/kylenelson/code/taste-test`
- Host password: stored in Apps Script **Script Properties** key `ADMIN_PW`, default `1234`,
  changeable in-app or via the Sheet's **Taste Test ▸ Set / reset Host Password** menu.

## Session lifecycle & states (`Setup!B2`)
`idle → open → closed → (Save & start new) → idle`
- **idle**: no live session. Participants see "no tasting right now"; host sees the Create form.
- **open**: live. Participants taste; host sees the live dashboard.
- **closed**: finished. Results revealed to everyone; host can re-open or Save & start new.

## Data conventions
- Samples are **letters A, B, C…** (not numbers). N items ⇒ letters A..N, no gaps.
- `matches` object = `{ brandName: guessedLetter }`.
- `ranking` array = `[letter, …]` favorite-first.
- **Matching score** = count of brands whose guessed letter equals the correct letter.
- **Group ranking points**: favorite (index 0) gets N points down to 1; higher total = crowd favorite.
  `avgRank` = average position (lower = more liked).
- **Live re-scoring**: `buildResults_` recomputes every score against the CURRENT answer key, so
  fixing a mistyped key corrects results without losing responses.
- **Archiving is safe**: `archiveCurrent_` writes to History+Archive before any clear, and uses a
  Script-Properties session-id (`currentSessionId` vs `lastArchivedId`) so nothing is double-saved
  or lost. There is intentionally **no destructive delete path** in the app.

## HTTP interface (Apps Script)
GET `?action=`: `config` (public), `status&key=` (host; returns `isHost`, `submittedNames`, `eventName`),
`results&key=` (host while open, or anyone once closed).
POST JSON `{action, …}`: `submit` (public), and host-only (require `key===ADMIN_PW`):
`close`, `reopen`, `newsession` (archive+clear+idle), `createSession` (validate+archive+write Setup+open),
`setPassword`. POST uses `text/plain` body to avoid CORS preflight.

## Frontend structure (`index.html`)
- Boot fetches `config`, routes by status. `view` = `'participant' | 'host'`; a persistent footer
  toggle (`goHost`/`goTaster`) switches without refresh; `HOST_KEY` is remembered after unlock.
- Participant: `renderNoSession` / `renderWelcome → renderTake → renderReview → submit → renderThanks`.
- Host: `renderHost` (password) → `routeHost(status)` → `renderCreate` | `renderHostOpen` | `renderHostClosed`.
- Results (`loadAndShowResults`): Group favorites (top), Matching leaderboard (tap a name for
  per-person drill-down via `personDetail`), Per-item detail. Answer key is folded into labels
  like "Bisquick (Sample C)".
- Layout note: the tasting screen is "Layout B" — drag brand chips onto lettered sample cards, and
  drag cards to rank; a fixed left rail shows position numbers (1..N) that don't move.

## Deploy model (important)
- **Frontend**: commit to `main` → Cloudflare auto-deploys. No manual upload.
- **Backend**: editing `Code.gs` requires **Deploy ▸ Manage deployments ▸ Edit (pencil) ▸ Version:
  New version ▸ Deploy** to go live. Do NOT create a "New deployment" — that makes a different
  `/exec` URL and breaks the app (this exact bug happened once). Editing Sheet *data* needs no redeploy.

## Gotchas / lessons
- **Answer key must be letters.** A numeric key scores everything 0. Creation validates this; live
  re-scoring can also recover after a fix.
- **One source of truth**: edit files in `/Users/kylenelson/code/taste-test`. (Earlier there was a
  second copy in a Claude Projects folder — avoid re-introducing drift.)
- **Do NOT run git in the sandbox** on this repo — the mount's permissions leave a stale
  `.git/index.lock`. Make edits, let the user commit/push from their Mac terminal.
- **Verify JS without a browser**: extract the last `<script>` and `node --check`. Scoring/validation
  logic can be unit-simulated in Node (see ARCHIVE.md for examples).

## Docs in this repo
- `README.md` — friendly, non-technical overview.
- `SETUP_GUIDE.md` — full one-time setup + how to run an event.
- `ARCHIVE.md` — chronological log of work done.
- `CLAUDE.md` — this file.
