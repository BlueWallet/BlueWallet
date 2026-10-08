# Native app menus

UIKit renders menus on iPad and Mac Catalyst. Android phones and tablets use native popup menus and a Fabric-hosted Android button beneath the header. Android owns the button's rendering, focus, ripple, accessibility, and click handling. React Native supplies screen actions and current state through one focus-aware registration hook.

Menus group commands under File, Edit, View, Transaction, Recipients, Server, Settings, and Help as appropriate. Named submenus remain nested; related and destructive commands have separate sections. Native menu properties expose checkmarks, mixed states, disabled actions, icons, and subtitles. Android describes mixed states as “partially selected.” Stale or disabled commands cannot dispatch.

Android hides duplicate right-header actions. Close remains visible, appears separately at the bottom of the Android app menu, and supports Command/Ctrl-W and Escape. Android Settings appears only on Wallets List. iPhone headers retain their existing controls.

Open Recent records only approved destinations and scalar navigation identifiers. Protected routes and secret-bearing workflows are excluded, ancestor parameters are discarded, and history clears when the app locks or the menu subscription ends.

Shortcut definitions live in `blue_modules/headerMenuShortcuts.ts`; the Keyboard Shortcuts screen lists their scope. Android uses Ctrl/Alt/Enter for Command/Option/Return and Ctrl-M to open the app menu. Android's system keyboard overlay also lists enabled commands.

## Verification

Run `npm run unit -- --runInBand` and `npm run lint:fix`. Native Android tests cover grouping, Close placement, command state, shortcut dispatch, and button accessibility/interaction:

```sh
cd android
./gradlew :app:connectedDebugAndroidTest \
  -PreactNativeArchitectures=arm64-v8a \
  -Pandroid.testInstrumentationRunnerArguments.class=io.bluewallet.bluewallet.NativeHeaderMenuTest
```

Use an isolated emulator/simulator with test wallets for UI checks. Verify Add/Import Wallet, scanner import/photo commands, Send recipient and transaction groups, balance-unit checkmarks, disabled commands, Close, and Open Recent/Clear Menu. Navigate with touch, keyboard, and D-pad; confirm focus returns after dismissal. Check spoken labels and states with VoiceOver/TalkBack.

For the Apple UI audit, set `TEST_RUNNER_HEADER_MENU_UI_AUDIT=1` and run the `BlueWalletUITests/testNativeMenuKeyboardAndAccessibility` test in Xcode on a fresh iPad simulator. The Detox header suite uses `HEADER_MENU_DEVICE=tablet` or `phone` with `tests/e2e/header-menu.spec.js`.
