## Context

We are working on the Arkade integration to improve the current Lightning wallet implementation by using the latest SDK versions:

- `@arkade-os/sdk`
- `@arkade-os/boltz-swap`

The goal is to keep the integration surgical. The existing BlueWallet Bitcoin and Multisig Vault products must keep working exactly as before.

The Ark wallet currently presents itself through the existing Lightning wallet surface, mostly by subclassing `LightningCustodianWallet`. Keep those public method contracts stable unless a task explicitly says otherwise.

## Rules

- Always prefer `@arkade-os/sdk` and `@arkade-os/boltz-swap` over direct API calls or third-party packages.
- Use the local SDK/reference sources when SDK behavior is unclear:
  - `../master/ts-sdk`
  - `../master/wallet`
  - `../trixie-wallet`
- When SDK usage is still unclear after checking references, ask first.
- Do not modify existing Bitcoin or Multisig Vault flows.
- Do not remove existing features. Existing buttons, screens, imports, sends, receives, and refills must continue to work.
- Avoid new dependencies unless there is a strong reason. Prefer Realm because it is already available in this codebase.
- Use existing BlueWallet patterns for:
  - alerts and errors
  - loading states
  - haptics
  - navigation
  - transaction list rows
  - localization
- Do not expose swaps as a new user-facing product surface unless explicitly requested. Swaps are an implementation detail.
- Keep commits small and focused. Use existing commit prefixes: `REL`, `FIX`, `ADD`, `REF`, `TST`, `OPS`, `DOC`.
- Never add Claude or an AI tool as a co-author.

## Known References And Pitfalls

- The dependency bump to `@arkade-os/sdk@0.4.23` and `@arkade-os/boltz-swap@0.3.26` is already done in `d8bb2477f`.
- The current first blocker is post-upgrade breakage in `class/wallets/lightning-ark-wallet.ts`.
- Current TypeScript errors seen after the bump:
  - `ArkadeLightning` is no longer exported by `@arkade-os/boltz-swap`.
  - `Wallet.create` no longer accepts the old AsyncStorage-like storage object. It now needs repository-backed `storage.walletRepository` and `storage.contractRepository`.
  - One callback lost inferred typing after the SDK API change.
- Current BlueWallet secure storage uses foreground-oriented Keychain accessibility in React Native. Any background task that needs the Ark Realm encryption key or private signing material may fail while the device is locked unless this is designed and tested explicitly.
- The Arkade SDK and Boltz Realm repositories make the app responsible for opening Realm with the correct schemas, schema version, migration callback, encryption key, and lifecycle. Treat this as app adapter responsibility, not as incidental wallet-class setup.
- Existing Ark wallet tests use an AsyncStorage filesystem mock. Realm-backed persistence will require explicit Realm and Keychain test wiring before integration tests are meaningful.
- Branch `old-branch` is a useful reference, but it was rejected because it changed too much at once and broke UX. Do not copy it wholesale.
- Useful ideas from `old-branch`:
  - Realm-backed Arkade repositories.
  - Runtime-only SDK objects should not be serialized.
  - Swap history needs careful mapping into BlueWallet transaction rows.
- Things to avoid from `old-branch` in early phases:
  - Bundling background tasks with the compile fix.
  - Large receive/invoice UI rewrites before the wallet compiles and persists correctly.
  - Changing identity derivation or wallet namespace policy without strong motivation and explicit approval.
  - Adding a background dependency before the foreground SDK path is stable.

## Review-Derived Invariants

These invariants come from the review rounds on PR #8420. Treat them as constraints for future agents so we do not repeat the same mistakes.

