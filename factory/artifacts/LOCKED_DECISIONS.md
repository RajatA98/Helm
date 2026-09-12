# LOCKED DECISIONS

**Status:** Complete
**Last Updated:** 2026-09-12

These decisions guide the whole build. Changing one requires a deliberate pause and a return to Presearch.

## 1. Product shape
**Decision:** A native iPhone app (iOS 18 and later), with a Mac app built from the same SwiftUI codebase right after the iPhone app is solid.
**Why:** The builder and first users are on iPhone and want the Apple ecosystem; one SwiftUI codebase serves both devices.
**Rejected:** Android and web apps (not needed by the first users; out of scope in the PRD).

## 2. Frontend
**Decision:** SwiftUI for every screen (Today dock, log, maps, Cove, settings, onboarding), with the 3D ship scene written in three.js and run inside a full-screen WKWebView behind the SwiftUI overlays. The scene files ship inside the app and work offline.
- The scene is a pure view: it holds no data and makes no decisions.
- App → scene: one `setState` message carrying open leaks (and the ship condition drawn from them), heading, time of day, islands, crewmate, avatar options and ship design; plus `playEvent` for moments (strike, patch, island reached, sinking).
- Scene → app: events only (wheel turned, barrel tapped, crate tapped, lighthouse tapped, island tapped).
- Every message carries a version number. The contract lives in one documented file.
**Why:** Keeps the approved prototype, makes the Today dock appear instantly while 3D loads (the 2-second requirement), gives a real Mac app, and leaves room to swap the scene for native RealityKit later.
**Rejected:** Pure native with RealityKit (full 3D rebuild, weakest area for AI tools); React Native + Expo (slower 3D, weak Mac story, native add-ons needed anyway).

