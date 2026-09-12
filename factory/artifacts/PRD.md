# PRD

**Status:** Complete
**Last Updated:** 2026-09-12

## Overview

Helm is an iPhone app that turns your goals into treasure maps and your maps into daily tasks. Each day you stand at the helm of your own ship in a live 3D scene, strike tasks off your log, and watch your ship sail toward the next island, while a crewmate for each goal keeps you honest and your friends see whether your ship is taking on water. Version 1 is built as a portfolio piece that its creator uses every day, with their roommate and friends joining as allies.

## Goals

1. **Fast setup.** A new user goes from first launch to having their first treasure map and today's tasks in under 10 minutes.
2. **The 10-second day.** From tapping the app icon, a user can strike their next task in under 10 seconds and one tap on the Helm screen.
3. **Daily use by its creator.** The creator opens Helm on at least 25 of their first 30 days of use.
4. **Allies connected.** The creator and their roommate are in the same crew, with an agreed Code, within the first week of use.
5. **Demo-ready.** Every v1 screen can be shown end to end in a 2-minute portfolio walkthrough without placeholder content or dead ends.

## Users

**The Captain (primary).** Someone chasing a few big goals at once (for example: get hired, get fit, heal an injury). Comfortable with a phone, short on structure, motivated by visible progress and by not letting friends down. Uses Helm several times a day in short bursts, often late at night. The first Captain is the app's creator.

**The Ally.** A friend or roommate who is also a Captain with their own goals. Checks the Cove to see how the crew is doing, nudges friends who slip, and agrees to the crew's rules and penalties. First ally: the creator's roommate.

**The portfolio viewer.** A recruiter or hiring manager who sees Helm through a demo video, a TestFlight invite, or a walkthrough. Needs to understand the idea in seconds and see polish everywhere they look.

## Core Flows

### Flow 1: First launch to first map
1. The user opens Helm for the first time and sees a short opening shot of their ship at dawn.
2. The user signs in with Apple.
3. The user creates their captain (skin tone, hair, headwear, coat) and designs their ship (hull color, sail color, flag emblem), then names both.
4. The Navigator greets them and asks what they're sailing for in life.
5. The user describes their goals in their own words (for example: get hired, get fit, found a startup).
6. For each goal, the Navigator asks a few follow-up questions (current state, deadline, constraints such as an injury), and turns anything unrealistic into a realistic first island.
7. The Navigator shows each treasure map: the X, the islands in order, and the daily tasks for the first island. The user can edit, remove or add tasks before accepting.
8. The Navigator hands over the maps; each goal's crewmate comes aboard with a one-line introduction.
9. The user chooses when their crew may call out (notification times) and grants notification permission.
10. The user lands on the Helm, steering toward their first goal, with today's tasks in the Today dock. Allies are invited later, from the Cove.

### Flow 2: A normal day
1. The user opens Helm. The Helm screen shows the sky for their local time, the island they're heading for, the state of the ship, and the Today dock with tasks left and the next task.
2. The user taps the circle on the dock; the task is struck, the goal's crewmate reacts in one line, and the dock moves to the next task.
3. For a task that asks for a photo, the dock shows "Add photo"; the user takes or chooses a photo and the task is struck.
4. To see everything, the user swipes up on the dock or taps the logbook on the barrel; the log opens with a tab per goal.
5. To focus on a different goal, the user turns the wheel; the ship swings toward that goal's island and that goal's crewmate takes the deck.
6. When the last daily task is struck, the ship sets sail toward the island. Tomorrow it will be visibly closer.
7. The user closes the app. Crewmates may call out later at the user's chosen times if tasks remain.

### Flow 3: Missing days and recovering
1. The day ends at midnight, local time. Any task left unstruck becomes a leak.
2. The next time the user opens Helm, water is visible on deck and the goal's crewmate mentions it. More open leaks mean a worse-looking ship.
3. The user patches a leak. For a task you can catch up on (study, chores, applications), that means doing the missed work on top of today's. For a task the body needs recovery from (a workout), there is no doubling up in one day: the missed session is made up on a rest day in the same week, or, once the week has passed, the leak heals after the next three sessions struck on time. Either way the water drains.
4. On Monday morning, after the week's quotas have resolved, the Navigator offers a short weekly review: what went well, what slipped, and suggested adjustments to the maps. The user accepts or skips each suggestion.
5. If five leaks are open at once, the ship sinks: a full-screen moment plays and the crew is told. The ship is then raised with a clean deck and the leaks cleared.

