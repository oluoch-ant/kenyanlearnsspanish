# Oluoch aprende español — dashboard source

The gamified dashboard, as published at
https://claude.ai/code/artifact/72c2662f-b729-4b0b-bdd9-6182a5297df2

## Run it

Double-click **`dashboard.html`** — it's fully self-contained (React 18, Tailwind,
the Bricolage Grotesque font, and all app code are inlined; no internet needed).
Progress saves to your browser's localStorage under the key `oluochAprende.v1`.

`dashboard-artifact.html` is the same build minus the `<!doctype>`/`<body>` wrapper —
the exact format the claude.ai artifact host expects. Use it only for redeploying
the artifact.

## What's what

| File | Role |
|---|---|
| `src/app.js` | The application: React components (htm templates, no JSX), the XP/streak/freeze/repair engine, all four views, the lesson modal |
| `src/data.js` | Content: Spanish lesson catalog, 50 questions, mock leaderboard rivals, badges |
| `src/base.css` | Custom CSS layered under Tailwind (flame flicker, ring animation, focus states, reduced-motion) |
| `src/tailwind-config.js` | Design tokens: night/panel/ember/coral palette, Bricolage + system font stacks |
| `src/build.sh` | Assembles everything into `dashboard-artifact.html` + `index.html` |
| `src/react.min.js`, `react-dom.min.js` | React 18.3.1 UMD builds (vendored) |
| `src/htm.min.js` | htm 3.1.1 — JSX-like tagged templates without a compiler |
| `src/tailwind-play.js` | Tailwind's in-browser engine (v3.4) |
| `src/bricolage.b64` | Bricolage Grotesque variable font, base64 for the data-URI `@font-face` |

## Rebuild after editing

In Git Bash (or any POSIX shell):

```sh
cd src && sh build.sh app.js
```

Outputs `dashboard-artifact.html` and `index.html` (the standalone version) in `src/`.

## Gamification spec (as implemented)

- `XP = max(1, round(D × decay × streakMult))`, one rounding, committed atomically
  before any celebration animation
- `D` = 10 base + 4/first-attempt-correct + 10 perfect + 5 speed (≤7s avg AND ≥80%)
  + 10 first-of-day
- Decay: lessons 1–3 full, 4th ×0.75, 5th ×0.5, 6th+ ×0.25; same-lesson repeats ×0.5 / ×0.25
- Streak tiers (outermost, after today's increment): ×1.1 / ×1.2 / ×1.3 / ×1.5 at 3/7/14/30 days
- Streak day = 1 completed lesson; goals: 35 XP/day, 210 XP/week; level step = 25×(level+1)
- Freezes: 1 per 7 streak days, hold 2, auto-consume; ≥7-day broken streaks get a
  same-day 3-lesson repair (once per 30 days)

The same engine (adapted to real calendar dates, with lessons generated from live
SRS data) is integrated into `../spanish-teacher.html` — the Home tab.
