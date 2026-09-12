# PRESEARCH

**Status:** Complete
**Last Updated:** 2026-09-11

## Context from the conversation
- Builder codes with AI tools (Claude Code, Cursor, Codex) doing the heavy lifting.
- iPhone first; a synced Mac app wanted soon after ("Apple ecosystem").
- Users: the builder and their roommate first, then a wider friend group via TestFlight.
- "No need to go super all out": pick pragmatic, portfolio-quality options.
- The three.js ship prototype (design/helm-deck.html) is approved and should be kept.

## What Helm needs technically
| Feature | Technical need |
|---|---|
| iPhone app, Mac app later | An Apple app framework, ideally one codebase for both |
| Live 3D ship scene | A 3D renderer that runs smoothly and saves battery |
| Ship, avatar, props | 3D assets |
| Sign in | Authentication |
| Maps, tasks, leaks on every device | Cloud database with sync, offline-capable |
| Navigator and weekly review | Server-side LLM calls, low cost |
| Crews, the Cove, the Code | Shared data across accounts with permissions |
| Photo proof | Private file storage |
| Crew call-outs, bells, sinking alerts | Local and remote push notifications |
| Leaks at midnight | A scheduled job |
| Getting it onto phones | TestFlight, later the App Store |

## Distribution
- Free Apple ID + Xcode can install on the builder's own phone by cable or Wi-Fi, but apps expire every 7 days and remote push, Sign in with Apple and iCloud are unavailable. No Bluetooth or AirDrop installs.
- Expo Go avoids an account but can't run custom Swift, so it only suits early React Native work.
- **Chosen path:** build free on the builder's phone; buy the $99/year Apple Developer account before the roommate and friends join (TestFlight with a public link, push, Sign in with Apple, App Store later).

## Dimension 1: App framework
- **A. Pure native (Swift + SwiftUI + RealityKit).** Best performance and Apple integration; the 3D scene must be rebuilt (SceneKit deprecated in 2025; RealityKit shaders have few examples; AI tools least reliable there). Complexity: High.
- **B. React Native + Expo + three.js (expo-gl).** TypeScript is AI's strongest language; partial prototype reuse; expo-gl is slower and has incomplete WebGL2; weak Mac story; Expo Go can't run custom Swift. Complexity: Medium.
- **C. Hybrid: SwiftUI app + the three.js scene in a WKWebView.** Keeps the prototype nearly as-is; native Today dock and sheets appear instantly while 3D loads; real Mac app via SwiftUI; the scene is a pure view driven by messages and can be swapped for RealityKit later. Costs: two runtimes and a bridge to keep tidy. Complexity: Medium.
- **Council (Codex, gpt-5.5):** independently chose C; flagged WKWebView performance, bridge discipline, two lifecycles, Mac tuning, and that a RealityKit migration is possible but not automatic.
- **Chosen: C.**

## Dimension 2: Backend and data
- **Supabase** (Postgres, Row Level Security, Auth incl. Sign in with Apple, Storage, Edge Functions, Cron). Fits crews, photos, the midnight job and server-side AI; explicit SQL is easy for AI tools.
- **CloudKit** (Apple iCloud). Great for private Apple-only sync; awkward for cross-account crews, scheduled jobs and server-side AI.
- **Firebase.** Strong offline sync, push and scheduled functions; crew rules and history fit relational Postgres better.
- **Council:** Supabase + SwiftData local cache with a simple outbox for offline check-offs, idempotent by UUID.
- **Chosen: Supabase in the cloud, SwiftData on the device.**

## Dimension 3: AI model
- **Claude Opus 5** ($5 / $25 per million input/output tokens): best judgment for reality-checking goals and planning around constraints. Estimated about $0.50 per user once for onboarding and about $0.45 per user per month for weekly reviews with prompt caching.
- **Claude Sonnet 5** ($2 / $10): about 40% of the cost, somewhat more generic plans.
- **Claude Haiku 4.5** ($1 / $5): cheapest, weaker planning.
- The council assumed OpenAI; keeping to one provider, Claude fits well (structured outputs guarantee the map format).
- **Chosen: Claude Opus 5**, called only from a Supabase Edge Function, with structured outputs and prompt caching. Needs an Anthropic API account (separate from any Claude subscription) when the Navigator is built.

## Dimension 4: 3D art
- A. Code-built and polished ($0, fast, consistent, limited character detail).
- B. Free and paid model packs such as Sketchfab, Quaternius or Kenney ($0 to about $100; style clashes possible).
- C. Commissioned artist ($500 to $3,000+, weeks).
- **Chosen (revised after asset research): B for the ship, props and avatar, using CC0 glTF packs from Kenney and Quaternius, with our own stylized ocean and sky shaders. A only for anything the packs lack.**

## Architecture
- SwiftUI app owns all data and logic; SwiftData stores it on the device for instant launch and offline use; changes sync to Supabase through an outbox of events, each with a unique ID so repeats are harmless.
- The WKWebView scene only draws: the app sends it state (open leaks, heading, time, islands, avatar); it sends back events (wheel turned, barrel tapped). The message list is small and versioned.
- Supabase holds shared data; Row Level Security enforces what each ally can see.
- Server-only work: the midnight leak job (per time zone), Navigator calls to Claude, and remote push through Apple's service.
- Crewmate reminders are scheduled on the phone (local notifications); ally bells and sinking alerts are remote pushes.
- Core (goals, tasks, leaks, crews) stays separate from the pirate skin.

## Risks and mitigations
1. WKWebView 3D smoothness and battery: prove it on the builder's iPhone in the first build phase.
2. Bridge sprawl between app and scene: a tiny, versioned message contract.
3. Midnight job and time zones, including daylight-saving changes: per-user local midnight, dedicated tests.
4. Paid Apple account needed for push, Sign in with Apple and TestFlight: buy it at the cloud phase, before any sign-in exists, so accounts never have to be migrated. Phases 1 to 3 run with no account at all, on local data only.
5. AI cost creep: AI only at Navigator moments, cached instructions, a monthly spend cap on the Anthropic account.
