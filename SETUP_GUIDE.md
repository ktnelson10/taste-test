# Taste Test — Setup Guide

An online taste test where people (kids to grandparents) drag-and-drop to guess which
sample is which and rank their favorites. The **host runs everything from the website** —
you never edit a spreadsheet by hand, and every finished event is saved automatically.

Free stack: a Google Sheet (storage) + Google Apps Script (backend) + Cloudflare Pages (the page),
with the page's source living in a GitHub repo so changes deploy automatically.

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

### 3. Connect + host the page (GitHub → Cloudflare auto-deploy)
1. Make sure your `/exec` URL is pasted into `index.html` (`API_URL`).
2. Put the project in a GitHub repo (this one is `github.com/ktnelson10/taste-test`).
3. <https://dash.cloudflare.com> ▸ **Workers & Pages ▸ Create ▸ Pages ▸ Connect to Git** ▸ pick the repo.
   Build settings: **Framework preset: None**, **Build command: (blank)**, **Build output directory: `/`**. **Save and Deploy.**
4. Share the resulting `*.pages.dev` link (or a QR code) with tasters.

From now on, **every `git push` to `main` auto-deploys** the page — no manual uploads.

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

## Making changes later
- **The page (`index.html`, and the docs):** commit and push — Cloudflare auto-deploys.
  ```bash
  cd ~/code/taste-test
  git add -A && git commit -m "what changed" && git push
  ```
- **The backend (`Code.gs`):** paste the new code into Apps Script ▸ **Save**, then
  **Deploy ▸ Manage deployments ▸ ✎ Edit ▸ Version: New version ▸ Deploy** (keeps the same `/exec` URL).
  Do NOT choose "New deployment" — that creates a different URL and breaks the app. Reload the Sheet
  afterward. This redeploy is the only "deploy" step, and it's needed **only** when `Code.gs` changes —
  never for running events.

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
