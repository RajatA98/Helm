# Running Helm on your iPhone

Phase 1 is verified in the iPhone simulator. Three acceptance criteria can only be checked on a real phone: the Today dock appearing within 2 seconds, smooth motion while turning the wheel, and battery drain after 10 minutes. Here's how to get the app onto your iPhone with a free Apple ID. No paid developer account is needed for this.

## One-time setup

1. **Generate the Xcode project** (it isn't checked in; it's built from `project.yml`):
   ```
   xcodegen generate
   open Helm.xcodeproj
   ```
2. **Sign in to Xcode with your Apple ID.** Xcode menu → Settings → Accounts → the `+` button → Apple ID. Any Apple ID works; it does not have to be a paid developer account.
3. **Pick your team for signing.** In the project navigator click the blue `Helm` project → the `Helm` target → Signing & Capabilities. Under Team choose your name ("Personal Team"). Xcode creates a free signing certificate for you.
4. **Turn on Developer Mode on the iPhone.** Settings → Privacy & Security → Developer Mode → on. The phone restarts and asks you to confirm.
5. **Plug the iPhone into the Mac** with a cable. On the phone, tap Trust when asked. After the first pairing, Xcode can also install over Wi-Fi.

## Installing

1. In Xcode's toolbar, pick your iPhone as the run destination (the device list next to the scheme name).
2. Press the Run button (or `Cmd+R`). Xcode builds the app and installs it.
3. The first launch will be blocked with "Untrusted Developer". On the phone go to Settings → General → VPN & Device Management → your Apple ID → Trust. Then launch Helm again from the home screen.

## Things to know on a free Apple ID

- The install expires after **7 days**. Plug in and press Run again to refresh it.
- You can have at most 3 apps installed this way at once.
- Remote push notifications, Sign in with Apple and iCloud are not available on a free account. Phase 1 doesn't use them.

## What to check for Phase 1

- Force-quit the app, tap its icon, and count: the clock and the Today dock should be visible and tappable within 2 seconds, even if the ship is still loading behind them.
- Tap the wheel a few times. The turn should be smooth, with no visible stutter.
- Leave the app open for 10 minutes and look at Settings → Battery afterward; it should not be a standout.
- Long-press the clock to open the debug screen: the fps reading there should stay in the 50s or above.

If the ship never appears and the calm fallback stays on screen, open the debug screen and read the bridge log; a load error or timeout is recorded there.