### Flow 4: Sailing with allies
1. The user taps the lighthouse (the Cove) and chooses "Invite an ally", sharing a link.
2. The roommate installs Helm, completes their own first launch, and accepts the invite; both now belong to the same crew.
3. One member proposes the crew's Code (for example: "Sink and you owe the crew $20"; "Workouts need a photo"); every member must accept it before it takes effect.
4. In the Cove, each member sees the allies' ships docked, each showing the ship's condition and today's status (for example "3 of 4 today"), limited to what that ally shares.
5. When an ally is slipping, the user rings the bell to send them a nudge.
6. If a member's ship sinks, the crew is notified. Any penalty the crew agreed on is settled between them, outside the app.

### Flow 5: Reaching an island
1. The user meets an island's checkpoint (for example: completing its tasks for four weeks, or confirming a milestone such as "pain-free overhead press").
2. A full-screen moment plays as the ship reaches the island.
3. The next island's tasks replace the old ones in the daily log, and the treasure map updates.

## Functional Requirements

### Accounts and first launch
1. Users sign in with Apple. No passwords.
2. A new user completes first launch in this order: opening shot, sign-in, create captain, Navigator conversation, maps handoff, notification times, Helm. Allies are invited from the Cove, not during first launch.
3. The captain and ship creator offers at least: 5 skin tones, 5 hair styles, 4 headwear options, 3 coats, and a color choice for headwear and coat; and for the ship, a hull color, a sail color and a flag emblem from a small set. The user names their captain and their ship. More ship parts (figureheads, lantern styles, extra sails) are earned by reaching islands.
4. The user can edit their avatar, ship design, captain name and ship name later from Captain's quarters.
5. A user can delete their account and all their data from Captain's quarters.

### The Navigator and treasure maps
6. The Navigator holds a conversation in plain language, asking one question at a time, to learn the user's goals, current state, deadlines and constraints.
7. When a goal is unrealistic for the stated timeframe, the Navigator says so kindly and proposes a smaller first island instead.
8. For each goal the Navigator produces a treasure map containing: the goal (the X), 3 to 6 islands in order, a checkpoint for each island, and 2 to 5 recurring tasks for the current island. Across all of a user's maps, the Navigator plans within a daily budget of about 6 tasks, so doing something every day stays realistic. A checkpoint is one of two kinds: "N weeks of showing up" (the island's tasks struck at least a set share of the time for N weeks) or "I confirm this milestone" (the user confirms something real, such as a pain-free overhead press). The Navigator picks per island; the user can change it.
9. Every task has a cadence: every day, specific weekdays, or a number of times per week (for example "3 times a week"). Every task is also marked catch-up-able (the missed work can be done later, such as study or chores) or recovery-type (the body needs to recover, such as workouts). The Navigator proposes this; the user can change it. For recovery-type tasks the Navigator defaults to a weekly count rather than fixed days, so a missed session can move to another day without becoming a leak; fixed days remain an option.
10. Before accepting a map, the user can rename, add, remove and change the cadence of tasks, and rename islands.
11. After accepting, the user can edit a map at any time from the Charts without talking to the Navigator.
12. A user can have up to 5 active maps at once.
13. Each map is assigned a goal type, which decides its crewmate. v1 goal types: Fitness, Nutrition, Career, Learning, and Recovery (sleep, rehab, rest).
14. The user can add a new goal later by talking to the Navigator from the Charts.

