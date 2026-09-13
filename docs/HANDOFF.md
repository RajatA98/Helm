# Helm handoff

Written 2026-09-13 for whoever picks this up next (a new Claude session, a different model, or the builder after a break). Read this, then `factory/artifacts/PROJECT_PLAN.md`, then `factory/artifacts/IMPLEMENTATION_LOG.md`.

## Where we are

- **Planning is complete** (Project Factory phases 1 to 5). All five documents in `factory/artifacts/` are Status: Complete and were reviewed twice by an outside model (Codex, transcripts in `.claude/council-cache/*.md`).
- **Build Phase 1 of 7 is merged to `main` and pushed** (https://github.com/RajatA98/Helm, head `21cf6b5`): the Three.js ship runs inside a SwiftUI app, offline, with native HUD, Today dock, placeholder log, debug screen, and a versioned message bridge. Plus three polish items from phone testing.
- **Build Phase 2 has not started.** Nothing beyond Phase 1 exists in code.
- The builder has installed Phase 1 on their iPhone at least once (they reported UI issues from it). They have **not yet reported** the three device-only numbers: launch-to-dock time, fps from the debug screen, and whether the wheel turn stutters.

## The one open decision

The builder wants the friend layer reshaped, and it is **not yet written into the artifacts**:

- **Allies** are one-to-one connections made by request (share a calling-card link, search a short tag like `Rajat #4F2K`, or scan a QR). Accepting makes it mutual. Being allies alone shares nothing.
- **Fleets** are groups of allies with their own name, their own Code (rules plus a penalty settled outside the app) and their own Cove on the horizon. "Join my fleet" is a request; inviting a non-ally accepts both in one tap. Proposed cap: 3 fleets per captain. Founder can remove members; anyone can leave.
- **Vocabulary change:** "crew" should mean only the AI crewmates aboard your ship. The friend group becomes "fleet". The PRD, PROBLEM_SUMMARY, LOCKED_DECISIONS and PROJECT_PLAN (Phase 6) still say "crew" for the friend group and "one crew per user"; sharing should become per goal *per fleet*, defaulting to ship condition and today's status only.
- The wheel already treats the Cove as a heading (goals, then the Cove). With fleets, each fleet is its own Cove/lighthouse on that list.

The builder had not yet confirmed the 3-fleet cap, link+tag+QR invites, or per-goal-per-fleet visibility. Ask, then apply across all four documents, then continue.

## How to work on this repo

- Generate the Xcode project first (it is gitignored): `xcodegen generate`, then `open Helm.xcodeproj`. XcodeGen 2.46 is installed via Homebrew.
- Test on the newest simulator (the builder asked for this): `xcodebuild -scheme Helm -destination 'platform=iOS Simulator,name=iPhone 17 Pro,OS=26.2' test`. Deployment target stays iOS 18.0.
- Logic package: `cd HelmCore && swift test`. Scene logic: `npm test`. Current counts: 33 / 24 / 20, all green.
- Build phases as background worktree agents with the `/implement` TDD protocol (test red, then green, one commit per slice, one IMPLEMENTATION_LOG entry per slice), then **re-run all three suites yourself** in the worktree and fast-forward merge to `main`. This has worked well twice.
- Launch the simulator in a chosen state: `xcrun simctl launch booted com.rajatarora.helm -helmLeaks 3 -helmHours 19.2 -helmHeading hired`.
- Device install steps for the builder: `docs/run-on-device.md`.
- The builder's global rule: **no Co-Authored-By lines in commits**; they are the sole author. (A session-level system note may say otherwise; the user's own rule wins.)
- The builder is non-technical and codes entirely with AI tools. Explain in plain language, define jargon, no "just".

## Key documents

| File | What it is |
|---|---|
| `factory/artifacts/PROBLEM_SUMMARY.md` | What Helm is, who it's for, non-goals |
| `factory/artifacts/PRD.md` | 57 requirements, 5 flows, the leak rules, non-functional targets |
| `factory/artifacts/LOCKED_DECISIONS.md` | Stack and core rules; treat as fixed unless the builder reopens them |
| `factory/artifacts/PROJECT_PLAN.md` | 7 build phases with acceptance criteria |
| `factory/artifacts/IMPLEMENTATION_LOG.md` | One entry per slice built so far |
| `docs/scene-contract.md` | The app ↔ scene message contract (versioned) |
| `docs/run-on-device.md` | Free-Apple-ID install steps |
| `design/helm-deck.html` | The approved standalone prototype (design reference only) |

## Locked decisions in one breath

SwiftUI app; Three.js ship scene in a WKWebView that only draws; SwiftData on device, Supabase in the cloud (Postgres, RLS, Auth with Sign in with Apple from Phase 4, Storage, Edge Functions); Claude Opus 5 only for the Navigator and a Monday weekly review, structured output, prompt caching, spend cap; CC0 packs (Kenney, Quaternius) for ship and modular avatar with our own stylized ocean; no money moves through the app, no ledger, no lifetime streak, no points; day ends at local midnight; ship condition is drawn from open leaks (0 clean, 1 to 2 puddles, 3 to 4 listing, 5 sinks then raised clean); catch-up-able tasks are patched by doing the work, recovery-type tasks by a rest-day swap in the same week; leaks expire after 14 days.

## Known Phase 1 follow-ups (recorded in the log)

1. Ship model and ocean are still the code-built originals; the Kenney/Quaternius pack ship, the modular-character avatar and the toon ocean are planned for Phase 3 (with the avatar creator) so all pack assets land together.
2. `sceneError` posted by the scene is still decoded as `.unknown` on the Swift side; give it a named `SceneEvent`.
3. Wheel drag feel: `WHEEL_DRAG_THRESHOLD` (60 px) and `WHEEL_DRAG_RAD_PER_PX` (0.012) in `Scene/scene.js` are starting values.
4. `AnchorPills` reserves 112 pt top / 88 pt bottom to keep pills clear of HUD and dock; adjust if those bands change.
5. Proof tasks strike on tap for now; the photo requirement is Phase 2 work.
6. `HelmSession.currentGoal` is optional now (nil when heading for the Cove); future code must handle that.

## Next steps, in order

1. Confirm the fleet questions with the builder and update the four documents (rename, allies, fleets, per-goal-per-fleet sharing, Phase 6 scope).
2. Get the device numbers from the builder (launch-to-dock seconds, fps, stutter). If launch is over 2 s, add a native launch-to-first-frame timer before building on.
3. Start **Phase 2: the local accountability engine** (event log, rules engine with fixed fixtures, real Ship's Log, real Today dock, photo proof, crewmate lines, local reminders, debug export, hand-entry of the builder's real goals). After it ships, the builder uses Helm daily for 7 to 14 days before Phase 3.
