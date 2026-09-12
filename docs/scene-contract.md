# Scene contract, version 1

The native app (SwiftUI) and the ship scene (Three.js in a WKWebView) talk through a tiny set of JSON messages. The scene is a pure view: it holds no data and makes no decisions. Every message carries `version`; today that's `1`.

The Swift side of this contract is `HelmCore/Sources/HelmCore/SceneContract.swift`, pinned by `HelmCore/Tests/HelmCoreTests/SceneContractTests.swift`. The JavaScript side is `Scene/scene-logic.js`, pinned by `Scene/scene-logic.test.js`. When you change one, change the other and both tests.

## App → scene

Called as `window.helmScene.setState(json)` with one JSON string. Keys are always sorted, so the same state always produces the same string, and the same render.

```json
{
  "avatar": {
    "coat": "long", "coatColor": "#1b2842",
    "hairColor": "#17110d", "hairStyle": "short",
    "headwear": "bandana", "headwearColor": "#23958a",
    "skinColor": "#b07a55"
  },
  "crewLine": "Legs before sundown, Captain.",
  "crewName": "Bran, master-at-arms",
  "headingGoalID": "fit",
  "islands": [
    { "bearingDeg": 0,  "goalName": "Get Fit",   "id": "fit",   "name": "Heal the Shoulders" },
    { "bearingDeg": 30, "goalName": "Get Hired", "id": "hired", "name": "Ship the Portfolio" }
  ],
  "openLeaks": 2,
  "shipCondition": "puddles",
  "shipDesign": { "flagEmblem": "anchor", "hullColor": "#3a2a1e", "sailColor": "#d9d0bd" },
  "timeOfDay": 14.25,
  "timeOverride": 19.5,
  "version": 1
}
```

| Field | Meaning |
|---|---|
| `openLeaks` | Number of open leaks. The only game state the scene needs. |
| `shipCondition` | Derived from `openLeaks`, sent so the scene never recomputes it: `0` clean, `1` to `2` puddles, `3` to `4` listing, `5` and up sinking. Negative counts read as clean. |
| `headingGoalID` | Which island the ship is steering toward. Must match an `islands[].id`. |
| `timeOfDay` | Local time as hours (`14.25` is 2:15 pm). Drives the sky, light and lanterns. |
| `timeOverride` | Optional. When present, the scene draws this hour instead. Omitted when not set. |
| `islands` | Every goal as an island: id, name of the current island, goal name, and a compass bearing in degrees (0 is straight ahead). |
| `crewName`, `crewLine` | The crewmate on deck and their current line. The scene may show a speech bubble; the app owns the text. |
| `avatar` | Colors as CSS hex, styles as short ids. Applied to the captain at the wheel. |
| `shipDesign` | Hull and sail colors (hex) and a flag emblem id. Applied to the ship's materials. |

Other calls on `window.helmScene`:

- `playEvent(json)` with `{ "version": 1, "type": "strike" | "patch" | "islandReached" | "sinking" }`. Plays a moment. Phase 1 only needs to accept these without error; the animations arrive with later phases.
- `pause()` stops rendering (app went to the background). `resume()` starts it again.

## Scene → app

Posted as `window.webkit.messageHandlers.helm.postMessage(object)`. In a plain browser (no `webkit`), the scene logs the message instead, so the scene still runs standalone for design work.

| `type` | Extra fields | When |
|---|---|---|
| `sceneReady` | | The scene has mounted and rendered its first frame. |
| `sceneStats` | `fps` (number), `loadMs` (number) | About every 2 seconds. `loadMs` is time from script start to first frame. |
| `wheelTurned` | | The user tapped the wheel. The app decides the new heading and sends a new state. |
| `barrelTapped` | | Open the log. |
| `crateTapped` | | Open the charts. |
| `lighthouseTapped` | | Open the Cove. |
| `islandTapped` | `id` (string, required) | The user tapped an island marker. |
| `anchors` | `points` (object): `barrel`, `crate`, `lighthouse`, `wheel`, each `{ x, y, visible }` | Where those objects are on screen, in CSS px from the top-left of the web view (the app lays the web view out 1:1 with its own points, so no conversion). `visible` is false when the object is behind the camera or off screen. Projected from the ship's rest pose, so the points don't jitter with the waves; sent only when they move, at most ten times a second (so at least twice a second during a turn). A point missing `x` or `y` is dropped by the app; a missing `points` reads as an empty set. The app uses them to float the Log, Charts and Cove pills above the objects. |
| `sceneError` | `message` (string) | Something went wrong inside the scene (WebGL unavailable, a bad state payload). Not yet a named event on the Swift side; it arrives as `.unknown(type: "sceneError")` and is logged. Follow-up: add it to `SceneEvent`. |

Rules the app follows:

- An unknown `type` is logged and ignored, never fatal.
- A `version` other than the app's is logged as incompatible; the app keeps running and the debug screen shows it.
- `islandTapped` without an `id`, or any message missing `version` or `type`, is a decoding error and is dropped.

## Changing the contract

1. Add the field or event to both `SceneContract.swift` and `scene-logic.js`.
2. Add a test on each side.
3. If an existing consumer would misread the change, bump `version` on both sides.
