# Taste Test — Setup Guide

An online taste test where people (kids to grandparents) drag-and-drop to guess which
sample is which and rank their favorites. The **host runs everything from the website** —
you never edit a spreadsheet by hand, and every finished event is saved automatically.

Free stack: a Google Sheet (storage) + Google Apps Script (backend) + Cloudflare Pages (the page).

## Key ideas
- **Deploy once.** You only ever redeploy if the `Code.gs` code changes.
- **The host creates each session on the website** (password-protected). No Sheet editing.
- **Nothing is ever deleted.** Finishing a session archives it — with the date — to the History and Archive tabs.
- **One live session at a time.** The link shows the right screen automatically: a "no tasting right now" message when idle, the tasting page when live, and results when finished.

---

## First-time setup (~15 min, done once)

### 1. Sheet + script
1. New Google Sheet at <https://sheets.google.com>.
2. **Extensions ▸ Apps Script**. Delete everything, paste all of **`Code.gs`**, **Save**.
3. Back on the Sheet tab, **reload**. A **Taste Test** menu appears.
4. **Taste Test ▸ First-time setup: Create tabs.** Authorize when asked ("Google hasn't verified this app" is you approving your own script — **Advanced ▸ Go to project ▸ Allow**). This makes the Setup, Submissions, History, and Archive tabs and sets a default host password (**1234**).

### 2. Deploy the web app (one time)
1. Apps Script ▸ **Deploy ▸ New deployment ▸** gear ⚙️ ▸ **Web app**.
2. **Execute as: Me**, **Who has access: Anyone**. **Deploy**, authorize, **copy the `/exec` URL**.

### 3. Connect + host the page
1. The URL is already in `index.html` (`API_URL`). If you get a new one, replace it there.
2. <https://pages.cloudflare.com> ▸ **Create a project ▸ Direct Upload** ▸ name it ▸ **drag `index.html`** ▸ **Deploy**.
3. Share that `*.pages.dev` link (or a QR code) with tasters.

### 4. Set your host password
- Open the link ▸ **Host controls** ▸ enter **1234** ▸ then use **Change host password** to set your own. (Or use **Taste Test ▸ Set / reset Host Password** in the Sheet.)

---

## Running a taste test (all on the website)
1. Open the link ▸ **Host controls** ▸ enter your password.
2. If no session is live you'll see **Create a taste test**: type the event name, expected participants (optional), and each **item + the letter** you'll write on its plate (A, B, C… no gaps). Tap **Start this taste test**.
3. Label your plates/cups to match the letters, and share the link. Each taster: name → drag brands onto samples + rank favorites → submit → "Next taster".
4. Host page shows a live count and who's submitted. When everyone's done, tap **End & Reveal results** — results unlock for everyone (Group Favorites, Matching Leaderboard with tap-to-expand detail, Per-item detail).
5. When ready for the next one, tap **✓ Save & start new session**. This archives the finished event (dated) to History + Archive, then opens a fresh Create form. **Nothing is deleted.**

Tip: if you ever mistype an item/letter, you can fix it and results re-score automatically — no data lost.

---

## Updating the code later (only if I give you a new `Code.gs`)
1. Apps Script ▸ select all ▸ delete ▸ paste new `Code.gs` ▸ **Save**.
2. **Deploy ▸ Manage deployments ▸ ✎ Edit ▸ Version: New version ▸ Deploy** (same URL, no `index.html` change).
3. Reload the Sheet. This is the only time you "redeploy" — never for running events.

---

## The tabs (auto-managed — you don't edit these)
- **Setup** — the current session's config.
- **Submissions** — the current session's live responses.
- **History** — one dated row per finished session: event, participants, top matcher, crowd favorite, full ranking, all scores, answer key, and a full-data JSON column.
- **Archive** — every finished session's raw per-person rows, tagged with event + date.

---

## Troubleshooting
- **"Incorrect password"** → default is `1234` until you change it; or reset via **Taste Test ▸ Set / reset Host Password**.
- **Tasters see "No taste test right now"** → no session is live; the host needs to create one.
- **Submit errors** → deployment's **Who has access = Anyone**, URL ends in `/exec`.
- **Menu missing / old behavior** → re-paste `Code.gs`, Save, redeploy New version, reload the Sheet.

---

## Files
- **`index.html`** — the app you host on Cloudflare Pages (participant + host).
- **`Code.gs`** — paste into Google Apps Script (the backend).
- **`SETUP_GUIDE.md`** — this guide.
