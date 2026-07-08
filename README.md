# Taste Test 🥞

A simple, mobile-friendly web app for running family/group **blind taste tests**. Participants
drag-and-drop to guess which sample is which and rank their favorites; the host runs the whole
thing from the website and reveals results when everyone's done.

Designed to be usable by anyone from kids to grandparents — big touch targets, drag-and-drop,
one thing per screen.

## How it works
- **Frontend** (`index.html`): a single static page hosted free on Cloudflare Pages. Participant
  tasting flow + a password-protected host area (create session, live dashboard, results).
- **Backend** (`Code.gs`): a Google Apps Script bound to a Google Sheet, deployed once as a web
  app. Stores config + responses and serves results. No server to run.
- **Storage** (Google Sheet): `Setup`, `Submissions`, `History`, and `Archive` tabs — all managed
  by the app. The host never edits the Sheet by hand.

## Features
- Host creates each session on the website (event name, items, sample letters) — password gated.
- Drag brands onto lettered samples (A, B, C…) and drag to rank favorite → least.
- Results, revealed on the host's cue: **group favorites**, a **matching leaderboard** with
  per-person drill-down, and **per-item detail** (answer key folded into the labels).
- **Nothing is ever deleted** — finishing a session archives it (with the date) to History + Archive.
- Live re-scoring: fixing a mistyped answer key corrects results without losing responses.

## Setup
See **[SETUP_GUIDE.md](SETUP_GUIDE.md)** for the full one-time setup (Sheet + Apps Script deploy +
Cloudflare Pages) and how to run an event.

## Files
| File | What it is |
|------|------------|
| `index.html` | The web app (host on Cloudflare Pages) |
| `Code.gs` | Google Apps Script backend (paste into the Sheet's Apps Script) |
| `SETUP_GUIDE.md` | Step-by-step setup + usage |

## Tech
Vanilla HTML/CSS/JS, [SortableJS](https://sortablejs.github.io/Sortable/) for drag-and-drop,
Google Apps Script, Cloudflare Pages. No build step, no dependencies to install.
