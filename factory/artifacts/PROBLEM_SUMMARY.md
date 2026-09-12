# PROBLEM SUMMARY

**Status:** Complete
**Last Updated:** 2026-09-12

## What we're building
Helm: an iPhone app (with a synced Mac app to follow) that turns long-term goals into daily action, dressed as a nautical adventure. You steer your own ship toward your goals; your crew and your friends keep you sailing.

## Why
- **Portfolio piece first.** A polished, working app with real daily use, built to show product and engineering range in the user's job search.
- **Personal accountability tool.** The user will use Helm daily to stay accountable to their own goals (currently getting hired and getting fit), then share it with their roommate and friends.
- Startup is not the goal. If a startup ever comes from this, it would likely be a non-gamified version of the core (goal plans plus friend-group accountability), so the core should stay separable from the pirate layer.

## The problem it solves
Big goals ("get fit", "get hired") stall because there's no daily structure and no one holding you to it. People re-plan every morning, miss days silently, and lose momentum. Existing apps are either plain checklists, solo and gentle, or money-betting tools with no soul. None combine a clear plan, a world that makes progress feel real, and friends who notice when you slip.

## Core concept
- **Treasure maps are the guide.** Each goal gets a map: the route, milestones (islands) in order, and the daily tasks that carry you from one island to the next. The goal itself is the X. Your daily log is generated from your maps.
- **The Navigator (AI guide).** An original character. At first launch you talk with her about your goals in life; she reality-checks unrealistic ones (a "billion-dollar startup" becomes a first island like "find one problem worth solving"), charts the route with you, and hands you your maps.
- **The Helm is home.** A real-time 3D scene: your custom avatar steering at the bow. Turning the wheel swings the ship toward another goal's island. The sky follows real local time.
- **In-world navigation plus one shortcut.** Logbook on a barrel = today's full log. Charts on a crate = your maps. The Cove lighthouse = your allies. A slim Today dock shows tasks left and your next task with one-tap check-off (the 10-second path).
- **Ship's Log.** Daily tasks grouped by goal. Honor system by default; any task can optionally ask for a photo.
- **Leaks, no score.** Missed tasks spring leaks and the ship shows them: puddles, then listing, then sinking at five. Patch a leak by catching up where that's healthy (study, chores) or, for workouts, by moving the missed session to a rest day that same week, never two in a day. Old leaks expire. Sinking is rare and ceremonial, never a daily failure state. The point is consistency: something every day toward the goal. A complete day sets the ship sailing and the island is closer tomorrow; reaching an island earns a ship cosmetic. Progress is shown per leg, never as a lifetime streak.
- **Crew: one crewmate per goal type.** Each joins when you chart a map of that type, stands on deck when you steer toward that goal, and nudges you in their own voice (pre-written lines, no AI cost). Working names: Bran (workouts), Sol (eating), Tully (reading), Kestrel (job search), Oakes (projects), Wren (sleep, recovery, injuries), Silas (money), June (creative practice). v1 launches with the crewmates for its launch goal types; more are recruited later.
- **Allies: real friends.** Each crew agrees on its own Code (rules and the penalty, e.g. $20 loot when a ship sinks). The Cove shows allies' ships and their condition, plus the Code. Penalties are settled between members; Helm tracks no debts and moves no money.
- **Captain and ship creation** at first launch: your avatar, plus your ship's hull color, sail color and flag. More ship parts are earned by reaching islands. Your ship, as you designed it, is what allies see in the Cove and what the home-screen widget shows.

## Target users
- First: the user and their roommate.
- Next: the user's friend group.
- Audience for the portfolio: recruiters and hiring managers.

## Platform
- iPhone first.
- A Mac app that syncs, Apple-ecosystem style, right after the iPhone app is solid.

## Timeline
- ASAP.

## Constraints
- Solo developer.
- Low AI costs: AI only at transformation moments (charting maps, a weekly review, rebuilding a route after falling off). Daily nudges are pre-written lines.
- High visual bar: clean, sleek, game-quality 3D with a minimal glass interface (prototype: design/helm-deck.html).
- Art: free CC0 packs (Kenney and Quaternius pirate kits, Quaternius modular characters) cover the ship, props and a customizable avatar; the ocean and sky are our own stylized shaders.

## Decisions on the smaller questions (council defaults, changeable)
- **Money:** no money transactions in the app, ever, and no ledger in v1. The Code names the penalty; the crew settles it themselves.
- **Photo proof:** optional per task or per crew; not verified by AI.
- **Ally visibility:** set per goal; defaults to sharing only the ship's condition and status plus the crew's Code.

## Non-goals
- No money transactions of any kind: Helm never processes, holds or transfers money, and keeps no debt ledger in v1.
- No copyrighted characters, names or signature elements (straw hats, wanted posters with bounties, power fruits, lookalikes). Pitch as a nautical adventure goal tracker.
- No daily AI chatter.
- Not built for startup scale or Android in v1.

## Open questions (for later phases)
- What happens when a goal's X is reached (treasure found).
- Final crewmate names and looks.
