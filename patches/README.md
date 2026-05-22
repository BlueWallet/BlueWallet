# patches

Local patches applied to `node_modules` by [`patch-package`](https://github.com/ds300/patch-package)
on `postinstall` (see `package.json` → `scripts.patches`).

When upstream ships an equivalent fix, drop the patch here and bump the dependency.

---

## `react-native-tcp-socket+6.4.1.patch`

**What:** in `TcpSockets.m onConnect:`, read the socket addresses once and
emit `connect` only when both are valid; otherwise emit an `error` event
for that client.

**Why:** `onConnect:` builds an `NSDictionary` literal from
`[socket localHost]` / `[socket connectedHost]`. The socket can disconnect
between this callback being queued and run, in which case those getters
return `nil`; a dictionary literal with a `nil` value throws
`NSInvalidArgumentException`, which is uncaught and aborts the whole app
(SIGABRT). It is intermittent and was seen against Electrum TLS
connections, but is not TLS-specific.

```
NSInvalidArgumentException — attempt to insert nil object from objects[0]
  -[TcpSockets onConnect:]  ->  -[TcpSocketClient socketDidSecure:]
→ Signal 6 (abort)
```

The `error`-event path (rather than just skipping the event) is
deliberate: skipping silently leaves the JS side waiting forever for a
`connect` callback that never arrives. Emitting `error` lets the JS
connection fail fast so the caller can retry.

**Upstream:**
- Bug: https://github.com/Rapsssito/react-native-tcp-socket/issues/197 (open)
- https://github.com/Rapsssito/react-native-tcp-socket/pull/225 (open) —
  proposes the same nil guard but skips the event, which the maintainer
  noted would hang JS; this patch emits `error` instead.
- https://github.com/Rapsssito/react-native-tcp-socket/pull/172 (closed) —
  earlier attempt with the same error-event structure.

**Remove this patch once an upstream fix is merged and
`react-native-tcp-socket` is bumped past 6.4.1.**

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
