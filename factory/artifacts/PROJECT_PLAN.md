# PROJECT PLAN

**Status:** Complete
**Last Updated:** 2026-09-12

Seven phases, built in order. Revised after a council review (see `.claude/council-cache/council-1789243485.md`). The changes from the first draft: manual maps come before the AI Navigator, cloud work is cut back to backup and restore, TestFlight and Sign in with Apple move earlier, and every leak and patch is stored as an event. A later review dropped the hull score (the ship's condition is drawn straight from open leaks) and moved the avatar creator to Phase 3. An asset-research pass then moved the ship and avatar to CC0 packs from Phase 1, stylized the ocean to match, and added set-sail, earned cosmetics, haptics and a widget.

**Standing rules for every phase**
- Built test-first. The rules engine is tested like accounting software.
- Accessibility (VoiceOver labels, Dynamic Type, Reduce Motion) is handled as each screen is built, then audited in Phase 7.
- Load time, smoothness and battery are checked on the real iPhone at the end of every phase.
- The AI never writes directly into saved data. It produces drafts that are validated and reviewed.
- The core (goals, maps, tasks, events, crews) stays separate from the pirate skin.

---

## Phase 1: The ship inside the app

**Objective:** Prove the architecture on a real iPhone: the approved three.js ship running inside a SwiftUI app, with native screens on top and the two sides talking.

**Deliverables**
- An iPhone app project, installed on the builder's phone with a free Apple ID.
- The ship scene bundled inside the app, shown full screen, working with no network, with the ship and props from the Kenney or Quaternius pirate kits and the ocean and sky shifted to a stylized toon look that matches them.
- The message contract, written down and versioned: the app sends state (open leaks, ship condition, heading, time of day, islands, crewmate line, avatar options, ship design) and events to play; the scene sends taps. Unknown messages are logged and ignored rather than crashing.
- A native Today dock and HUD drawn by SwiftUI over the scene, using sample data.
- Tapping the barrel opens a native placeholder sheet; turning the wheel switches between two sample goals.
- A debug screen showing bridge messages, frame rate and load time.

**Acceptance criteria**
- From tapping the app icon, the Today dock is visible and tappable within 2 seconds.
- The scene runs without visible stutter, including while turning the wheel.
- The scene renders correctly from a fixed test state, the same way every time.
- If the scene fails to load, the app still works and shows the dock and sheets.
- Changing the sample leak count changes the water on deck and the ship's condition (puddles, listing, sinking).
- The scene stops rendering in the background and resumes cleanly.
- After 10 minutes of on-device use, memory is stable and battery drain is acceptable.

**Risk notes**
- If the scene can't hold smooth motion, cut detail now (shadows, wave density, resolution) before anything depends on it. Include a low-power mode early.
- This phase proves the architecture. It is not the "make the ship beautiful" phase.

**Builder needs:** Xcode (installed), an Apple ID in Xcode, Developer Mode on the iPhone.

---

## Phase 2: The local accountability engine

**Objective:** Make Helm genuinely usable by one person with no internet, and use it daily. This is the phase that proves the product.

**Deliverables**
- On-device storage for goals, maps, islands, tasks with cadences, and an **event log**: every strike, undo, leak, patch, heal, expiry, sinking and raising is stored as an event with its own ID, the local date and the time zone. Open leaks, and so the ship's condition, are calculated from the events.
- The rules engine, fully tested with fixed test fixtures: which tasks are due today, one rollover per local date, weekly quotas (Monday to Sunday), catch-up patches and recovery heals, 14-day expiry, sinking at five leaks and raising.
- The real Ship's Log sheet: a tab per goal, strike and undo until midnight, the leaks section with Patch.
- The real Today dock: tasks left, next task, one-tap strike, "Add photo" for proof tasks.
- Photo proof stored privately on the device, with deletion.
- Haptic taps on strike and patch, and the set-sail moment: when the last daily task is struck the ship visibly sails toward the island, and the island is closer next open.
- Crewmate reaction lines for the five v1 crewmates (a small set each; depth comes later).
- Local reminders with a written policy: which slots exist, which are user-chosen, what happens when the phone is in Focus mode, and whether the Sunday review reminder counts toward the daily limit.
- A quick way to enter the builder's real goals and tasks by hand (proper editing arrives in Phase 3).
- A debug screen: what the app thinks today's date and time zone are, due tasks, raw leak events, the notification schedule, and a data export.

**Acceptance criteria**
- The builder uses Helm daily for at least 7 days with their real goals, with no internet needed.
- A daily task not struck by midnight becomes a leak and water appears on deck; at three leaks the ship lists; at five it sinks and is raised clean.
- A "3 times a week" task only leaks if fewer than 3 are struck by the end of Sunday.
- A catch-up-able leak is patched by doing the missed work; a recovery-type leak is patched by doing the session on a rest day in the same week, and after the week heals after three on-time sessions. Both drain the water.
- Striking from the dock takes one tap, and the goal's crewmate reacts.
- A proof task can't be struck without a photo.
- Striking the last daily task sets the ship sailing; the island is closer the next day.
- The open-leak count can be re-derived from the event log and matches the ship on screen.
- Tests cover midnight, week boundaries, daylight-saving changes and travel between time zones.

**Risk notes**
- Recurrence and rollover rules are where hidden bugs live. Tests come before code.
- Data lives on one phone until Phase 4, so a reinstall loses it. The debug export is the safety net.

**Gate before Phase 3:** the builder has used it for 7 to 14 days and can say whether the ship is changing their behavior.

---

## Phase 3: Maps you build by hand

**Objective:** Build the full treasure map model and screens manually, with no AI, so the data model is proven before the Navigator arrives.

**Deliverables**
- Create and edit a goal, its islands, each island's checkpoint (either kind), and its tasks with cadences and their catch-up-able or recovery-type mark.
- The captain and ship creator: the avatar on the Quaternius modular character parts (swap head, torso and leg pieces; recolor skin, hair, headwear and coat) and the ship (hull color, sail color, flag emblem), names for both, with the result shown at the helm.
- The Charts: chart table (all maps), treasure map (route, islands, you-are-here, the X), island detail.
- The daily log and Today dock run off the real maps.
- Reaching an island: the checkpoint is met, the moment plays, the next island's tasks take over, and the cosmetic unlock is recorded (rendered in Phase 7).
- Up to 5 active maps, each with its goal type and crewmate.

**Acceptance criteria**
- The builder can create a complete map by hand in under 5 minutes and see its tasks in tomorrow's log.
- Editing a map changes tomorrow's tasks, not today's already-struck ones.
- Meeting a checkpoint advances the map and swaps in the next island's tasks.
- The chart table, treasure map and island detail all show the same truth.
- Choices made in the creator appear on the avatar and the ship.

**Risk notes**
- Task identity needs care: an edited recurring task must not orphan its past check-offs or leaks.

---

## Phase 4: Cloud backup, restore and TestFlight

**Objective:** Stop data living on one phone, and get Helm installable the normal way, including on the roommate's phone.

**Deliverables**
- A Supabase project: database, access rules, private photo storage.
- The $99 Apple Developer account, **Sign in with Apple from the start** (no email-code stage, so no account migration later).
- Sync: every change is saved locally first, queued, and sent when online; sending the same event twice has no effect.
- Restore: signing in on a fresh install brings everything back.
- Account deletion and photo deletion, removing data from both the phone and the cloud.
- TestFlight set up, with a build installed on the roommate's phone (used solo at this stage).
- **The phone stays the authority on midnight.** The server stores and reconciles events. The server-side job waits until crews need it (Phase 6).

**Acceptance criteria**
- Signing in on a reinstalled app restores every goal, map, event and leak, and the ship looks the same.
- Striking tasks in airplane mode, then reconnecting, syncs with no duplicate events or leaks.
- One user cannot read another user's data, tested against the database directly.
- Photos can only be opened by their owner.
- Deleting an account removes the data everywhere.
- The roommate can install Helm from a TestFlight link without a cable.

**Risk notes**
- Apple's first TestFlight review for outside testers can take a day or two. Start it early in the phase.
- Supabase's free tier pauses inactive projects; daily use keeps it awake.

**Builder needs:** a Supabase account (free), the $99/year Apple Developer account.

---

## Phase 5: The Navigator

**Objective:** Add the AI that turns a conversation about your life goals into treasure maps, plus the weekly review.

**Deliverables**
- First launch in order: opening shot, Sign in with Apple, the avatar creator built in Phase 3, Navigator conversation, maps handoff with crewmate introductions, notification setup, Helm.
- The Navigator on the server: one question at a time, reality-checks unrealistic goals, returns maps in the fixed format.
- **AI output is always a draft.** Maps are validated against the format and reviewed and edited by the user before anything is saved. A malformed answer is retried, never saved.
- A fallback: if the AI or the server is unavailable, the user can create a starter map by hand (the Phase 3 screens) and carry on.
- The Monday-morning weekly review with up to 3 suggested adjustments, and the route-rebuild offer after a sinking or a bad week.
- Each generated plan is stored with the prompt version that made it; a monthly spend cap is set.

**Acceptance criteria**
- A new user goes from first launch to the Helm with their maps in under 10 minutes.
- Every saved map matches the fixed format; malformed output never reaches saved data.
- Given an unrealistic goal, the Navigator proposes a smaller first island.
- With the AI switched off, onboarding still completes by hand.
- Accepted weekly suggestions update the maps; skipped ones change nothing.
- Average AI cost stays under $1 per user per month.

**Risk notes**
- Prompt quality decides whether maps feel smart or generic. Budget time to test a set of real goals, including the builder's own.

**Builder needs:** an Anthropic API account with a spend cap.

---

## Phase 6: Crews and the Cove

**Objective:** Bring the roommate aboard as an ally, with shared visibility and nudges.

**Deliverables**
- Crews: create, invite by link, join (2 to 8 members, one crew per user).
- The Cove: allies' ships as they designed them, with captain name, condition and today's status, following each goal's sharing setting; a "what my allies can see" preview.
- The Code: propose rules; takes effect only when every member accepts.
- Ringing the bell on an ally's ship (max once per ally per day) and sinking alerts, as push notifications.
- The server-side midnight job, added here so allies see up-to-date status even when a phone is offline, reconciled against the event log so no leak is created twice.
- No ledger and no money handling. The Code names the penalty in words; the crew settles it between themselves.

**Acceptance criteria**
- The builder and the roommate are in one crew and each sees the other's ship and its condition.
- Nothing beyond a member's sharing setting is visible, tested against the database directly.
- A Code change is inactive until every member accepts.
- A sinking notifies the crew; a bell nudge arrives on the ally's phone.
- The server job and the phone never produce duplicate leaks for the same day.

**Risk notes**
- Social pressure mechanics can sting. Start gentler than feels right, then tighten.
- This is the second place where two systems can both decide midnight. The event log settles it.

---

## Phase 7: Polish and demo-ready

**Objective:** Make v1 feel finished for daily use and for a 2-minute portfolio walkthrough.

**Deliverables**
- Moments polished: island reached, sinking and raising, Saturday patch-up, all-done.
- Captain's quarters: avatar and names, notification times, sharing per goal, crew membership, sign out, delete account.
- An accessibility audit across every screen and scene object.
- Performance and battery pass, including low-power behavior.
- Visual polish; free model packs swapped in where they clearly help.
- Earned ship parts: figureheads, lantern styles and extra sails unlocked by reaching islands, shown on the ship, to allies in the Cove, and in Captain's quarters.
- A home-screen widget showing the user's own ship in its current condition and daily tasks left, opening Helm to the Today dock. The scene renders a still image per condition state for the widget to use.
- A demo script and a short screen recording for the portfolio.

**Acceptance criteria**
- Every v1 screen can be shown in a 2-minute walkthrough with no placeholders or dead ends.
- With VoiceOver on, a user can strike a task, open the log, turn to another goal and open the Cove.
- With Reduce Motion on, nothing flies or swoops.
- Load-time and smoothness targets from Phase 1 still hold with real data.
- The widget shows the current condition and count, and updates after a strike.

---

## After v1 (not in this plan)
- The Mac app from the same SwiftUI codebase.
- More crewmates and goal types (Oakes, Silas, June).
- Live Activities and Apple Watch.
- Tuning leak thresholds (five to sink, 14-day expiry, three sessions to heal) after two weeks of real use.
- A debt ledger, only if real crew use shows it is wanted. Money would still never move through the app.
