# patches

Local patches applied to `node_modules` by [`patch-package`](https://github.com/ds300/patch-package)
on `postinstall` (see `package.json` → `scripts.patches`).

When upstream ships an equivalent fix, drop the patch here and bump the dependency.

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

## `@react-navigation+native-stack+7.15.1.patch`

**What:** adds an `experimental_userInterfaceStyle` navigation option to
`NativeStackNavigationOptions` (typed in `src/types.tsx` and the built
`lib/typescript` d.ts) and threads it through `useHeaderConfigProps` so a
screen can override the header's `UIUserInterfaceStyle`. When omitted it
falls back to the previous behaviour via
`experimentalUserInterfaceStyleOption ?? (dark ? 'dark' : 'light')`.

**Why:** on iOS 26 the navigation bar's liquid-glass material and tint are
resolved from `UIUserInterfaceStyle`. React Navigation hard-codes this from
the theme `dark` boolean, so a screen cannot force a light/dark header
independent of the active theme. The iOS 26 glass header
(`screen/wallets/WalletTransactions.tsx`) needs that per-screen override.

**Upstream:** https://github.com/react-navigation/react-navigation/issues/13069 (open)

Added in BlueWallet PR https://github.com/BlueWallet/BlueWallet/pull/8508.
Remove once `@react-navigation/native-stack` exposes a header
`UIUserInterfaceStyle` override upstream. When bumping the dependency,
rename this patch to the new version and re-confirm the hunks still apply
(`npx patch-package`).

---

## `react-native-screens+4.25.2.patch`

**What:** in `RNSBarButtonItem.mm`, also set `self.accessibilityIdentifier`
when the JS `identifier` is provided (one line, alongside the existing
`self.identifier = identifier`).

**Why:** the iOS 26 glass header builds nav-bar buttons through
`unstable_headerRightItems`. The native `identifier` is not exposed as an
accessibility identifier, so Detox/XCUITest could not target those bar
buttons. Mirroring it onto `accessibilityIdentifier` makes them reachable
from e2e tests.

**Upstream:** no issue filed yet — local accessibility enhancement.

Added in BlueWallet PR https://github.com/BlueWallet/BlueWallet/pull/8508.
When bumping `react-native-screens`, rename this patch to the new version
and re-confirm the hunk still applies (`npx patch-package`).

---

## `react-native-keychain+10.0.0.patch`

**What:** adds an `applicationPassword` option on iOS and supplies it to an
`LAContext` when a Keychain item uses `ACCESS_CONTROL.APPLICATION_PASSWORD`.
It also adds explicit native authentication and fresh-authentication options
used by the biometric/passcode policy flow.

**Why:** BlueWallet storage encryption uses the user's storage password as the
application-provided Keychain credential. The upstream JavaScript enum exposes
this access-control policy, but its native bridge does not provide a way to set
the corresponding `LACredentialTypeApplicationPassword` credential.

Legacy values written by `react-native-secure-key-store`, AsyncStorage, and the
old Realm backup are migrated through BlueWallet's storage layer. The legacy
source is removed only after the React Native Keychain copy is verified.

Remove this patch once `react-native-keychain` supports supplying an application
password to set/get operations upstream.