1. Keep each change small enough that every touched file has an obvious reason to change. Do not bundle SDK compatibility, persistence, background tasks, UI behavior, imports, and transaction mapping in one commit.
2. Preserve the Lightning-first UX. The goal is Lightning interoperability. Pure Ark-to-Ark support may exist internally, but Ark addresses and Ark-specific payment concepts must not appear in Lightning receive/send screens without an explicit product decision.
3. Preserve existing flow boundaries. Offchain wallets belong on Lightning screens. Bitcoin receive screens, Multisig Vault flows, and generic storage providers should not gain Ark-specific branches if the Ark wallet class can provide the correct override.
4. Keep LNDHub behavior isolated from Ark behavior. If Ark needs different polling or settlement handling, split it by wallet type instead of changing shared LNDHub effects.
5. Prefer stable Lightning identifiers over passing swap internals through navigation. If a screen already has the BOLT11 invoice, resolve local swap state by invoice/payment hash where possible instead of adding `swapId` route params.
6. Reuse SDK behavior before writing app-level machinery. Prefer `ArkadeSwaps`, `SwapManager`, `waitAndClaim`, `wallet.getVtxoManager()`, `settlementConfig`, `ContractManager`, and `notifyIncomingFunds()` over custom claim, polling, renewal, or monitoring loops.
7. Background work must be explicit, observable, and bounded. Task registration and stop semantics must match the selected library, OS availability/status must be checked, foreground fallback must be clear, dependency state must not go stale, and overlapping per-wallet work must be guarded. Background claiming is not allowed until locked-device Realm/keychain/signing behavior has been proven on iOS and Android; otherwise background work must monitor, notify, and defer claim/refund actions to foreground unlock.
8. Do not key background or reconciliation work from the currently selected wallet. Refresh/reconcile all relevant Ark wallets, especially wallets with pending or unexpired swaps.
9. Respect BlueWallet's storage model. Realm has historically held data that can be lost and repopulated. If Arkade Realm contains non-recoverable swap, claim, or refund data, do not store it in a purgeable cache location. Ark-specific Realm failures must stay scoped to the Ark wallet path and must not corrupt or crash global BlueWallet storage.
10. No migrations are required for the current Arkade upgrade work. We do not want app-level migrations for old tester-only Arkade storage. If a future migration is proposed, it must be strongly motivated, reviewed explicitly, and prove that balances or non-recoverable funds would otherwise be at risk. SDK Realm schema migration callbacks are still allowed as part of repository setup.
11. Preserve plausible deniability and multi-wallet isolation. Realm files, task queues, namespace keys, and background state must not collide across wallets or storage buckets, and should not leak hidden wallet existence through obvious plaintext identifiers.
12. Transaction/activity mapping must deduplicate Ark SDK history against Boltz swap history. A single user action must not produce duplicate rows, and shared pending-state behavior must not regress normal Bitcoin wallets. Use stable logical row IDs that survive status transitions; do not include mutable status in the row key unless intentionally rendering distinct timeline events.
13. Preserve transaction type semantics. Do not add synthetic `confirmations` to `LightningTransaction` for Ark or Lightning settlement state. The canonical Lightning settlement signal is `ispaid`; on-chain rows use `Transaction.confirmations`. If shared UI needs pending-state logic, branch by wallet/transaction kind at that boundary instead of widening the Lightning type.
14. Prefer visible failures over silent stuck states. Lazy init is acceptable, but callers that need SDK runtime state should either initialize successfully or throw an error that the existing UI can surface.
15. Cache expensive deterministic operations, especially identity/key derivation, but do not cache mutable wallet/background dependency snapshots that must reflect wallet add/remove changes.
16. Keep code hygiene tight. Avoid dead parameters, unused permissions, pointless wrapper files, unnecessary eslint disables, confusing byte conversions, and broad refactors unrelated to the phase.
17. Manual UI and CI validation are mandatory for behavior phases. Reviewers observed broken layout, duplicate payments, failed unit/integration tests, e2e self-test timeouts, and receive QR screens not transitioning to success.
18. Test infrastructure is part of the migration. If a phase replaces AsyncStorage with Realm, it must also update the Jest/Realm/Keychain harness enough for tests to assert the new behavior instead of bypassing it.
19. Background schedulers must be test-controllable. A self-test or Detox run must be able to stop, disable, or drain Ark background work so a passing UI state is not hidden behind a process that keeps spinning until timeout.

## Roadmap

### Phase 0: Dependency Upgrade

Status: done in `d8bb2477f`.

No more work should be added to this phase.

### Phase 1: SDK API And Per-Wallet Realm Wiring

Status: done.

Goal: make the app compile and run with the upgraded SDKs while preserving the current Ark wallet UX, using the final per-wallet Realm shape from the start.

This is not compile-only. It is the first SDK API migration plus the minimum persistence wiring required by the new SDK repository APIs. Keep it small: do not add background tasks, new screens, restore flows, transaction-list redesigns, or persistence hardening beyond what is needed to wire the repositories correctly.

Tasks:

1. Replace `ArkadeLightning` with the current `ArkadeSwaps` API from `@arkade-os/boltz-swap`.
2. Add a minimal Arkade Realm adapter, for example:
   - `blue_modules/arkade-adapters/realm/realmInstance.ts`
3. Open one encrypted Realm file per Ark wallet from the start.
   - Do not use a temporary shared/global Arkade Realm that Phase 2 would need to undo.
   - Use a deterministic per-wallet path/namespace that preserves existing wallet lookup unless a later phase explicitly changes namespace policy.
   - Store/retrieve the per-wallet Realm encryption key through Keychain using current foreground-safe accessibility.
   - Do not relax Keychain accessibility or identity access for background execution in this phase.
4. Open the per-wallet Realm with the SDK and Boltz schemas:
   - `ArkRealmSchemas`
   - `BoltzRealmSchemas`
   - `ARK_REALM_SCHEMA_VERSION`
   - `runArkRealmMigrations`
   - `schemaVersion: ARK_REALM_SCHEMA_VERSION`, or `Math.max(ARK_REALM_SCHEMA_VERSION, localArkSchemaVersion)` if the adapter adds app-owned Ark schemas later
5. Replace the old AsyncStorage-like wallet storage passed to `Wallet.create` with repository-backed storage:
   - `RealmWalletRepository`
   - `RealmContractRepository`
   - Remove the old `ArkCustomStorage`/legacy storage adapter in this phase; dropping app-level migration support also removes the need for its `clear()` behavior.
6. Add a Realm-backed swap repository:
   - `RealmSwapRepository`
7. Initialize `ArkadeSwaps` with:
   - the Ark `Wallet`
   - `BoltzSwapProvider`
   - `RealmSwapRepository`
8. Replace direct Boltz fee/limit HTTP fetching with SDK methods where possible:
   - `getFees()`
   - `getLimits()`
9. Keep the current `_getIdentity()` behavior unchanged for this phase.
10. Replace the existing `initLock` sleep-loop with an awaitable in-flight initialization promise keyed by wallet namespace.
   - Keep the public `init(): Promise<void>` contract stable.
   - Do not busy-wait, poll `this._wallet`, or use fixed sleep/timeout loops.
   - Concurrent callers for the same namespace must await the same initialization work and receive the same success or failure result.
   - Initialization failures must reject with a clear error and clear the in-flight entry so a later retry can run.
