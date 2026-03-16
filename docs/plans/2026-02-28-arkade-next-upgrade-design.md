# Arkade Next Upgrade: Realm Repositories + Background Sync

**Date:** 2026-02-28
**Status:** Approved

## Summary

Upgrade `@arkade-os/sdk` (0.3.12 → 0.4.0-next.0) and `@arkade-os/boltz-swap` (0.2.19 → 0.3.0-next.0) to adopt:
- Realm-based repositories replacing AsyncStorage JSON blobs
- Background task scheduling for VTXO renewal, swap processing, and balance sync
- Data migration from legacy storage to Realm

## Approach

**next packages + vendored Realm adapters + bare RN background wrapper**

Install the `next` prerelease packages. Copy Realm adapter code from the still-open upstream PRs (ts-sdk#318, boltz-swap#80) into the project since they haven't merged yet. Write a bare React Native background task wrapper to replace Expo-specific scheduling. Remove vendored code once upstream PRs merge.

## Package Changes

### Upgrade
- `@arkade-os/sdk`: 0.3.12 → 0.4.0-next.0
- `@arkade-os/boltz-swap`: 0.2.19 → 0.3.0-next.0

### Add
- `react-native-background-fetch` — OS-level background task scheduling (iOS BGTaskScheduler, Android JobScheduler)

### Keep
- `realm@20.1.0` — already installed

## Vendored Realm Adapters

```
blue_modules/arkade-adapters/
├── realm/
│   ├── walletRepository.ts     ← from ts-sdk#318
│   ├── contractRepository.ts   ← from ts-sdk#318
│   ├── schemas.ts              ← from ts-sdk#318
│   └── swapRepository.ts       ← from boltz-swap#80
├── background/
│   ├── task-scheduler.ts       ← react-native-background-fetch wrapper
│   └── foreground-poller.ts    ← setInterval-based foreground polling
└── index.ts
```

**Lifecycle:** Delete `realm/` directory once upstream PRs merge to `next`.

### Realm Schemas

New schemas added alongside BlueWallet's existing 3 schemas (WalletTransactions, KeyValue, Cache):
- `ArkWalletSchema` — VTXOs, UTXOs, wallet state, transaction history
- `ArkContractSchema` — Ark protocol contracts
- `BoltzSwapSchema` — swap data with indexed id, type, status, created_at + JSON data blob

Managed as a separate Realm instance (own file, own encryption key) to avoid coupling with BlueWallet's existing Realm databases.

## Background Task System

### Architecture

The upstream SDK (PRs #282, #291) provides a modular task system:
- `TaskQueue` interface + `AsyncStorageTaskQueue` — framework-agnostic
- `TaskProcessor` interface + `runTasks()` — framework-agnostic
- `contractPollProcessor` — polls for wallet state changes
- `swapsPollProcessor` (boltz-swap) — processes pending swaps

Only the scheduling wrappers are Expo-specific. We write bare RN equivalents.

### `task-scheduler.ts`

Uses `react-native-background-fetch`:
- Registers a headless task calling `runTasks()` from the SDK
- Minimum interval: 15 min (iOS constraint), configurable on Android
- Handles `BackgroundFetch.finish()` lifecycle
- `stopOnTerminate: false`, `startOnBoot: true`, `enableHeadless: true`

### `foreground-poller.ts`

Uses `setInterval` + `AppState` listener:
- Polls every 30-60 seconds when app is in foreground
- Processes task queue results (swap claims, VTXO renewals, balance)
- Pauses when app backgrounds, resumes on foreground
- Uses the same `TaskQueue` and `runTasks()` as background

### What runs in background

| Task | Processor | Priority |
|------|-----------|----------|
| VTXO renewal | `contractPollProcessor` | Critical — VTXOs expire |
| Swap claim/refund | `swapsPollProcessor` | Critical — funds at risk |
| Balance sync | Custom processor | Nice-to-have |

## LightningArkWallet Refactor

### Replace storage layer
- Remove `ArkCustomStorage` class (AsyncStorage wrapper)
- Use `RealmWalletRepository` + `RealmContractRepository` for `Wallet.create()`
- Use `RealmSwapRepository` for swap data

### Replace manual background work
- Remove `setTimeout` VTXO renewal → `contractPollProcessor` in task queue
- Remove `_attemptToClaimPendingVHTLCs` → `swapsPollProcessor`
- Remove `boardingLock` / `_attemptBoardUtxos` → integrate with task queue

### Update imports
- `ArkadeLightning` + `ArkadeChainSwap` → unified `ArkadeSwaps` (PR #70 merged)
- `ExpoArkProvider` / `ExpoIndexerProvider` → `RestArkProvider` / `RestIndexerProvider` (HTTP polling, no SSE needed for background tasks)

### Metro config
- Remove `@arkade-os/sdk/adapters/expo` alias
- Add alias for vendored Realm adapters if needed

## Storage Migration

Three sequential migrations run during `init()` for existing wallets:

### Wallet Data (AsyncStorage → Realm)
```
requiresMigration("wallet", legacyStorage) → true?
  → migrateWalletRepository(legacyStorage, realmWalletRepo, { onchain, offchain })
```
- SDK's `migrateWalletRepository()` handles in-progress recovery (crash-safe)
- Caller supplies boarding address (onchain) and Ark address (offchain)
- Sets "in-progress" → copies VTXOs, UTXOs, tx history → sets "done"
- Old data never deleted (safe rollback via `rollbackMigration()`)

### Contract Data (AsyncStorage → Realm)
- Manual migration — SDK doesn't manage contracts in v1
- Read from `ContractRepositoryImpl(legacyStorage)`, write to `RealmContractRepository`
- Track via custom key in legacy storage

### Swap Data (AsyncStorage → Realm)
```
migrateToSwapRepository(legacyStorage, realmSwapRepo)
```
- boltz-swap's `migrateToSwapRepository()` reads from `collection:reverseSwaps` and `collection:submarineSwaps`
- Simpler than wallet migration — no "in-progress" state, just "done" flag
- Returns `false` if no legacy data exists (fresh install)

### Migration order
Wallet → Contract → Swap (sequential to avoid partial state on failure)

### Legacy adapter
`ArkCustomStorage` kept as read-only `LegacyStorageAccessor` source during migration. All new reads/writes go through Realm after migration.

## App Lifecycle Integration

- Register background task at app startup (App.tsx or new hook)
- Start foreground polling when Ark wallet is active
- Clean up task registration on wallet deletion
- StorageProvider integration unchanged — LightningArkWallet serializes/deserializes through BlueApp

## Upstream PR Dependencies

| PR | Repo | Status | What we need from it |
|----|------|--------|---------------------|
| #316 | ts-sdk | Merged | Migration helpers, repository versioning |
| #282 | ts-sdk | Merged | MessageBus/MessageHandler architecture |
| #291 | ts-sdk | Merged | Expo background task (we adapt for bare RN) |
| #318 | ts-sdk | Open | Realm adapters (we vendor) |
| #60 | boltz-swap | Merged | ServiceWorker swap events |
| #72 | boltz-swap | Merged | Swaps processor for background |
| #70 | boltz-swap | Merged | Unified ArkadeSwaps |
| #80 | boltz-swap | Open | Realm swap adapter (we vendor) |
