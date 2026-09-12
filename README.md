# Helm

Chart your course. Take the helm. Prove it real.

Helm is an iPhone app that turns long-term goals into daily action, dressed as a nautical adventure. Each goal becomes a treasure map: islands are milestones, the X is the goal, and the daily tasks that carry you from island to island are generated from the map. Every day you stand at the helm of your own ship in a live 3D scene, strike tasks off your log, and watch the ship sail toward the next island. Miss tasks and the ship springs leaks. Friends in your crew see how your ship is holding up.

Built as a portfolio piece by one person, and used daily by its builder.

## Status

Planning is complete; implementation has not started. The next step is Phase 1 of the build plan.

| Stage | State |
|---|---|
| Problem summary | Done |
| Requirements (PRD) | Done |
| Technology research | Done |
| Locked decisions | Done |
| Build plan | Done, 7 phases |
| Implementation | Not started |

## What's in this repository

```
factory/artifacts/   Planning documents (read these first)
  PROBLEM_SUMMARY.md   What Helm is, who it's for, what it won't do
  PRD.md               Requirements, user flows, the rules of the game
  PRESEARCH.md         Technology options considered, with reasons
  LOCKED_DECISIONS.md  The stack and core rules the build follows
  PROJECT_PLAN.md      Seven build phases with acceptance criteria
design/              Screen explorations and the approved 3D prototype
  helm-deck.html       The home screen: a live Three.js ship, sky synced
                       to local time, a Today dock for one-tap check-offs
  *.dc.html            Earlier 2D explorations (superseded)
.claude/council-cache/  Independent reviews of the concept and the plan
```

## How it works, in brief

- **The Navigator** (AI) talks with you about your goals at first launch, reality-checks the unrealistic ones, and hands you a treasure map per goal.
- **The Helm** is home: your avatar at the wheel of a ship you designed. Turn the wheel to steer toward a different goal's island.
- **The Ship's Log** holds today's tasks. The Today dock on the home screen lets you strike the next one in a single tap.
- **Leaks.** A missed task is a leak, and the ship shows it: puddles, then listing, then sinking at five. Patch a leak by catching up where that's healthy, or by moving a workout to a rest day. Old leaks expire. There is no score.
- **Crewmates.** One per goal type, each with a voice: Bran the master-at-arms for workouts, Kestrel the lookout for the job search, and so on. Their lines are written, not generated.
- **Allies.** Real friends in a crew with rules they agree on. The Cove shows everyone's ship and how it's doing.

## Stack (locked)

- **App:** SwiftUI for every screen, with the Three.js ship scene running in a WKWebView behind them. The scene only draws; all data and logic stay native. A Mac app from the same codebase follows v1.
- **Data:** SwiftData on the device (instant launch, offline check-offs), synced to Supabase (Postgres, Row Level Security, Auth, Storage, Edge Functions).
- **AI:** Claude Opus 5, called only from server functions for the Navigator conversation and a weekly review. Structured output, prompt caching, a spend cap.
- **Art:** CC0 packs from Kenney and Quaternius for the ship, props and modular avatar; our own stylized ocean and sky shaders.
- **Distribution:** TestFlight, App Store later.

## Viewing the prototype

Open `design/helm-deck.html` in a browser, or serve the folder locally:

```
cd design && python3 -m http.server 8000
```

then visit `http://localhost:8000/helm-deck.html`. Tap the wheel to change course, tap the barrel to open the log, and tap the clock to preview other times of day.

## Original work

All characters, names and art are original. Helm is inspired by the spirit of crew-and-voyage adventure stories, not by any specific one, and uses no copyrighted characters or signature elements.