### The Helm (home)
15. The Helm is a live 3D scene showing the user's avatar steering at the bow, the current goal's island ahead, and the other goals and the Cove as markers.
16. The sky, light and sea follow the user's local time of day (dawn, day, sunset, night).
17. Turning the wheel (tap or drag) switches the current goal; the ship turns toward that goal's island and that goal's crewmate takes the deck.
18. Tapping the logbook opens today's log. Tapping the charts opens the Charts. Tapping the lighthouse opens the Cove. Each object has a text label so it's discoverable.
19. The Helm shows the number of open leaks. The ship itself shows the same thing visually: a clean deck, puddles, listing with water at the rail, or sinking.
20. Tapping the user's avatar opens Captain's quarters (settings).

### Today dock and Ship's Log
21. The Today dock is always visible on the Helm and shows: the number of daily tasks left today (weekly-quota tasks are counted per week, not per day), the next task and its goal, and one action: strike the task, or "Add photo" if the task asks for one. Striking and patching give a short haptic tap.
22. The dock's next task comes from the current goal first, then the other goals. Daily tasks come before weekly-quota tasks; a weekly-quota task shows its count (for example "1 of 3 this week") and is offered once the day's daily tasks are struck.
23. Swiping up on the dock or tapping it opens the full log.
24. The log shows today's tasks with a tab per goal, a count per goal, and the island each goal is heading for.
25. Striking a task can be undone until midnight.
26. A task set to ask for a photo can't be struck until a photo is attached; the user can take one or choose from their library.
27. Photos are private to the user unless the crew's Code requires sharing them for that goal.
28. The log's leaks section lists open leaks with the day they were missed and a Patch action.
29. When all of today's tasks are struck, the dock and log say so plainly.

### Days, leaks and the ship
30. The day ends at midnight in the user's local time zone. Each local date rolls over exactly once; if travel or a clock change makes an already-rolled date reappear, it does not roll again.
31. At the day's end, each unstruck daily task that was due becomes one leak.
32. Weeks run Monday to Sunday. For "times per week" tasks, one leak is created if the weekly count isn't met by the end of Sunday, however far short it fell.
33. There is no hull score. The ship's condition is drawn from the number of open leaks: 0 is a clean deck; 1 to 2 is puddles on deck; 3 to 4 is listing with water at the rail and a worried crewmate; 5 is sinking. A day with every daily task struck earns a crewmate line and sets the ship sailing: it visibly moves toward the island, and the next time the user opens Helm the island is closer. There are no points and no currency.
34. Patching depends on the task. A catch-up-able leak is patched by completing its make-up task, meaning the missed work is done in addition to today's. A recovery-type leak is never doubled up on the same day. It is patched by doing that task on a rest day (a day it isn't scheduled) in the same Monday-to-Sunday week, for example missing Tuesday and Thursday and training Saturday and Sunday. If the week ends with the leak still open, it heals once the next three scheduled sessions are struck on time. Either way the water drains with a short animation.
35. A leak still open after 14 days expires quietly, so misses never pile up beyond reach.
36. When five leaks are open at once, the ship sinks: a full-screen moment plays, allies are notified, and the ship is raised with a clean deck and all leaks cleared.

### Crewmates
37. Each goal type has one crewmate with a name, a look and a voice. v1 crewmates: Bran (Fitness), Sol (Nutrition), Kestrel (Career), Tully (Learning), Wren (Recovery).
38. A crewmate joins when the user's first map of that type is accepted, and appears on deck when the ship heads toward one of their goals.
39. Crewmates speak in short lines drawn from a written library for their personality, chosen by situation (tasks left, time of day, task struck, leak patched, all done, sinking). These lines don't use AI.
40. Crewmate notifications are sent only at the user's chosen times, at most 3 per day in total, and only when tasks remain.

### Allies, the Cove and the Code
41. A user can create a crew and invite allies by link. A crew has 2 to 8 members. A user belongs to one crew in v1.
42. The Cove shows each ally's ship with their ship as they designed it, their captain name, the ship's condition and today's status, limited to that ally's sharing settings.
43. For each goal, the user chooses what allies see: nothing, ship condition and status only (default), or tasks and progress.
44. A member can propose a Code: a list of rules (for example photo requirements for a goal type) and the penalty the crew agrees on, written in plain words (for example "$20 when a ship sinks"). A Code takes effect only when every member accepts it. Changes follow the same rule.
45. Helm does not track debts in v1. Penalties named in the Code are settled between members outside the app, and no money moves through Helm.
46. A user can ring the bell on an ally's ship to send that ally a nudge notification, at most once per ally per day.
47. When an ally's ship sinks, the rest of the crew is notified.

