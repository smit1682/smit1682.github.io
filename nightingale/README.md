# Nightingale

A phone-first mock test app for MSc Nursing entrance preparation. Static site —
no build step, no server of its own, free to host on GitHub Pages.

**Student** signs in, takes a timed paper one question at a time, and gets a full
answer key with explanations the moment they submit.
**Admin** signs in separately to publish new papers and see past scores.

→ **[SETUP.md](SETUP.md)** has the deployment steps. Start there.

## What's in the box

| | |
|---|---|
| Timed papers | countdown in the header, auto-submits at zero |
| One question per screen | large tap targets, question grid to jump around, mark-for-review |
| Progress rail | one tick per question, so what's left reads at a glance |
| Review screen | every question with your answer, the correct answer and the explanation, filterable by wrong / correct / skipped |
| Admin | publish a paper by pasting questions, delete papers, view scores |
| Light and dark | follows the phone's theme, with a manual override |

## Files

```
index.html        every screen
css/styles.css    all styling — design tokens at the top
js/config.js      credentials, Supabase keys        ← the file you edit
js/seed.js        the sample paper
js/api.js         data layer (Supabase, or this device in demo mode)
js/parse.js       turns pasted text into questions
js/app.js         screens, exam engine, review, admin
```

## Running it locally

```bash
cd exam-app
python3 -m http.server 8000
```

Then open <http://localhost:8000>.
