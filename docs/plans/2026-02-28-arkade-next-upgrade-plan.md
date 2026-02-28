# Arkade Next Upgrade Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade @arkade-os/sdk and boltz-swap to `next` prereleases, replace AsyncStorage with Realm repositories, and add background task scheduling for VTXO renewal and swap processing.

**Architecture:** Vendor Realm adapter code from upstream open PRs (ts-sdk#318, boltz-swap#80) into `blue_modules/arkade-adapters/`. Write a bare React Native background task wrapper using `react-native-background-fetch` to replace Expo-specific scheduling. Refactor `LightningArkWallet` to use new repositories and task processors, with migration from legacy AsyncStorage.

**Tech Stack:** React Native (bare), Realm v20.1.0, @arkade-os/sdk@0.4.0-next.0, @arkade-os/boltz-swap@0.3.0-next.0, react-native-background-fetch

**Design Doc:** `docs/plans/2026-02-28-arkade-next-upgrade-design.md`

---

### Task 1: Upgrade Arkade packages to `next`

**Files:**
- Modify: `package.json`

**Step 1: Install next prereleases**

Run:
```bash
npm install @arkade-os/sdk@0.4.0-next.0 @arkade-os/boltz-swap@0.3.0-next.0
```

**Step 2: Verify installation**

Run: `node -e "console.log(require('@arkade-os/sdk/package.json').version)"`
Expected: `0.4.0-next.0`

Run: `node -e "console.log(require('@arkade-os/boltz-swap/package.json').version)"`
Expected: `0.3.0-next.0`

**Step 3: Run TypeScript check for breaking changes**

Run: `npx tsc --noEmit 2>&1 | head -50`
Expected: Type errors in `lightning-ark-wallet.ts` due to API changes (ArkadeLightning → ArkadeSwaps, Wallet.create config changes). Note these — they'll be fixed in Task 5.

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "ADD: upgrade arkade sdk and boltz-swap to next prereleases"
```

---

### Task 2: Install react-native-background-fetch

**Files:**
- Modify: `package.json`
- Modify: `ios/BlueWallet/Info.plist` (add BGTask identifier)
- Modify: `android/app/src/main/AndroidManifest.xml` (add permissions)

**Step 1: Install the package**

Run:
```bash
npm install react-native-background-fetch
```

**Step 2: Add iOS BGTask identifier**

In `ios/BlueWallet/Info.plist`, add to the `BGTaskSchedulerPermittedIdentifiers` array:

```xml
<string>io.bluewallet.bluewallet.arkadeSync</string>
```

The existing array at lines 5-8 already has `io.bluewallet.bluewallet.fetchTxsForWallet`. Add the new identifier as a sibling.

**Step 3: Add Android permissions**

In `android/app/src/main/AndroidManifest.xml`, add these permissions alongside the existing ones:

```xml
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
```

**Step 4: Install iOS pods**

Run: `cd ios && pod install && cd ..`

**Step 5: Commit**

```bash
git add package.json package-lock.json ios/BlueWallet/Info.plist android/app/src/main/AndroidManifest.xml ios/Podfile.lock
git commit -m "ADD: react-native-background-fetch for Arkade background sync"
```

---

### Task 3: Vendor Realm adapter schemas

**Files:**
- Create: `blue_modules/arkade-adapters/realm/schemas.ts`

**Step 1: Create directory structure**

Run: `mkdir -p blue_modules/arkade-adapters/realm`

**Step 2: Write schemas file**

Create `blue_modules/arkade-adapters/realm/schemas.ts` with the Realm object schemas from ts-sdk PR #318 and boltz-swap PR #80.

These schemas are prefixed with "Ark" and "Boltz" to avoid collisions with BlueWallet's existing Realm schemas (WalletTransactions, KeyValue, Cache).

```typescript
// Vendored from arkade-os/ts-sdk PR #318 and arkade-os/boltz-swap PR #80
// Remove this file once both PRs merge and import from packages directly.

export const ArkVtxoSchema = {
    name: 'ArkVtxo',
    primaryKey: 'pk',
    properties: {
        pk: 'string',
        address: { type: 'string', indexed: true },
        txid: 'string',
        vout: 'int',
        value: 'int',
        tapTree: 'string',
        forfeitCb: 'string',
        forfeitS: 'string',
        intentCb: 'string',
        intentS: 'string',
        extraWitnessJson: 'string?',
        statusJson: 'string',
        virtualStatusJson: 'string',
        spentBy: 'string?',
        settledBy: 'string?',
        arkTxId: 'string?',
        createdAt: 'string',
        isUnrolled: 'bool',
        isSpent: 'bool?',
        assetsJson: 'string?',
    },
} as const;

export const ArkUtxoSchema = {
    name: 'ArkUtxo',
    primaryKey: 'pk',
    properties: {
        pk: 'string',
        address: { type: 'string', indexed: true },
        txid: 'string',
        vout: 'int',
        value: 'int',
        tapTree: 'string',
        forfeitCb: 'string',
        forfeitS: 'string',
        intentCb: 'string',
        intentS: 'string',
        extraWitnessJson: 'string?',
        statusJson: 'string',
    },
} as const;

export const ArkTransactionSchema = {
    name: 'ArkTransaction',
    primaryKey: 'pk',
    properties: {
        pk: 'string',
        address: { type: 'string', indexed: true },
        boardingTxid: 'string',
        commitmentTxid: 'string',
        arkTxid: 'string',
        type: 'string',
        amount: 'int',
        settled: 'bool',
        createdAt: 'int',
        assetsJson: 'string?',
    },
} as const;

export const ArkWalletStateSchema = {
    name: 'ArkWalletState',
    primaryKey: 'key',
    properties: {
        key: 'string',
        lastSyncTime: 'int?',
        settingsJson: 'string?',
    },
} as const;

export const ArkContractSchema = {
    name: 'ArkContract',
    primaryKey: 'script',
    properties: {
        script: 'string',
        address: 'string',
        type: { type: 'string', indexed: true },
        state: { type: 'string', indexed: true },
        paramsJson: 'string',
        createdAt: 'int',
        expiresAt: 'int?',
        label: 'string?',
        metadataJson: 'string?',
    },
} as const;

export const BoltzSwapSchema = {
    name: 'BoltzSwap',
    primaryKey: 'id',
    properties: {
        id: 'string',
        type: 'string',
        status: 'string',
        createdAt: 'int',
        data: 'string',
    },
};

export const ArkRealmSchemas = [
    ArkVtxoSchema,
    ArkUtxoSchema,
    ArkTransactionSchema,
    ArkWalletStateSchema,
    ArkContractSchema,
];

export const BoltzRealmSchemas = [BoltzSwapSchema];

export const AllArkadeSchemas = [...ArkRealmSchemas, ...BoltzRealmSchemas];
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit blue_modules/arkade-adapters/realm/schemas.ts 2>&1 | head -20`
Expected: No errors (these are plain object literals)

**Step 4: Commit**

```bash
git add blue_modules/arkade-adapters/
git commit -m "ADD: vendored Realm schemas from upstream PRs ts-sdk#318 and boltz-swap#80"
```

---

### Task 4: Vendor Realm repository implementations

**Files:**
- Create: `blue_modules/arkade-adapters/realm/walletRepository.ts`
- Create: `blue_modules/arkade-adapters/realm/contractRepository.ts`
- Create: `blue_modules/arkade-adapters/realm/swapRepository.ts`
- Create: `blue_modules/arkade-adapters/realm/index.ts`
- Create: `blue_modules/arkade-adapters/index.ts`

**Step 1: Write walletRepository.ts**

Vendor from ts-sdk PR #318 `src/repositories/realm/walletRepository.ts`. This implements `WalletRepository` from `@arkade-os/sdk`. The constructor takes a Realm instance (typed as `any` since Realm is a peer dep). Uses `serializeVtxo`, `serializeUtxo`, `deserializeVtxo`, `deserializeUtxo` from `@arkade-os/sdk` (these are exported from the `next` package).

Key imports:
```typescript
import { type ArkTransaction, type ExtendedCoin, type ExtendedVirtualCoin } from '@arkade-os/sdk';
import type { WalletRepository, WalletState } from '@arkade-os/sdk';
import { serializeVtxo, serializeUtxo, deserializeVtxo, deserializeUtxo } from '@arkade-os/sdk';
```

Note: Check if the serialization helpers are actually exported from `@arkade-os/sdk@0.4.0-next.0`. If not, vendor them too. They use `@scure/base` hex encoding and `@scure/btc-signer` TaprootControlBlock.

**Step 2: Write contractRepository.ts**

Vendor from ts-sdk PR #318 `src/repositories/realm/contractRepository.ts`. Implements `ContractRepository` from `@arkade-os/sdk`.

**Step 3: Write swapRepository.ts**

Vendor from boltz-swap PR #80 `src/repositories/realm/swap-repository.ts`. Implements `SwapRepository` from `@arkade-os/boltz-swap`.

**Step 4: Write index.ts re-exports**

`blue_modules/arkade-adapters/realm/index.ts`:
```typescript
export { RealmWalletRepository } from './walletRepository';
export { RealmContractRepository } from './contractRepository';
export { RealmSwapRepository } from './swapRepository';
export { AllArkadeSchemas, ArkRealmSchemas, BoltzRealmSchemas } from './schemas';
```

`blue_modules/arkade-adapters/index.ts`:
```typescript
export * from './realm';
```

**Step 5: Verify imports resolve**

Run: `npx tsc --noEmit 2>&1 | grep arkade-adapters | head -20`
Expected: May show errors about `@arkade-os/sdk` import paths — check if `WalletRepository`, `ContractRepository`, `serializeVtxo` etc. are exported from the `next` package root or need subpath imports.

**Step 6: Commit**

```bash
git add blue_modules/arkade-adapters/
git commit -m "ADD: vendored Realm repository implementations from upstream PRs"
```

---

### Task 5: Create Realm instance manager for Ark

**Files:**
- Create: `blue_modules/arkade-adapters/realm/realmInstance.ts`

**Step 1: Write the Realm instance manager**

This creates and manages a dedicated Realm instance for Arkade data, separate from BlueWallet's existing Realm databases. Follow the pattern from `blue_modules/BlueElectrum.ts` (lazy singleton, encryption).

```typescript
import Realm from 'realm';
import { AllArkadeSchemas } from './schemas';
import RNFS from 'react-native-fs';

let _realm: Realm | undefined;
let _encryptionKey: ArrayBuffer | undefined;

export async function getArkadeRealm(): Promise<Realm> {
    if (_realm && !_realm.isClosed) return _realm;

    const path = `${RNFS.CachesDirectoryPath}/arkade.realm`;

    if (!_encryptionKey) {
        // Generate or retrieve encryption key from Keychain
        // Follow the pattern in class/blue-app.ts openRealmKeyValue()
        _encryptionKey = await getOrCreateEncryptionKey('arkade-realm-key');
    }

    _realm = await Realm.open({
        schema: AllArkadeSchemas,
        path,
        encryptionKey: _encryptionKey,
        schemaVersion: 1,
    });

    return _realm;
}

export function closeArkadeRealm(): void {
    if (_realm && !_realm.isClosed) {
        _realm.close();
        _realm = undefined;
    }
}
```

The `getOrCreateEncryptionKey` function should use `react-native-keychain` (already in the project) to store a random 64-byte key, following the pattern used in `class/blue-app.ts` for `openRealmKeyValue()`.

**Step 2: Commit**

```bash
git add blue_modules/arkade-adapters/realm/realmInstance.ts
git commit -m "ADD: Arkade Realm instance manager with encryption"
```

---

### Task 6: Write background task scheduler

**Files:**
- Create: `blue_modules/arkade-adapters/background/task-scheduler.ts`
- Create: `blue_modules/arkade-adapters/background/foreground-poller.ts`

**Step 1: Write task-scheduler.ts**

This wraps `react-native-background-fetch` to call `runTasks()` from the SDK.

Key design:
- Import `runTasks` from `@arkade-os/sdk` (check exact export path — likely `@arkade-os/sdk/worker/expo` despite the name)
- Import `AsyncStorageTaskQueue` from same path
- Import `contractPollProcessor` from SDK
- Import `swapsPollProcessor` from `@arkade-os/boltz-swap` (check export path — likely `@arkade-os/boltz-swap/expo`)
- Use `BackgroundFetch.configure()` with:
  - `minimumFetchInterval: 15`
  - `stopOnTerminate: false`
  - `startOnBoot: true`
  - `enableHeadless: true`
- In the task callback, reconstruct dependencies from persisted config, call `runTasks(queue, processors, deps)`, then `BackgroundFetch.finish(taskId)`

Important: The background task runs in a headless context (no React tree). Dependencies must be reconstructable from persisted config (wallet secret, server URLs). The `AsyncStorageTaskQueue` persists task items in AsyncStorage so they survive process death.

**Step 2: Write foreground-poller.ts**

Uses `setInterval` + `AppState` to poll when the app is in foreground:
- `startPolling(interval: number)` — starts setInterval calling `runTasks()`
- `stopPolling()` — clears interval
- Listens to `AppState` changes: pauses on background, resumes on foreground
- Processes results from the task queue outbox

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep -i background | head -20`

**Step 4: Commit**

```bash
git add blue_modules/arkade-adapters/background/
git commit -m "ADD: bare React Native background task scheduler and foreground poller"
```

---

### Task 7: Write unit tests for Realm repositories

**Files:**
- Create: `tests/unit/arkade-realm-repositories.test.ts`

**Step 1: Write tests for RealmWalletRepository**

Test plan:
- Create an in-memory Realm with `AllArkadeSchemas`
- Test VTXO save/get/delete cycle
- Test UTXO save/get/delete cycle
- Test transaction history save/get/delete
- Test wallet state save/get
- Test `clear()` removes all objects

Use the existing Realm mock pattern from `tests/setup.js` (line 226-231) or create a real in-memory Realm instance for integration-style tests.

**Step 2: Write tests for RealmContractRepository**

- Test contract save/get/delete
- Test filtering by type, state, script
- Test array filters

**Step 3: Write tests for RealmSwapRepository**

- Test swap save/get/delete
- Test `getAllSwaps()` with filters (id, status, type)
- Test ordering by createdAt (asc/desc)
- Test `clear()`

**Step 4: Run tests**

Run: `npm run unit -- --testPathPattern=arkade-realm`
Expected: All tests pass

**Step 5: Commit**

```bash
git add tests/unit/arkade-realm-repositories.test.ts
git commit -m "TST: unit tests for vendored Realm repositories"
```

---

### Task 8: Refactor LightningArkWallet — storage layer

**Files:**
- Modify: `class/wallets/lightning-ark-wallet.ts`
- Modify: `metro.config.js`

This is the core refactor. Change the wallet to use Realm repositories instead of AsyncStorage.

**Step 1: Update imports**

Replace:
```typescript
import { ArkadeLightning, BoltzSwapProvider, decodeInvoice, PendingReverseSwap, PendingSubmarineSwap } from '@arkade-os/boltz-swap';
import { SingleKey, VtxoManager, Ramps, Wallet, ExtendedCoin, ArkTransaction } from '@arkade-os/sdk';
import { ExpoArkProvider, ExpoIndexerProvider } from '@arkade-os/sdk/adapters/expo';
```

With:
```typescript
import { ArkadeSwaps, BoltzSwapProvider, decodeInvoice, migrateToSwapRepository } from '@arkade-os/boltz-swap';
import { SingleKey, VtxoManager, Ramps, Wallet, ExtendedCoin, ArkTransaction, RestArkProvider, RestIndexerProvider, migrateWalletRepository, requiresMigration, rollbackMigration } from '@arkade-os/sdk';
import { RealmWalletRepository, RealmContractRepository, RealmSwapRepository } from '../../blue_modules/arkade-adapters/realm';
import { getArkadeRealm } from '../../blue_modules/arkade-adapters/realm/realmInstance';
```

Note: `ArkadeLightning` is now `ArkadeSwaps` (PR #70 merged). Check the exact export name and constructor signature from `@arkade-os/boltz-swap@0.3.0-next.0`.

**Step 2: Replace ArkCustomStorage with Realm in init()**

Remove the `ArkCustomStorage` class (lines 108-124 of current file). Replace the `Wallet.create()` call:

Before:
```typescript
const wallet = await Wallet.create({
    storage,
    identity,
    arkProvider: new ExpoArkProvider(this._arkServerUrl),
    indexerProvider: new ExpoIndexerProvider(this._arkServerUrl),
    arkServerPublicKey: this._arkServerPublicKey,
});
```

After:
```typescript
const realm = await getArkadeRealm();
const walletRepository = new RealmWalletRepository(realm);
const contractRepository = new RealmContractRepository(realm);

const wallet = await Wallet.create({
    identity,
    arkProvider: new RestArkProvider(this._arkServerUrl),
    indexerProvider: new RestIndexerProvider(this._arkServerUrl),
    arkServerPublicKey: this._arkServerPublicKey,
    storage: { walletRepository, contractRepository },
});
```

**Step 3: Replace ArkadeLightning with ArkadeSwaps**

The `_arkadeLightning` field becomes `_arkadeSwaps` of type `ArkadeSwaps`. Update `_initLightningSwaps()`:

```typescript
const swapRepository = new RealmSwapRepository(realm);

this._arkadeSwaps = new ArkadeSwaps({
    wallet: this._wallet,
    swapProvider,
    swapRepository,
});
```

**Step 4: Update metro.config.js**

Remove the `@arkade-os/sdk/adapters/expo` alias (line 5) since we no longer use it. The `expo/fetch` alias may also be removable if nothing else uses it.

**Step 5: Update all references from _arkadeLightning to _arkadeSwaps**

Search and replace throughout the file. The API methods on `ArkadeSwaps` should be similar but check the new signatures:
- `sendLightningPayment` → check if still exists or renamed
- `createLightningInvoice` → check
- `getSwapHistory` → check
- `getPendingReverseSwaps` → check
- `claimVHTLC` → check

**Step 6: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -50`
Expected: Should compile (may have warnings)

**Step 7: Commit**

```bash
git add class/wallets/lightning-ark-wallet.ts metro.config.js
git commit -m "REF: replace AsyncStorage with Realm repositories in LightningArkWallet"
```

---

### Task 9: Add migration flow to LightningArkWallet.init()

**Files:**
- Modify: `class/wallets/lightning-ark-wallet.ts`

**Step 1: Keep legacy ArkCustomStorage as migration source**

Rename it to `ArkLegacyStorage` and keep it only for migration reads:

```typescript
class ArkLegacyStorage {
    constructor(private namespace: string) {}
    async getItem(key: string): Promise<string | null> {
        return await AsyncStorage.getItem(`${this.namespace}_${key}`);
    }
    async setItem(key: string, value: string): Promise<void> {
        return await AsyncStorage.setItem(`${this.namespace}_${key}`, value);
    }
    async removeItem(key: string): Promise<void> {
        await AsyncStorage.removeItem(`${this.namespace}_${key}`);
    }
}
```

**Step 2: Add migration logic to init()**

After creating the Realm repositories but before `Wallet.create()`:

```typescript
const legacyStorage = new ArkLegacyStorage(namespace);

// Migrate wallet data
const needsWalletMigration = await requiresMigration('wallet', legacyStorage);
if (needsWalletMigration) {
    try {
        const boardingAddress = await this._getBoardingAddressForMigration(identity);
        const arkAddress = await this._getArkAddressForMigration(identity);
        await migrateWalletRepository(legacyStorage, walletRepository, {
            onchain: [boardingAddress],
            offchain: [arkAddress],
        });
    } catch (error: any) {
        console.log('ARK wallet migration failed, rolling back:', error.message);
        await rollbackMigration('wallet', legacyStorage);
    }
}

// Migrate swap data
try {
    await migrateToSwapRepository(legacyStorage, swapRepository);
} catch (error: any) {
    console.log('ARK swap migration failed:', error.message);
}
```

Note: `_getBoardingAddressForMigration` and `_getArkAddressForMigration` need to derive addresses from the identity without a full wallet instance. Check if the SDK provides helpers, or derive them from the identity + ark server public key.

**Step 3: Commit**

```bash
git add class/wallets/lightning-ark-wallet.ts
git commit -m "ADD: migration flow from AsyncStorage to Realm in LightningArkWallet"
```

---

### Task 10: Replace manual background work with task processors

**Files:**
- Modify: `class/wallets/lightning-ark-wallet.ts`

**Step 1: Remove the setTimeout VTXO renewal block**

Remove lines 146-160 (the `setTimeout(async () => { ... VtxoManager ... })` block). This is now handled by `contractPollProcessor` in the task queue.

**Step 2: Remove _attemptToClaimPendingVHTLCs**

Remove the method (lines 312-338). This is now handled by `swapsPollProcessor`.

**Step 3: Remove _attemptBoardUtxos and boardingLock**

Remove the method (lines 480-505) and the `boardingLock` record (line 25). Boarding will be integrated into the task queue as a custom processor or kept as a simpler inline call.

Note: Boarding may need to stay as a foreground-only operation since it requires user awareness. Check if a `boardingProcessor` makes sense or if we should keep it inline in `fetchBalance()` but simplified.

**Step 4: Update fetchBalance()**

Remove calls to `_attemptToClaimPendingVHTLCs()` and `_attemptBoardUtxos()`. The task queue handles these now. Keep only the balance fetch:

```typescript
async fetchBalance(): Promise<void> {
    if (!this._wallet) await this.init();
    if (!this._wallet) throw new Error('Ark wallet not initialized');

    const balance = await this._wallet.getBalance();
    this._lastBalanceFetch = +new Date();
    this.balance = balance.available;
}
```

**Step 5: Commit**

```bash
git add class/wallets/lightning-ark-wallet.ts
git commit -m "REF: remove manual background work, use task processors"
```

---

### Task 11: Register background tasks at app level

**Files:**
- Create: `hooks/useArkadeBackgroundSync.ts`
- Modify: `App.tsx` or `components/Context/StorageProvider.tsx`

**Step 1: Create the useArkadeBackgroundSync hook**

This hook:
- Checks if any LightningArkWallet exists in the wallet list
- If yes, registers the background task and starts foreground polling
- If no, does nothing
- Cleans up on unmount

```typescript
import { useEffect, useRef } from 'react';
import { useStorage } from '../hooks/useStorage';
import { LightningArkWallet } from '../class/wallets/lightning-ark-wallet';
import { registerArkadeBackgroundTask, unregisterArkadeBackgroundTask } from '../blue_modules/arkade-adapters/background/task-scheduler';
import { startPolling, stopPolling } from '../blue_modules/arkade-adapters/background/foreground-poller';

export function useArkadeBackgroundSync() {
    const { wallets } = useStorage();
    const isRegistered = useRef(false);

    useEffect(() => {
        const hasArkWallet = wallets.some(w => w.type === LightningArkWallet.type);

        if (hasArkWallet && !isRegistered.current) {
            registerArkadeBackgroundTask();
            startPolling(30_000); // 30 second foreground polling
            isRegistered.current = true;
        }

        if (!hasArkWallet && isRegistered.current) {
            unregisterArkadeBackgroundTask();
            stopPolling();
            isRegistered.current = false;
        }
    }, [wallets]);
}
```

**Step 2: Use the hook in the app**

Add `useArkadeBackgroundSync()` to a top-level component that has access to the storage context (e.g., inside `StorageProvider` children or in `CompanionDelegates`).

**Step 3: Commit**

```bash
git add hooks/useArkadeBackgroundSync.ts
git commit -m "ADD: useArkadeBackgroundSync hook for background task registration"
```

---

### Task 12: Update test mocks and fix existing tests

**Files:**
- Modify: `tests/setup.js`
- Modify: `tests/integration/lightning-ark-wallet.test.ts`
- Modify: `tests/integration/import.test.ts`

**Step 1: Add mock for react-native-background-fetch**

In `tests/setup.js`:

```javascript
jest.mock('react-native-background-fetch', () => ({
    configure: jest.fn(),
    scheduleTask: jest.fn(),
    finish: jest.fn(),
    registerHeadlessTask: jest.fn(),
    stop: jest.fn(),
    start: jest.fn(),
    STATUS_AVAILABLE: 2,
    STATUS_DENIED: 1,
    STATUS_RESTRICTED: 0,
    FETCH_RESULT_NEW_DATA: 0,
    FETCH_RESULT_NO_DATA: 1,
    FETCH_RESULT_FAILED: 2,
}));
```

**Step 2: Update Realm mock if needed**

The existing Realm mock at line 226-231 of `tests/setup.js` may need updating to handle the new Arkade schemas. Check what's currently mocked and extend if necessary.

**Step 3: Update integration tests**

The `lightning-ark-wallet.test.ts` test needs updating for:
- New import paths (ArkadeSwaps instead of ArkadeLightning)
- Realm-based storage instead of AsyncStorage
- Updated wallet initialization

**Step 4: Run all tests**

Run: `npm run unit`
Expected: All tests pass

Run: `npm run lint`
Expected: No new lint errors

**Step 5: Commit**

```bash
git add tests/
git commit -m "TST: update test mocks and integration tests for Arkade next upgrade"
```

---

### Task 13: Update metro.config.js and jest.config.js

**Files:**
- Modify: `metro.config.js`
- Modify: `jest.config.js`

**Step 1: Update Metro aliases**

In `metro.config.js`, the `resolveAliases` object needs updating. Remove the expo adapter alias. Check if `react-native-background-fetch` needs any special Metro resolution.

If the SDK's `@arkade-os/sdk/worker/expo` path has issues with Metro (since the "expo" subpath might confuse the resolver), add an alias:

```javascript
const resolveAliases = {
    // Remove: '@arkade-os/sdk/adapters/expo': ...
    'expo/fetch': path.join(__dirname, 'util/expo-fetch.js'),
    // Add if needed for SDK worker imports:
    // '@arkade-os/sdk/worker/expo': path.join(__dirname, 'node_modules/@arkade-os/sdk/dist/cjs/worker/expo.js'),
};
```

**Step 2: Update Jest transformIgnorePatterns**

Ensure `react-native-background-fetch` is in the transform list in `jest.config.js`:

```javascript
transformIgnorePatterns: [..., 'react-native-background-fetch', ...]
```

**Step 3: Commit**

```bash
git add metro.config.js jest.config.js
git commit -m "REF: update Metro and Jest config for Arkade next packages"
```

---

### Task 14: Final verification

**Step 1: Run full lint**

Run: `npm run lint`
Expected: No errors

**Step 2: Run full test suite**

Run: `npm test`
Expected: All tests pass

**Step 3: TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Verify Metro bundles**

Run: `npx react-native start --reset-cache` (let it start, then Ctrl+C)
Expected: Metro starts without resolution errors

**Step 5: Fix any issues found**

Address any failures from steps 1-4.

**Step 6: Final commit if any fixes**

```bash
git add -A
git commit -m "FIX: address lint and type issues from Arkade upgrade"
```

---

## Execution Notes

### Import path verification

Before implementing Tasks 4 and 8, verify these exports exist in the `next` packages:

```bash
# Check SDK exports
node -e "const m = require('@arkade-os/sdk'); console.log(Object.keys(m).filter(k => k.includes('serialize') || k.includes('Repository') || k.includes('migrate') || k.includes('Rest')))"

# Check boltz-swap exports
node -e "const m = require('@arkade-os/boltz-swap'); console.log(Object.keys(m).filter(k => k.includes('Swap') || k.includes('migrate') || k.includes('Arkade')))"
```

### API surface changes

The `next` packages have breaking changes. Key ones to watch:
- `ArkadeLightning` → `ArkadeSwaps` (unified class)
- `Wallet.create()` config now uses `storage: { walletRepository, contractRepository }` instead of `storage: StorageAdapter`
- `ExpoArkProvider` / `ExpoIndexerProvider` → `RestArkProvider` / `RestIndexerProvider` for non-streaming use
- New `swapRepository` parameter on `ArkadeSwaps` constructor

### Vendored code cleanup

Once ts-sdk PR #318 and boltz-swap PR #80 are merged and published to `next`:
1. Delete `blue_modules/arkade-adapters/realm/` directory
2. Update imports to `@arkade-os/sdk/adapters/realm` and `@arkade-os/boltz-swap/adapters/realm`
3. Run tests to verify