11. Keep these BlueWallet-facing methods compatible:
   - `generate`
   - `init`
   - `fetchBalance`
   - `fetchTransactions`
   - `getTransactions`
   - `addInvoice`
   - `payInvoice`
   - `getUserInvoices`
   - `fetchBtcAddress`
   - `getArkAddress`
   - `isAddressValid`
12. Fix the implicit `any` introduced by the SDK API change.
13. Do not make any background execution, Keychain accessibility, or identity model changes in this phase.

Acceptance checks:

```bash
./node_modules/.bin/tsc --noEmit
```

Manual validation required:

1. Existing Ark wallet opens.
2. Balance refresh does not crash.
3. Transaction refresh does not crash.
4. Receive screen opens.
5. Send screen opens.
6. Refill flow still opens.
7. A second Ark wallet uses a different Realm file/key namespace than the first.

Suggested commit:

```text
FIX: wire Ark wallet to Arkade SDK repositories
```

Follow-up notes from manual validation:

1. Wallet view shows a flicker where the "Manage Funds" button rapidly appears/disappears before stabilizing. Pre-existing in the shared header rendering, exposed by the new init path:
   - `useWalletSubscribe` polls `wallet.getLastTxFetch()` every 1s and rebuilds a `Proxy(origWallet, {})` whenever the timestamp changes (`hooks/useWalletSubscribe.tsx`).
   - `WalletTransactions.tsx` puts the proxied `wallet` into the `useCallback` deps of `ListHeaderComponent`, so each proxy re-creation produces a new `ListHeaderComponent` and `FlatList` unmounts/remounts the header.
   - `TransactionsNavigationHeader` then re-runs `useState(false)` for `allowOnchainAddress` and re-fetches it asynchronously, causing the visible toggle.
   - Phase 1's slower init (Realm open + 2 HTTP calls for fees/limits) lengthens each flicker window but does not introduce the cycle. Phase 1 was hardened to skip the fee/limit fetch on the cached fast path when `_limitMin`/`_limitMax` are already populated.
   - Proper fix belongs in Phase 2 task 8: make `_wallet` and `_arkadeSwaps` non-enumerable in the constructor so `prepareForSerialization` becomes a no-op and the saveToDisk → re-init churn stops.
2. Imported wallet shows zero rows in Transactions even when balance is correct. Expected for Phase 1: local Boltz swap state from old AsyncStorage is not migrated, and the only Ark history rows currently mapped are settled on-chain refills. Phase 5 broadens the activity mapping; Phase 6 adds `restoreSwaps()` to rebuild swap activity.
3. "Manage Funds" button only opens the {Refill, Refill with external wallet} menu on **long-press** — same behavior as the LndHub Lightning wallet, untouched by this phase. If a tap-to-open variant is wanted for Ark, it is a separate UX call.

Bundle/test infrastructure notes:

