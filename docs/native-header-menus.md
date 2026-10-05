# Native header menus on iPad and Mac Catalyst

iPhone headers keep their existing controls. Android phones and tablets expose commands through the app menu. On tablets and Mac, HeaderMenu registers the focused screen's actions with the system menu. Close remains visible and also supports Command-W and Escape in sheets/modals, including Import and Manage Wallets.

## Menu behavior

- Standard File, Edit, View, and Help menus retain their system commands.
- Transaction, Recipients, Server, and Settings appear in a fixed order after View when applicable.
- Familiar wallet commands stay visible after unlocking and dim when unavailable. Screen commands still honor explicit hidden states.
- Sort criteria and direction, transaction import options, and destructive actions have separate inline sections. Named submenus retain their parent names.
- Checkmarks, mixed states, disabled states, icons, and subtitles use native menu properties. Disabled and stale actions cannot dispatch.
- An ellipsis marks a command that needs further input. Details, Help, Close, and immediate actions have no ellipsis.
- Clipboard shortcuts do not replace the system's text-editing commands.

## Screen shortcuts

| Action | Shortcut |
| --- | --- |
| Add Recipient | Command-Shift-N |
| Insert Contact | Command-Option-N |
| Import Transaction | Command-Shift-I |
| Import Transaction from QR | Command-Option-I |
| Export Transaction | Command-Shift-E |
| Transaction Details | Command-Option-D |
| Coin Control | Command-Option-C |
| Save multisig configuration (Done) | Command-Return |
| Close current sheet/modal | Command-W or Escape |

Definitions live in `blue_modules/headerMenuShortcuts.ts`. The Keyboard Shortcuts screen shows Apple modifier symbols and exposes each row as a single accessibility element with a spoken key combination and its screen context.

## Automated verification

Use a fresh, isolated iPad simulator. Do not run the UI audit against an app containing personal wallets.

```sh
TEST_RUNNER_HEADER_MENU_UI_AUDIT=1 xcodebuild \
  -workspace ios/BlueWallet.xcworkspace -scheme BlueWallet \
  -destination "platform=iOS Simulator,id=$MENU_TEST_SIMULATOR_ID" \
  -parallel-testing-enabled NO \
  -only-testing:BlueWalletUITests/HeaderMenuNativeTests \
  -only-testing:BlueWalletUITests/BlueWalletUITests/testNativeMenuKeyboardAndAccessibility \
  test
```

`HeaderMenuNativeTests` checks native shortcut objects, checked/mixed/destructive/disabled states, Escape registration, and rejection of disabled/stale dispatch. The UI audit checks opening Add/Import Wallet with the keyboard, unavailable commands, visible Close buttons, dismissal, and accessibility descriptions/detection. It additionally checks menu availability on Mac Catalyst.

## On-device acceptance checks

These complement automated accessibility auditing; an audit is not a VoiceOver walkthrough.

1. On iPad and Mac, navigate all menus using only the keyboard. Open Add Wallet and Import, then dismiss with Command-W and Escape. Verify the same Close button still works with touch/pointer.
2. On Send, exercise recipient shortcuts and inspect recipient removal states, transaction import options, loading states, and Coin Control sort checkmarks/direction. Use test wallets only.
3. On Import, toggle Passphrase, Search Accounts, and Clear Clipboard. Verify each checkmark updates, standard text Copy/Paste still works, and Close shortcuts dismiss the sheet.
4. With VoiceOver, confirm menu titles, command names, checkmarks, disabled states, and shortcut help are announced. Open/dismiss sheets and confirm focus returns to a useful control.
5. Verify menu ordering remains predictable when switching screens, while unrelated commands dim or explicitly hidden commands disappear.
6. On phone, verify the original right-header menus and Close buttons remain.

The app and UI test target build successfully. Simulator discovery currently blocks executing the native audit in the development environment; the on-device keyboard/VoiceOver walkthrough remains outstanding.

## Android phones and tablets

Android phones and tablets use a Fabric-hosted Android button beneath the header to open a native popup menu. Android owns its rendering, focus, ripple, accessibility, and click handling. Only the active leaf mounts it, with a 48 dp touch target. Duplicate right-header actions are hidden; Close remains visible and appears separately at the bottom of the app menu. Settings is available only on Wallets List.

The same screen shortcuts use Ctrl instead of Command, Alt instead of Option, and Enter instead of Return. Ctrl-M opens the app menu. Escape dismisses an open menu first, then the current sheet/modal. Android's keyboard shortcut overlay lists enabled screen commands.

Android menus show app commands only where available; screen commands retain their disabled states. They preserve named groups, native checkboxes, section dividers, icons where available, subtitles, and destructive action styling/descriptions. Android menu checkboxes do not support an indeterminate state; mixed selections use a visible and spoken “partially selected” label.

The Android native regression tests run on a fresh tablet emulator:

```sh
cd android
./gradlew :app:connectedDebugAndroidTest \
  -PreactNativeArchitectures=arm64-v8a \
  -Pandroid.testInstrumentationRunnerArguments.class=io.bluewallet.bluewallet.NativeHeaderMenuTest
```

Test menu access by touch and keyboard, Ctrl/Alt shortcuts, Ctrl-W/Escape dismissal, submenu navigation with the D-pad, and focus return. With TalkBack enabled, verify item labels, checked/disabled/mixed states, destructive descriptions, and shortcut help. Use an isolated emulator with test wallets for screen interaction checks.

Open Recent records only explicitly approved destinations and scalar navigation identifiers. It excludes protected routes and secret-bearing workflows, drops all ancestor parameters, and clears history when the app locks or the menu subscription ends.
