# Taste Test 🥞

A simple website for running **blind taste tests** with your family or friends — the kind where you
line up a few versions of something (pancakes, chips, olive oil, granola, sodas…), everyone tastes
them without knowing which is which, and then you find out who guessed right and what the group
liked best.

It's built to be easy enough for a little kid or a grandparent to use on a phone or tablet: big
buttons, drag-and-drop, one screen at a time.

## What it does

At a taste test, each person does two things:

1. **Guess which is which.** Each sample is labeled with a letter (A, B, C…). You drag the brand
   names onto the letters you think they belong to.
2. **Rank your favorites.** You drag the samples into order, favorite on top, least favorite on the
   bottom.

When everyone's done, the host reveals the results and the app shows:

- ⭐ **Group favorites** — what the whole group liked best, combined.
- 🏆 **Matching leaderboard** — who correctly identified the most samples (tap a name to see exactly
  what they got right and wrong).
- 📊 **Per-item detail** — how each item did, with the answer key built right in.

No more paper forms, and no adding up scores by hand afterward.

## How you use it (as the host)

1. Open the website and tap **Host controls**, then enter your password.
2. **Create a taste test:** type the event name and each item, and pick the letter you'll write on
   each plate/cup.
3. Label your samples, then share the link (or a QR code) with everyone. People can use their own
   phones, or you can pass around a shared tablet — after each person submits, it resets for the
   next taster.
4. Watch submissions come in live. When everyone's finished, tap **End & Reveal results**.
5. Ready for the next round? Tap **Save & start new session** — the finished one is saved
   automatically (with the date), and you get a fresh setup screen.

You can also tap **Take the taste test myself** to join in, then hop back to hosting — no need to
reload anything.

## How you use it (as a taster)

Open the link, type your name, drag the brands onto the letters, drag the samples into your
favorite order, and hit submit. That's it. Results show up once the host ends the taste test.

## Good to know

- **Nothing you record is ever deleted.** Every finished taste test is saved and kept for later.
- It runs on free tools (a Google Sheet behind the scenes, plus free web hosting), so there's
  nothing to pay for.
- Works on phones, tablets, and computers.

## The nerdy bits

If you want to set it up yourself or understand how it's built, see **[SETUP_GUIDE.md](SETUP_GUIDE.md)**
for step-by-step setup, and **[CLAUDE.md](CLAUDE.md)** for the technical architecture. It's a single
static web page (hosted on Cloudflare Pages) talking to a Google Apps Script backend attached to a
Google Sheet — no servers to run, no build step.