### Weekly review
48. Once a week (Monday morning by default, after Sunday's weekly quotas have resolved) the Navigator offers a short review: tasks struck per goal, leaks, and up to 3 suggested adjustments (for example lighter cadence, a swapped task).
49. The user accepts or skips each suggestion; accepted suggestions update the maps.
50. After a sinking or a week with more than half the tasks missed, the Navigator offers to rebuild the route instead.

### Moments
51. Reaching an island plays a full-screen moment, moves the map to the next island and its tasks, and unlocks one ship cosmetic (a sail color, figurehead or lantern style) from a small set. Cosmetics are only ever earned by arriving; there is nothing to buy.
52. Sinking plays a full-screen moment (see requirement 36).
53. On Saturday, if leaks are open, the goal's crewmate announces a patch-up day on the Helm.

### Captain's quarters (settings)
54. Settings include: avatar and names, notification times, sharing per goal, crew membership, sign out, and delete account.

### Devices
55. A user's data belongs to their account and is saved online, so it's there on a new iPhone and on the Mac app later.
56. Striking and patching work without a connection and sync when the phone is back online.
57. A home-screen widget shows the user's own ship, as they designed it, in its current condition, with the number of daily tasks left, and opens Helm to the Today dock. Widgets can't run the 3D scene, so the app renders a still image of the ship for each condition state and the widget shows the matching one.

## Non-Functional Considerations

- **Speed:** from tapping the app icon, the Today dock is usable within 2 seconds on an iPhone 12 or newer, even if the 3D scene is still loading behind it. The 3D scene is fully shown within 4 seconds.
- **Smoothness:** the Helm scene runs without visible stutter on iPhone 12 and newer. It lowers its frame rate when nothing is moving and stops rendering entirely when the app isn't on screen, to protect battery.
- **AI cost:** AI is used only for the Navigator conversation, new maps, the weekly review and route rebuilds. Target: under $1 per active user per month.
- **Privacy:** photos, goals and tasks are private by default. Allies see only what each user shares. No data is sold or shared with third parties. Users can delete everything.
- **Accessibility:** every tappable object in the 3D scene has a text label and works with VoiceOver; the log supports larger text sizes; with Reduce Motion on, the scene holds still and transitions become fades.
- **Reliability:** a struck task is never lost, even if the app closes or the phone goes offline right after.
- **Tone:** copy is encouraging, never shaming. Sinking is rare and dramatic, not a daily punishment. Progress is shown per leg (days at sea toward the current island), never as a lifetime streak.
- **Original work:** all characters, names, art and wording are original; nothing copies One Piece's characters, symbols or signature elements.

## Non-Goals

- No real-money payments, betting, or money held by the app.
- No ledger of who owes whom in v1. The Code names the penalty; the crew settles it themselves. Revisit after real crew use.
- No AI checking of photo proof.
- No daily AI chat; crewmate lines are pre-written.
- No Android app and no web app in v1.
- No Mac app in v1 (it follows right after; see requirement 55).
- No public feed, strangers, or leaderboards; allies are people you invite.
- No copyrighted characters, names or signature elements.
- Additional crewmates (Oakes, Silas, June) and goal types (projects, money, creative practice) wait for a later version.

## Open Questions

1. **Leak thresholds:** five leaks to sink, 14-day expiry and three on-time sessions to heal a recovery-type leak are starting values; tune them after two weeks of real use.
2. **Treasure found:** what happens when a goal's X is reached (a finale moment, a keepsake on deck, a new map offered). Needed by the Phase 3 map model at the latest.
3. **Crewmate names and looks:** Bran, Sol, Kestrel, Tully and Wren are working names; final names and designs to be settled during design.
