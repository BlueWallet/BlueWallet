# patches

Local patches applied to `node_modules` by [`patch-package`](https://github.com/ds300/patch-package)
on `postinstall` (see `package.json` → `scripts.patches`).

When upstream ships an equivalent fix, drop the patch here and bump the dependency.

---

## `react-native-background-fetch+4.4.2.patch`

Uses the package's bundled `TSBackgroundFetch.xcframework`, which includes
Mac Catalyst, instead of the standalone `TSBackgroundFetch` 4.1.x pod, which
only includes iOS device and simulator binaries. Without this patch, Catalyst
builds fail to import `TSBackgroundFetch/TSBackgroundFetch.h`.

Remove when the upstream pod dependency includes a Catalyst slice. When
upgrading, verify the bundled framework still supports all three destinations.

---

## `react-native-notifications+5.2.2.patch`

**What:** rewrites `FcmToken.sendTokenToJS()` (Android) to obtain the
`ReactContext` from `ReactHost` first (bridgeless / New Architecture),
falling back to `ReactInstanceManager` only if that fails — and wraps
both lookups in `try/catch`.

**Why:** under the New Architecture (bridgeless, RN 0.76+) there is no
`ReactInstanceManager`. The stock code calls
`getReactNativeHost().getReactInstanceManager()` first, which throws
`UnsupportedOperationException: ReactInstanceManager.createReactContext
is unsupported` and crashes the app when the FCM push token is
delivered.

**Upstream:** https://github.com/wix/react-native-notifications/issues/1071 (open)

Added in BlueWallet PR https://github.com/BlueWallet/BlueWallet/pull/8424
during a React Native bump. Remove once `react-native-notifications`
ships New-Architecture-safe token delivery.

---

## `react-native-context-menu-view+1.21.0.patch`

**What:** Android-only changes to `ContextMenuView.java`:

- in `dropdownMenuMode`, a single tap opens a `PopupMenu` (new
  `showDropdownMenu()`) instead of the floating `ContextMenu`. The popup is
  anchored to the view rather than to the touch point, the old
  `SDK_INT >= N` guard is gone, icons are shown via `setMenuIconDisplay()`
  plus `setForceShowIcon(true)` on Android Q+, and `onCancel` is still
  emitted on dismiss;
- menu building is shared through a new `populateMenu()`; both it and
  `showDropdownMenu()` return early when `actions` is null;
- actions with a `selected` key are rendered as checkable items
  (`setCheckable` / `setChecked`);
- `onPress` always includes `indexPath` (`[i]` for top-level items,
  `[parentIndex, i]` for submenu items) instead of only for submenus;
- `icon` is read only when the key is present (`action.hasKey("icon")`).
  Defensive only: `getString` already returns null for a missing key and
  `getResourceWithName` tolerates null.

**Why:** the floating `ContextMenu` does not draw checkable/`selected`
items, so toggle entries (e.g. the passphrase switch in the Add Wallet
header menu) showed no state on Android. `components/TooltipMenu.tsx`
resolves the pressed action by `indexPath` (two actions may share the same
title); it already falls back to `[index]` when `indexPath` is missing, so
always sending it only makes Android consistent with iOS and submenus.

**Upstream:** no issue filed yet. The dependency is installed from the
BlueWallet fork (`github:BlueWallet/react-native-context-menu-view`, see
`package.json`), so these changes can be committed to the fork instead —
then drop this patch and bump the pinned commit.

Added in BlueWallet PR https://github.com/BlueWallet/BlueWallet/pull/8867.
When bumping `react-native-context-menu-view`, rename this patch to the new
version and re-confirm the hunks still apply (`npx patch-package`).

---

## `react-native-screens+4.27.0.patch`

**What:** two hunks in `RNSBarButtonItem.mm`:

- `initWithConfig:` also sets `self.accessibilityIdentifier` when the JS
  `identifier` is provided (one line, alongside the existing
  `self.identifier = identifier`);
- `createActionItemFromConfig:` reads `dict[@"identifier"]` and passes it to
  `[UIAction actionWithTitle:image:identifier:handler:]` instead of `nil`, so
  menu actions carry their JS `identifier` too.

**Why:** the iOS 26 glass header builds nav-bar buttons through
`unstable_headerRightItems`. The native `identifier` is not exposed as an
accessibility identifier, so Detox/XCUITest could not target those bar
buttons. Mirroring it onto `accessibilityIdentifier` makes them reachable
from e2e tests.

**Upstream:** no issue filed yet — local accessibility enhancement.

Added in BlueWallet PR https://github.com/BlueWallet/BlueWallet/pull/8508.
When bumping `react-native-screens`, rename this patch to the new version
and re-confirm the hunks still apply (`npx patch-package`).