1. Metro needs CJS aliases for `@arkade-os/sdk`, `@arkade-os/sdk/adapters/expo`, `@arkade-os/sdk/repositories/realm`, and `@arkade-os/boltz-swap/repositories/realm` (the SDK's ESM build uses `export * as ns from '...'` which the RN babel preset does not transform). A scoped `resolveRequest` redirects `@noble/hashes/*` imports originating inside `@bitcoinerlab/descriptors-core/` to the v2 copy already nested under `@bitcoinerlab/descriptors-scure/node_modules/@noble/hashes` (descriptors-core uses v2 paths but does not declare the dep, and the top-level `@noble/hashes@1.3.3` is kept for `bitcoinjs-lib`). All in `metro.config.js`.
2. Two pre-existing unit-test failures (`storage.test.js`, `addresses.test.ts`) remain on this commit for the same `@noble/hashes` reason — Jest does not read `metro.config.js`. Phase 3 ("Test infrastructure is part of the migration") owns the Jest harness fix.

Review fixes applied after the first Phase 1 commit:

1. `blue_modules/arkade-adapters/realm/realmInstance.ts` now stores Realm files under `${RNFS.DocumentDirectoryPath}/arkade/` rather than the top level. `class/blue-app.ts:moveRealmFilesToCacheDirectory()` reads the top of `Documents` non-recursively and moves any matching `*.realm`/`.realm.lock`/`.realm.management` into the OS-purgeable cache; the previous top-level path was being swept on every restart, leaving the wallet to open a fresh empty Realm at the original path while the real data sat orphaned in cache (and being overwritten on subsequent restarts). The subdirectory is invisible to that scan. Tester-only Phase-1 state on disk before this fix is not migrated (per Invariant 10); the SDK re-syncs from the indexer/Boltz on next foreground.
2. The Realm encryption key is now stored with explicit `accessible: ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY` instead of inheriting the `react-native-keychain` default of `AFTER_FIRST_UNLOCK`. This matches the `RNSecureKeyStore` posture used elsewhere in the app for sensitive data (`class/blue-app.ts:124`, `hooks/useBiometrics.ts:22-29`) and resolves the asymmetry called out in the Phase 1A findings — the key now matches the wallet `secret` accessibility instead of being looser.
3. `class/wallets/lightning-ark-wallet.ts` `init()` no longer discards the `inFlight.finally(...)` cleanup chain; an explicit `.catch(() => {})` silences the cleanup-chain rejection (the same rejection is already delivered to `await inFlight` callers).

### Phase 1A: Background Identity Feasibility Spike

Goal: decide what background work is actually possible before storage and background-task design accidentally depend on impossible locked-device access.

This is a research/proof phase. Do not add a background scheduler or a new dependency here.

Tasks:

1. Identify every secret needed for background Ark work:
   - Ark Realm encryption key
   - wallet identity/private signing material
   - Boltz swap repository data
   - any app encryption or hidden-wallet prerequisite
2. Verify iOS behavior on a real device or simulator where possible:
   - app foregrounded and unlocked
   - app backgrounded while device is unlocked
   - app backgrounded while device is locked after first unlock
   - device rebooted but not yet unlocked
3. Verify Android behavior on a real device or emulator where possible:
   - app backgrounded while device is unlocked
   - app backgrounded while device is locked
   - device rebooted but not yet unlocked
   - any Android Keystore user-authentication or unlocked-device restrictions used by the selected library
4. Record whether background work can safely:
   - open the per-wallet Ark Realm
   - read pending swap state
   - derive or load the signing identity
   - sign claim/refund transactions
   - only monitor and notify
5. Default to foreground-deferred claim/refund unless background signing is proven safe and explicitly accepted.
6. Feed the result into Phase 2 Keychain accessibility choices and Phase 7 scope.

Acceptance checks:

1. A short implementation note or PR description records the tested platform/device matrix.
2. The note states one of these policies:
   - background can sign/claim
   - background can open state but only monitor/notify
   - background must do nothing until foreground unlock
3. No background dependency or scheduler is added.

Suggested commit:

```text
DOC: assess Arkade background identity constraints
```

Findings (2026-05-06):

Secrets the background path would touch:

| Secret | Where it lives today | Storage layer | iOS Data Protection | Android equivalent |
|---|---|---|---|---|
| Per-wallet Ark Realm encryption key | Keychain item `arkade_realm_<sha256(secret)>` (added in Phase 1) | `react-native-keychain` | **Default `AFTER_FIRST_UNLOCK`** (no `accessible` option set) | Default `ANY` storage (no `securityLevel`) |
| Wallet `secret` (mnemonic), needed for `_getIdentity()` → SingleKey signing | Inside the encrypted wallet bucket in `data` | `react-native-secure-key-store` | `WHEN_UNLOCKED_THIS_DEVICE_ONLY` (`class/blue-app.ts:124`) | Per RNSecureKeyStore Android default — not verified |
| Optional encrypted-storage password (`cachedPassword`) | In-memory only, set on `decryptStorage()` | — | N/A (lost on app kill) | N/A |
| Boltz swap repository state (pending swaps, preimages, VHTLC details) | The same per-wallet Ark Realm above | Same as Realm key | Same as Realm key | Same as Realm key |
| Biometric-gated `data_encrypted` flag | RNSecureKeyStore `data_encrypted` | `WHEN_UNLOCKED_THIS_DEVICE_ONLY` (`hooks/useBiometrics.ts:26`) | — | — |

Critical asymmetry: the Phase 1 Ark Realm encryption key inherits the `react-native-keychain` default of `AFTER_FIRST_UNLOCK`, but the wallet `secret` it protects gates at `WHEN_UNLOCKED_THIS_DEVICE_ONLY`. So a background task could in principle open the Ark Realm and read pending-swap state while the device is locked, but it could not derive a signing identity to act on it. Phase 2 task 4 must tighten this explicitly (see updated wording below).

iOS Info.plist already declares `fetch`, `processing`, and `remote-notification` background modes. There is currently no Ark background scheduler code; the only background hook is `RNNotifications.didReceiveBackgroundNotification` in `AppDelegate.swift`.

Platform / device matrix (iOS rows reasoned from `react-native-keychain` and `react-native-secure-key-store` defaults plus Apple Data Protection semantics; Android rows TODO because RNSecureKeyStore's Android lock-screen behavior is not well-documented and the codebase doesn't pin a `securityLevel`):

| Scenario | Open Ark Realm | Read pending swaps | Derive signing identity | Sign claim/refund | Post local notification |
|---|---|---|---|---|---|
| iOS foreground, unlocked | ✅ (Phase 1 verified) | ✅ | ✅ | ✅ | ✅ |
| iOS backgrounded, device unlocked | Expected ✅ | Expected ✅ | Expected ✅ | Expected ✅ | Expected ✅ |
| iOS backgrounded, locked after first unlock | Expected ✅ | Expected ✅ | ❌ (`WHEN_UNLOCKED_THIS_DEVICE_ONLY` secret) | ❌ | Expected ✅ |
| iOS rebooted, not yet unlocked | ❌ (`AFTER_FIRST_UNLOCK` blocks) | ❌ | ❌ | ❌ | ❌ |
| Android foreground, unlocked | ✅ (Phase 1 verified) | ✅ | ✅ | ✅ | ✅ |
| Android backgrounded, unlocked | TODO device test | TODO | TODO | TODO | TODO |
| Android backgrounded, locked | TODO device test | TODO | TODO | TODO | TODO |
| Android rebooted, not yet unlocked | TODO device test | TODO | TODO | TODO | TODO |

Selected policy: **background can open state but only monitor/notify; claim/refund deferred to next foreground unlock.** Reasoning:

- Wallet secret is gated by `WHEN_UNLOCKED_THIS_DEVICE_ONLY`, shared with all other wallet types and the biometric flow. Relaxing it just for Ark is a regression in the app's overall key-handling posture and weakens plausible-deniability storage for unrelated wallets (Invariant 11).
- Matches Invariant 7: background work must monitor, notify, and defer claim/refund actions to foreground unlock when locked-device behavior is not proven.
- Keeps `_getIdentity()` derivation untouched (Phase 1 task 9), preserving the address-derivation regression test in Phase 3 task 4.

Rejected: background can sign/claim. Would require either relaxing the wallet-secret accessibility (regression) or maintaining a separate per-Ark-wallet identity material in an `AFTER_FIRST_UNLOCK` Keychain entry. The latter doubles the attack surface for the signing key and adds a second key-rotation lifecycle.

### Phase 2: Realm Persistence Hardening

Goal: harden the per-wallet Arkade Realm adapter introduced in Phase 1 so SDK state persistence is safe, isolated, testable, and lifecycle-aware before adding more features.

Tasks:

1. Harden the Arkade Realm adapter introduced in Phase 1, for example:
   - `blue_modules/arkade-adapters/realm/realmInstance.ts`
2. Keep the adapter strictly decoupled from global `BlueApp` Realm helpers:
   - own Ark Realm open/cache/close/delete behavior
   - expose a narrow Ark-specific API
   - surface Ark Realm errors through the Ark wallet path
   - do not let Ark Realm failures corrupt global app storage
3. Verify and enforce one encrypted Realm file per Ark wallet.
4. Verify and harden per-wallet Realm encryption-key storage in Keychain.
   - iOS `accessible: ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY` was already applied in the Phase 1 review pass — verify it is still in place on `Keychain.setGenericPassword` and that no later phase has loosened it.
   - On Android, set `securityLevel: SECURITY_LEVEL.SECURE_HARDWARE` (with a graceful fallback when unavailable) to match the conservative posture and avoid silent fallback to FB Secure Storage. Not done in Phase 1.
   - Do not relax secret accessibility only to make background tasks easier. Phase 1A explicitly rejected the background-signing path.
5. Keep the initial namespace policy conservative unless there is a strongly motivated reason to change it.
   - Conservative option: keep `hashIt(secret)` so existing wallets keep finding their data.
   - Privacy-improvement option: generate a random persisted namespace only if the change is explicitly reviewed.
   - Do not add app-level migration code for old tester-only Arkade storage.
6. Cache open Realm instances and close them safely.
   - one open instance per wallet/path
   - deduplicate concurrent opens
   - expose close-by-wallet and close-all cleanup
   - avoid leaking listeners or file handles
7. Add wallet deletion cleanup:
   - clear in-memory Ark wallet cache
   - clear in-memory swap cache
   - close Realm
   - delete Realm files
   - delete the related Keychain entry
8. Ensure runtime-only SDK/Boltz objects are not serialized by `BlueApp.saveToDisk`.
   - Either clear them in `prepareForSerialization`, or make them non-enumerable.
   - Do not mix both approaches without tests.
   - Guard partially initialized runtime objects so `saveToDisk` cannot serialize inconsistent SDK state.
9. Update the Jest Realm/Keychain harness enough to exercise encrypted per-wallet Realm setup.
10. Keep plausible-deniability storage behavior in mind. Do not leak hidden wallet state into shared plaintext keys.

Acceptance checks:

```bash
./node_modules/.bin/tsc --noEmit
npm run unit
```

Manual validation required:

1. Create an Ark wallet.
2. Restart the app.
3. Confirm the wallet still loads and refreshes.
4. Delete the wallet.
5. Confirm deletion does not crash and the app can restart.
6. Repeat with two Ark wallets and confirm their Realm state does not collide.

Suggested commit:

```text
REF: harden Arkade Realm persistence lifecycle
```

### Phase 3: Test The BlueWallet Ark Contract

Goal: pin the app-facing behavior before changing internals further.

Do not test SDK internals. Test the behavior BlueWallet screens depend on.

Tasks:

1. Replace or update the old AsyncStorage filesystem test harness so Realm-backed Ark storage is tested directly.
2. Add a reusable test Realm/Keychain adapter for encrypted per-wallet Realm files.
3. Add a smoke test that opens Ark and Boltz Realm repositories with the SDK schemas and schema version.
4. Add an Ark derivation regression test for `LightningArkWallet` with a fixed mnemonic.
   - Use `abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about`.
   - Assert the exact derived Ark address:
     `ark1qq4hfssprtcgnjzf8qlw2f78yvjau5kldfugg29k34y7j96q2w4t59s7u3fgnd3lyjda00ycjq53mgxl6wsxspe4s72t5dss3q6w5clv0xpgal`
   - Keep this assertion aligned with `screen/settings/SelfTest.tsx`; the SelfTest screen and automated tests should share the same expected mnemonic/address fixture or helper where practical.
   - Any identity path, namespace, or address derivation change must fail this test and require explicit review.
5. Add tests for `isAddressValid` with known valid and invalid Ark addresses.
6. Add tests for `decodeInvoice` and `isInvoiceExpired`.
7. Add tests for `getTransactions` mapping:
   - pending Lightning receive
   - paid Lightning receive
   - Lightning send
   - pending refill
   - completed refill
   - native Ark send/receive when available in fixture data
8. Add tests that `addInvoice` returns a BOLT11 string.
9. Add tests that `payInvoice` accepts:
   - BOLT11 invoice
   - native Ark address plus amount
10. Prefer mocks/fixtures for SDK and Boltz behavior where network access is not required.

Acceptance checks:

```bash
./node_modules/.bin/tsc --noEmit
npm run unit
```

Suggested commit:

```text
TST: cover Ark wallet SDK contract
```

### Phase 4: Foreground SDK Feature Adoption

Goal: use the new SDK patterns in foreground while keeping the current app UX.

Background execution is still out of scope in this phase.

Tasks:

1. Enable foreground `ArkadeSwaps` `swapManager` when safe.
2. Subscribe to SwapManager events and refresh wallet state on:
   - swap update
   - swap completed
   - swap failed
   - action executed
3. Replace manual reverse-swap claiming loops with SDK-provided behavior where possible:
   - `waitAndClaim`
   - SwapManager automatic actions
4. Use `wallet.getVtxoManager()` instead of manually constructing `new VtxoManager(...)`.
5. Configure VTXO lifecycle through `settlementConfig` on `Wallet.create`.
6. Prefer `wallet.notifyIncomingFunds()` and ContractManager-backed APIs over app-owned polling where the SDK already provides the behavior.
7. Keep existing loading/error handling in screens.
8. Remove Ark address rendering and BIP21 Ark extensions from `screen/lnd/lndViewInvoice.tsx`.
   - Keep Ark address display in wallet details only until there is an explicit product decision.
   - Do not leave `?ark=` or `?arkade=` in Lightning invoice QR/content just because it already compiles.
   - If a future approved BIP21 Ark marker is needed, use the canonical `ark=...` parameter used by the Arkade reference wallet.
9. Ask before changing receive/send screen UX.
10. Make the delegator URL network-aware. Phase 2 hardcodes
    `_delegatorUrl = 'https://delegate.arkade.money'` on `LightningArkWallet`,
    which is the mainnet URL. If `_arkServerUrl` is later pointed at a testnet/
    mutinynet/regtest ASP, the mainnet delegator will not match — funds may be
    invisible or the delegator handshake will fail. Mirror the canonical
    wallet's `DELEGATE_URL` map (`../master/wallet/src/lib/constants.ts:27`):
    `bitcoin → delegate.arkade.money`, `mutinynet → delegator.mutinynet.arkade.sh`,
    `regtest → http://localhost:7012`, `signet|testnet → null` (no delegator,
    so do not pass `delegatorProvider` at all).
11. Surface delegator failures clearly. Phase 2 wires
    `delegatorProvider: new RestDelegatorProvider(...)` into `Wallet.create`.
    If the delegator URL is unreachable or returns a non-200, `Wallet.create`
    rejects with a generic error mid-`init()`, which currently surfaces as a
    blank wallet view. Catch the delegator-specific failure mode (or detect it
    via a preflight `getDelegateInfo()`), and surface it through the existing
    BlueWallet alert pattern with a clear message ("Delegate service
    unreachable; offline balance shown") and a retry path. Do not silently
    fall back to a non-delegate wallet — that would re-introduce the Phase 2
    zero-balance regression.

Acceptance checks:

```bash
./node_modules/.bin/tsc --noEmit
npm run unit
```

Manual validation required:

1. Create a Lightning invoice.
2. Pay it while the app is foregrounded.
3. Confirm the app claims/settles and refreshes.
4. Pay a Lightning invoice from the Ark wallet.
5. Send to a native Ark address.
6. Pull-to-refresh updates balance and history.

Suggested commit:

```text
REF: use Arkade swap manager in foreground
```

### Phase 5: Activity And Transaction Mapping

Goal: make Arkade activity accurate in the existing BlueWallet transaction list without creating a separate swap UX.

Tasks:

1. Start with a small mapping spec that defines:
   - source records
   - coalescing rules between Boltz swaps and Ark SDK history
   - stable row ID strategy
   - settlement signal per row kind
   - how status changes update an existing row
2. Map reverse swaps as Lightning receives.
3. Map submarine swaps as Lightning sends.
4. Map native Ark receives as positive received rows.
5. Map native Ark sends as negative sent rows.
6. Map boarding UTXOs as pending refill rows.
7. Map settled boarding transactions as refill rows.
8. Deduplicate Ark SDK transaction history against Boltz swap history.
9. Hide expired unpaid invoices where the current UX expects them hidden.
10. Preserve failed/refunded states if they are useful for support diagnostics.
11. Ensure every row has a stable logical key/id. Avoid empty string ids, duplicate keys, and keys that change just because a swap status changed.
12. Use `LightningTransaction.ispaid` for Lightning/Ark settlement state. Do not add `confirmations` to Ark/LN rows, and do not add a new cross-type `isSettled` field unless a separate transaction-model refactor is explicitly approved.
13. Fix shared pending-state checks at the boundary. If the Ark wallet needs different pending-pill semantics, branch by wallet type in `components/WalletsCarousel.tsx`: Lightning/Ark wallets may use a relevant `ispaid === false` row, but normal Bitcoin/on-chain wallets must keep the existing `find(tx => tx.confirmations === 0)` rule unchanged. Treat the earlier "leave it as is" review feedback as hesitation about regression risk, not approval to alter Bitcoin semantics.
14. Keep using `TransactionListItem` and the existing wallet transaction screen unless a UX change is explicitly requested.

Acceptance checks:

```bash
./node_modules/.bin/tsc --noEmit
npm run unit
```

Manual validation required:

1. No duplicate row for one Lightning receive.
2. No duplicate row for one Lightning send.
3. Pending invoice appears while unpaid.
4. Paid invoice becomes paid.
5. Refill appears as pending and then completed.
6. Native Ark send/receive rows have correct sign and timestamp.
7. Wallet carousel pending status works for Ark/Lightning without changing Bitcoin confirmation behavior.

Suggested commit:

```text
REF: map Arkade activity from swaps and wallet history
```

### Phase 6: Per-Swap Claim/Refund + Import-Time Restore

Goal: expose per-swap claim/refund actions on the existing single-swap detail
view, and restore locally missing swap activity exactly once at import time.
No bootstrap-wide recovery sweep, no stranded-VTXO scan — those broad paths
do not exist elsewhere in BlueWallet and we are not introducing them.

Scope (locked in 2026-05-07):

- Per-swap CTA only. The user reaches a Claim/Refund button by tapping a
  swap-backed row in the activity list; the existing `screen/lnd/lndViewInvoice.tsx`
  detail screen renders a primary button when the SDK reports the swap as
  claimable or refundable. Reuse Lightning detail surface — no new screen.
- Restore at import time only. `restoreSwaps()` runs once inside the
  `arkade://` branch of `class/wallet-import.ts`, never on regular wallet
  reload/unlock. Failures must not block the import.
- Manual restore. A "Restore swap activity" SecondButton in
  `screen/wallets/WalletDetails.tsx` triggers the same SDK call on demand;
  for support cases when the import-time call missed something.

Tasks:

1. Add narrow public methods on `LightningArkWallet`:
   - `getSwapById(id)`
   - `isSwapClaimable(swap)` / `isSwapRefundable(swap)` — delegate to SDK
     predicates `isReverseSwapClaimable`, `isSubmarineSwapRefundable`,
     `isChainSwapClaimable`, `isChainSwapRefundable`.
   - `claimSwap(swap)` → `ArkadeSwaps.claimVHTLC(swap)` + refresh
     transactions/balance.
   - `refundSwap(swap)` → `ArkadeSwaps.refundVHTLC(swap)`, returning the
     `SubmarineRefundOutcome { swept, skipped }`.
   - `restoreSwaps()` → `ArkadeSwaps.restoreSwaps()`, refresh `_swapHistory`.
     Coalesce concurrent calls per namespace via an in-flight promise map
     (mirror the existing `initInFlight` pattern).
2. Wire the CTA into `screen/lnd/lndViewInvoice.tsx`:
   - Resolve the swap by parsing `swap-${id}` from `invoice.txid`.
   - Render Claim/Refund branch ahead of the existing `ispaid`/expired
     branches; falls through automatically when neither predicate matches
     (i.e. for non-Ark wallets, native Lightning rows, or swap rows whose
     status is terminal/pending).
   - Refund result with `swept: 0, skipped: N` surfaces as an info alert
     (`refund_deferred` loc key) and the button stays enabled for retry.
3. Call `await ark.restoreSwaps()` once in `class/wallet-import.ts:217-225`,
   wrapped in try/catch that logs but does not abort the import.
4. Add a `Restore swap activity` SecondButton in
   `screen/wallets/WalletDetails.tsx` inside the existing Ark conditional;
   refresh via `fetchAndSaveWalletTransactions(walletID)` after success.
5. Do not silently delete non-terminal swap state. Wallet deletion already
   stops SwapManager + drops the per-wallet Realm; this remains unchanged.
   If a future task adds a "wallet reset" path that destroys swap state
   while non-terminal swaps exist, that path must require explicit
   confirmation — out of scope for Phase 6.

Out of scope for Phase 6:

- `scanRecoverableSubmarineSwaps` / `recoverAllSubmarineFunds` / any
  stranded-VTXO walk.
- Bootstrap-time / on-init swap restore (only at import, only manually).
- New navigation route or dedicated swap-detail screen.

Acceptance checks:

```bash
./node_modules/.bin/tsc --noEmit
npm run unit
```

Manual validation required:

1. Reverse claim CTA. Force-quit the app between Boltz funding the VHTLC
   and the foreground SwapManager auto-claiming, then tap the row → see
   "Claim funds" → tap → claim succeeds, row flips to settled.
2. Submarine refund CTA. After a swap fails (`invoice.expired` etc.), tap
   the row → "Refund funds" → success → row shows `Refunded: ` prefix
   per Phase 5 mapping.
3. Refund deferred. Tap refund before the on-chain timelock expires;
   verify the inline alert appears (no error banner) and the button stays
   available for retry.
4. Import-time restore. Import an Ark wallet that has prior swap activity
   from another device — activity list populates immediately. Subsequent
   app restarts do NOT re-run restore.
5. Manual restore. Wallet details → "Restore swap activity" → success
   alert; back-nav to transactions list reflects any newly restored rows.
6. No-op on regular Lightning wallets. LNDHub invoice detail screen
   shows no Claim/Refund button.

Suggested commit:

```text
ADD: per-swap claim/refund and import-time restore for Arkade
```

Status: done.

Review fixes applied after initial Phase 6 commit:

1. `restoreSwaps()` joiner instances now pull `_swapHistory` and `_lastTxFetch` from `staticSwapsCache` after awaiting the shared in-flight promise. Previously only the creating instance updated its own fields; a second instance with the same namespace would return with stale swap history.
2. `swap` state in `lndViewInvoice.tsx` is now derived directly from `arkWallet.getSwapById(swapId)` on each render instead of being held in `useState`. Background SDK events that update `_swapHistory` (via `_subscribeToSwapEvents`) are reflected on the next re-render triggered by storage updates, without the user needing to back out and reopen the row.
3. `FlatList._keyExtractor` in `WalletTransactions.tsx` now uses `item.hash || item.txid` instead of `index.toString()`. `SectionList.sectionListKeyExtractor` in `WalletsList.tsx` uses the string item directly for the carousel section, and `item.hash || item.txid` for transaction items. The `key=` props already on the row components were correct; the list-level extractors now match.

### Phase 7: Background Tasks

Goal: continue best-effort swap monitoring while the app is backgrounded, and claim/refund only if Phase 1A proves the required identity and Realm access is safe while locked.

Do not start this phase until foreground send/receive, persistence, and activity mapping are stable.

Phase 1A outcome (2026-05-06): the wallet `secret` is gated by `WHEN_UNLOCKED_THIS_DEVICE_ONLY`, so background signing is unavailable while the device is locked. Phase 7 implements **background monitoring + local notifications + foreground-deferred claim/refund**, not automatic background claiming. The decisions below are pre-resolved by Phase 1A and should not be re-litigated by the implementing agent unless the Phase 1A device matrix is re-run and produces a different conclusion.

Before any background scheduler code, native configuration, or dependency change, write a short Phase 7 scheduler decision record. The implementing agent should propose the choice, but Pietro/reviewers must explicitly accept it before implementation starts.

The decision record must cover:

1. Selected scheduler and rejected alternatives.
2. Why the selected scheduler fits the Phase 1A identity policy.
3. iOS and Android behavior while unlocked, locked after first unlock, and rebooted before unlock.
4. Battery/background-execution constraints.
5. Task registration/stop semantics.
6. E2E test-mode stop/disable/drain hook.
7. Cleanup behavior when Ark wallets are removed.

Decisions required before implementation:

1. Background scheduler:
   - SDK/Boltz Expo utilities
   - `react-native-background-fetch`
   - native iOS/Android implementation
2. Identity model while the app is locked or encrypted: **resolved by Phase 1A — background can only poll/notify; signing happens in foreground after the user opens the app from the notification.** Re-confirm only if Phase 1A's Android matrix (currently TODO) flips the conclusion.
3. Keychain accessibility and Realm encryption-key access: **resolved by Phase 1A — keep foreground-only secrets (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`).** Do not introduce a separate `AFTER_FIRST_UNLOCK` identity cache.
4. Secure storage model for the background task: none required beyond the Phase 2 Ark Realm key, since the background path does not sign. The background task only needs Boltz API access (no app secret) and the Ark indexer.
5. Per-wallet task namespace and cleanup behavior.
6. Device/manual test matrix for iOS and Android.

Preferred implementation direction:

1. Reuse SDK/Boltz background helpers where possible.
2. Avoid custom task queues/processors unless the SDK path is blocked.
3. Register background tasks at app entry/module scope if the selected API requires it.
4. Do not put signing/private-key access in background code. Phase 1A's selected policy forbids it; the wallet `secret` is unavailable while the device is locked anyway.
5. The background task scope is: open the per-wallet Ark Realm (key is `WHEN_UNLOCKED_THIS_DEVICE_ONLY` per Phase 2, so this only runs while the device has been unlocked since boot AND is currently unlocked), poll Boltz for pending-swap status, and post a local notification when a swap reaches a claimable / refundable state. The notification deeplinks into the foreground claim/refund flow.
6. Seed tasks from pending swaps across all Ark wallets, not from selected wallet state.
7. Drain and reconcile task results on foreground resume. On foreground resume, run the deferred claim/refund actions for any swap that reached a terminal-claimable state while backgrounded.
8. Add an explicit stop/disable/drain hook for test mode and app shutdown paths.
   - Detox self-test must be able to stop Ark background scheduling before waiting for final success.
   - The hook must also prevent orphaned intervals, timers, subscriptions, or native background jobs from keeping the app busy after the visible self-test says `ok`.
9. Unregister/cleanup when the last Ark wallet is removed.
10. Drop background dependencies that assume the worker can sign (e.g., do not register a `react-native-background-fetch` headless task that calls `arkadeSwaps.claimVHTLC` directly).

Acceptance checks:

```bash
./node_modules/.bin/tsc --noEmit
npm run unit
npm run e2e:debug-test
```

If only a device run is available, use:

```bash
npm run e2e:debug-test-device
```

The Detox self-test must finish without timing out after the UI reaches its `ok` state.

Manual validation required:

1. iOS foreground receive.
2. iOS background receive claim or deferred claim, depending on selected identity policy.
3. iOS locked-device run after first unlock.
4. iOS reboot-before-unlock behavior.
5. Android foreground receive.
6. Android background receive claim or deferred claim.
7. Android locked-device run.
8. Android reboot-before-unlock behavior.
9. App restart after pending swap.
10. Wallet deletion with pending and completed swaps.

Suggested commit:

```text
ADD: background Arkade swap processing
```

## Agent Handoff Checklist

Before starting any phase, an agent should:

1. Read this file.
2. Read `CLAUDE.md`.
3. Inspect `class/wallets/lightning-ark-wallet.ts`.
4. Inspect the current SDK type exports in `node_modules/@arkade-os`.
5. Check `../master/wallet` and `../trixie-wallet` for SDK usage patterns when needed.
6. Confirm the phase scope and avoid implementing later-phase work.

Before finishing any phase, an agent should report:

1. Files changed.
2. Commands run.
3. Typecheck/test results.
4. Manual validation still required from Pietro.
5. Any SDK behavior that was unclear and needs confirmation.