## 3. Backend
**Decision:** Supabase: Postgres database, Row Level Security, Auth, Storage, Edge Functions (TypeScript) and scheduled Cron jobs.
- Edge Functions: `navigator` (calls Claude), `weekly-review` (calls Claude), `midnight-rollover` (turns missed tasks into leaks), `notify` (remote push through Apple's push service).
- The midnight job arrives in Phase 6, when crews need up-to-date status. Until then the phone is the authority on midnight and the server only stores and reconciles the event log. Once added, it runs every hour for users whose local midnight just passed, keyed so a date never rolls twice.
**Why:** Covers crews across accounts, the Code, private photos, the scheduled job and server-side AI with minimal operations; plain SQL suits AI-assisted development.
**Rejected:** Apple CloudKit (weak for cross-account crews, scheduled jobs and server-side AI); Firebase (crew rules and history fit a relational database better).

## 4. Database
**Decision:** SwiftData on the device as the working copy; Postgres (Supabase) in the cloud as the shared record.
- Offline-first: every change is written locally, shown immediately, and added to an outbox; the outbox syncs when online.
- Every change carries a unique ID, so sending it twice has no effect.
- Row Level Security decides what allies can read, following each goal's sharing setting (default: ship condition and status only).
**Why:** Instant launch and offline check-offs, with a real shared database for friends.
**Rejected:** Cloud-only storage (breaks the 2-second and offline requirements).

## 5. Auth
**Decision:** Supabase Auth with Sign in with Apple, used from the first signed-in build (Phase 4), which is also when the Apple Developer account is bought. Phases 1 to 3 run with no account at all, on local data only.
**Why:** Sign in with Apple is the PRD requirement, and starting with it avoids migrating accounts from a temporary email-code sign-in later.
**Rejected:** Passwords (worse experience, more to secure); a temporary email-code stage (creates an account migration).

## 6. Deployment
**Decision:**
- App: built in Xcode. While building, installed on the builder's iPhone with a free Apple ID. Before the roommate joins, the $99/year Apple Developer account is bought and builds go out through TestFlight (public link for friends). App Store later, optional.
- Backend: Supabase's hosted cloud (free tier to start).
- Source code in a single git repository: the iOS/Mac app, the scene, and the Supabase functions and database migrations.
**Why:** Free until real use starts, then the simplest path to friends' phones.
**Rejected:** Expo Go (can't run custom Swift); self-hosting the backend (needless operations).

## 7. AI and model workflow
**Decision:** Claude Opus 5 (`claude-opus-5`) through the official Anthropic TypeScript SDK, called only from Supabase Edge Functions; the API key never reaches the phone.
- Used only for: the Navigator conversation at first launch, charting a new goal, the Sunday weekly review, and rebuilding a route after a sinking or a bad week.
- Treasure maps come back as structured output that must match a fixed schema (goal, 3 to 6 islands, a checkpoint per island, 2 to 5 tasks with cadences).
- The Navigator's instructions are prompt-cached; a monthly spend cap is set on the Anthropic account.
- Crewmate lines are a written library in the app; no AI.
**Why:** Best judgment at the moments that shape the plan, well under the $1 per user per month target.
**Rejected:** Claude Sonnet 5 / Haiku 4.5 (cheaper, weaker planning; can be revisited if costs matter); OpenAI (keeping to one provider).

## 8. Core logic decisions
- **Day boundary:** midnight in each user's local time zone.
- **Leaks and the ship:** there is no hull score. Each missed due daily task becomes one leak; weekly-quota tasks (weeks Monday to Sunday) create one leak if the count is missed by Sunday's end. The ship's condition is drawn from open leaks: 0 clean, 1 to 2 puddles, 3 to 4 listing, 5 sinking. Catch-up-able tasks are patched by doing the missed work; recovery-type tasks are made up on a rest day in the same week (never two in one day) or, after the week, heal after the next 3 on-time sessions. Leaks expire after 14 days. At 5 open leaks the ship sinks, the crew is notified, and the ship is raised with leaks cleared. Each local date rolls over exactly once. Thresholds live in one settings file for tuning.
- **Daily budget and checkpoints:** the Navigator plans within about 6 tasks a day across all maps. Checkpoints are either "N weeks of showing up" or "I confirm this milestone"; the weekly review runs Monday morning. Recovery-type tasks default to a weekly count rather than fixed days.
- **Notifications:** crewmate reminders are local notifications scheduled on the phone (max 3 per day, only while tasks remain); ally bells (max once per ally per day) and sinking alerts are remote pushes.
- **Crews:** 2 to 8 members; one crew per user in v1; a Code or change takes effect only when every member accepts. No ledger in v1: the Code names the penalty in words and the crew settles it themselves. No money moves through the app.
- **Money:** Helm never processes, holds or transfers money, and keeps no debt ledger in v1. Penalties named in the Code are settled between members outside the app.
- **Photos:** private in Supabase Storage; visible to allies only when the Code requires it for that goal.
- **Goal types and crewmates (v1):** Fitness (Bran), Nutrition (Sol), Career (Kestrel), Learning (Tully), Recovery (Wren). Up to 5 active maps.
- **Art:** CC0 packs from Phase 1: Kenney Pirate Kit and Quaternius Pirate Kit for the ship and props, Quaternius Ultimate Modular Men and Women for the avatar (parts swapped and recolored). Our own stylized toon ocean and sky shaders, so the scene reads as one style. No commissioned art in v1.
- **Progress and rewards:** a complete day sets the ship sailing and the island is visibly closer next open; reaching an island unlocks one ship cosmetic; no points, no currency, no lifetime streak, progress shown per leg. Strikes and patches give a haptic tap.
- **Ship design:** hull color, sail color and flag emblem chosen at first launch; figureheads, lantern styles and extra sails earned by reaching islands. The design is part of the scene state and is shown to allies in the Cove.
- **Widget:** a home-screen widget showing the user's own ship in its current condition plus daily tasks left, in v1 (Phase 7). Widgets can't run WebGL, so the scene renders a still image per condition state (clean, puddles, listing, sinking) for the user's design, and the widget shows the matching one.
- **Separation:** the core (goals, maps, tasks, leaks, crews) knows nothing about ships or pirates; the pirate skin (names, scene, crew lines) sits on top.

## Rationale
The PRD asks for an instant, offline-friendly daily loop wrapped in a memorable 3D world, shared with a small group of friends, on iPhone first with a Mac app next, built by one person with AI tools and little budget. A SwiftUI app keeps the daily loop instant and native; the WKWebView scene keeps the approved ship without a risky rewrite; SwiftData plus Supabase gives offline speed and a real shared backend for crews and the midnight job; Claude Opus 5 is used only where judgment matters and stays within the cost target. Everything starts free, and the only planned spend (the $99 Apple account and a few dollars of AI a month) arrives when real users do.
