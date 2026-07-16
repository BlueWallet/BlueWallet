// Background task module for Ark swap monitoring.
//
// Responsibilities:
// - Passive monitoring: poll Boltz swap status for non-terminal swaps in
//   every Ark wallet's per-wallet Realm and persist remote changes through
//   the SDK update helpers.
// - Post a local notification when an SDK predicate flags a swap as
//   claimable/refundable. No claim, refund, recover, or signing happens in
//   background — those remain foreground-only.
//
// State here is in-process: it survives configure→fetch→fetch ticks within a
// single JS runtime but is gone after process kill. Realm remains the
// durable source of truth for swap status and notification suppression.
import BackgroundFetch from 'react-native-background-fetch';

import {
  BoltzSwapProvider,
  isChainFinalStatus,
  isReverseFinalStatus,
  isSubmarineFinalStatus,
  updateChainSwapStatus,
  updateReverseSwapStatus,
  updateSubmarineSwapStatus,
} from '@arkade-os/boltz-swap';
import type { BoltzChainSwap, BoltzReverseSwap, BoltzSubmarineSwap, BoltzSwap } from '@arkade-os/boltz-swap';
import { RealmSwapRepository } from '@arkade-os/boltz-swap/repositories/realm';

import { BlueApp as BlueAppClass } from '../class/blue-app';
import { LightningArkWallet } from '../class/wallets/lightning-ark-wallet';
import { getArkadeRealm } from './arkade-adapters/realm/realmInstance';
import {
  RealmNotificationSuppressionRepository,
  type ArkSwapNotificationAction,
} from './arkade-adapters/realm/notificationSuppressionRepository';
import { notifyArkSwapActionable, resolveActionableAction } from './arkade-notifications';

const BlueApp = BlueAppClass.getInstance();

// Single shared provider. The constructor only stores config; it does not
// open sockets. Re-using one instance avoids per-poll allocation.
const swapProvider = new BoltzSwapProvider({ network: 'bitcoin' });
const DEFAULT_MAX_RUN_MS = 25_000;
let maxRunMs = DEFAULT_MAX_RUN_MS;

interface ArkTaskState {
  lastRegisteredAt: number | null;
  lastUnregisteredAt: number | null;
  lastRunStartedAt: number | null;
  lastRunFinishedAt: number | null;
  walletsScanned: number;
  swapsPolled: number;
  swapsUpdated: number;
  lastError: string | null;
  exitedDueToUnavailableStorage: boolean;
  availability: 'unknown' | 'available' | 'denied' | 'restricted';
  // Set whenever swapsUpdated is incremented. Used by reconcile() to detect
  // updates that crossed run boundaries (per-run swapsUpdated is reset).
  lastSwapUpdateAt: number;
  lastReconciledAt: number;
}

const state: ArkTaskState = {
  lastRegisteredAt: null,
  lastUnregisteredAt: null,
  lastRunStartedAt: null,
  lastRunFinishedAt: null,
  walletsScanned: 0,
  swapsPolled: 0,
  swapsUpdated: 0,
  lastError: null,
  exitedDueToUnavailableStorage: false,
  availability: 'unknown',
  lastSwapUpdateAt: 0,
  lastReconciledAt: 0,
};

// Per-wallet last-seen status cache. Outer key: wallet namespace; inner key:
// swap ID; value: last status this background module observed. Diagnostic +
// reconciliation hint only — Realm is durable.
const swapStatusCache: Map<string, Map<string, string>> = new Map();

// Per-poll last-seen actionable action keyed by `${namespace}:${swapId}`.
// Used to detect predicate flips (true → false or claim ↔ refund) so we can
// clear the corresponding Realm suppression row even when the swap status
// has not yet reached a terminal state. In-process only; cleared by
// stopArkBackgroundTask so a later run does not falsely diagnose a flip on
// the first poll after restart.
const lastSeenActionMap: Map<string, ArkSwapNotificationAction> = new Map();

let configured = false;
let running = false;
let cancelRequested = false;
let runDeadline: number | null = null;

export function getArkTaskState(): Readonly<ArkTaskState> {
  return Object.freeze({ ...state });
}

function recordError(message: string): void {
  state.lastError = message;
}

function shouldStopRun(): boolean {
  return cancelRequested || (runDeadline !== null && Date.now() >= runDeadline);
}

function remainingRunMs(): number {
  if (runDeadline === null) return maxRunMs;
  return Math.max(runDeadline - Date.now(), 0);
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error('deadline exceeded')), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function isFinalStatus(swap: BoltzSwap): boolean {
  switch (swap.type) {
    case 'reverse':
      return isReverseFinalStatus(swap.status);
    case 'submarine':
      return isSubmarineFinalStatus(swap.status);
    case 'chain':
      return isChainFinalStatus(swap.status);
  }
}

async function persistStatusChange(swap: BoltzSwap, newStatus: BoltzSwap['status'], repo: RealmSwapRepository): Promise<void> {
  if (swap.type === 'reverse') {
    await updateReverseSwapStatus(swap as BoltzReverseSwap, newStatus, s => repo.saveSwap(s));
  } else if (swap.type === 'submarine') {
    await updateSubmarineSwapStatus(swap as BoltzSubmarineSwap, newStatus, s => repo.saveSwap(s));
  } else {
    await updateChainSwapStatus(swap as BoltzChainSwap, newStatus, s => repo.saveSwap(s));
  }
}

async function pollSwap(
  swap: BoltzSwap,
  namespace: string,
  repo: RealmSwapRepository,
  suppression: RealmNotificationSuppressionRepository,
  walletID: string,
  walletLabel: string,
): Promise<void> {
  if (shouldStopRun()) return;

  state.swapsPolled += 1;
  let response;
  try {
    response = await withTimeout(swapProvider.getSwapStatus(swap.id), remainingRunMs());
  } catch (e: any) {
    recordError(`getSwapStatus(${swap.id}): ${e?.message ?? e}`);
    if (e?.message === 'deadline exceeded' || remainingRunMs() <= 0) cancelRequested = true;
    return;
  }

  if (shouldStopRun()) return;

  const remoteStatus = response.status;
  const statusChanged = remoteStatus !== swap.status;
  // The SDK update helpers (updateReverseSwapStatus etc.) save a copy and do
  // not mutate `swap`, so any post-persist predicate or terminal check on
  // `swap` would read the pre-update status. effectiveSwap carries the
  // status we want subsequent checks to evaluate against.
  const effectiveSwap: BoltzSwap = statusChanged ? ({ ...swap, status: remoteStatus } as BoltzSwap) : swap;

  if (statusChanged) {
    try {
      await persistStatusChange(swap, remoteStatus, repo);
    } catch (e: any) {
      recordError(`persistStatusChange(${swap.id}): ${e?.message ?? e}`);
      return;
    }

    state.swapsUpdated += 1;
    state.lastSwapUpdateAt = Date.now();
    let perWallet = swapStatusCache.get(namespace);
    if (!perWallet) {
      perWallet = new Map();
      swapStatusCache.set(namespace, perWallet);
    }
    perWallet.set(swap.id, remoteStatus);
  }

  // Actionable evaluation runs on every non-terminal poll, NOT only after a
  // status change. Otherwise a swap that became actionable in a previous run
  // but never received a successful post (notify failed mid-run, OS-level
  // drop, permission-denied skip, app cold-started with already-actionable
  // Realm state) would never be re-checked because subsequent polls observe
  // remoteStatus === swap.status and would otherwise exit. The Realm
  // suppression repo is the dedup layer.
  const lastKey = `${namespace}:${effectiveSwap.id}`;
  if (isFinalStatus(effectiveSwap)) {
    try {
      suppression.clearForSwap(effectiveSwap.id);
    } catch (e: any) {
      recordError(`suppression.clearForSwap(${effectiveSwap.id}): ${e?.message ?? e}`);
    }
    lastSeenActionMap.delete(lastKey);
    return;
  }

  const action = resolveActionableAction(effectiveSwap);
  const lastSeen = lastSeenActionMap.get(lastKey);
  if (lastSeen && lastSeen !== action) {
    // Predicate flipped out of `lastSeen` (either to null or to the other
    // action). Clear the stale suppression so the next observed flip back
    // re-fires.
    try {
      suppression.clearForSwapAction(effectiveSwap.id, lastSeen);
    } catch (e: any) {
      recordError(`suppression.clearForSwapAction(${effectiveSwap.id}): ${e?.message ?? e}`);
    }
  }

  if (action) {
    try {
      await notifyArkSwapActionable(effectiveSwap, suppression, walletID, walletLabel);
    } catch (e: any) {
      recordError(`notifyArkSwapActionable(${effectiveSwap.id}): ${e?.message ?? e}`);
    }
    lastSeenActionMap.set(lastKey, action);
  } else {
    lastSeenActionMap.delete(lastKey);
  }
}

async function processWallet(wallet: LightningArkWallet): Promise<void> {
  state.walletsScanned += 1;
  const namespace = wallet.getNamespace();
  const walletID = wallet.getID();
  const walletLabel = wallet.getLabel();

  let realm;
  try {
    realm = await getArkadeRealm(namespace);
  } catch (e: any) {
    // Most likely the Keychain is locked (WHEN_UNLOCKED_THIS_DEVICE_ONLY) or
    // the Realm file is unreachable. Either way the background task no-ops
    // for this wallet — claim/refund is foreground-only anyway.
    state.exitedDueToUnavailableStorage = true;
    recordError(`getArkadeRealm(${namespace}): ${e?.message ?? e}`);
    return;
  }

  let swaps: BoltzSwap[];
  const repo = new RealmSwapRepository(realm as any);
  const suppression = new RealmNotificationSuppressionRepository(realm);
  try {
    swaps = await repo.getAllSwaps<BoltzSwap>();
  } catch (e: any) {
    recordError(`getAllSwaps(${namespace}): ${e?.message ?? e}`);
    return;
  }

  for (const swap of swaps) {
    if (isFinalStatus(swap)) continue;
    if (shouldStopRun()) return;
    await pollSwap(swap, namespace, repo, suppression, walletID, walletLabel);
  }
}

export async function runArkBackgroundTask(taskId: string): Promise<void> {
  if (running) {
    BackgroundFetch.finish(taskId);
    return;
  }

  running = true;
  cancelRequested = false;
  runDeadline = Date.now() + maxRunMs;
  state.lastRunStartedAt = Date.now();
  state.walletsScanned = 0;
  state.swapsPolled = 0;
  state.swapsUpdated = 0;
  state.exitedDueToUnavailableStorage = false;

  try {
    const wallets = BlueApp.getWallets().filter((w): w is LightningArkWallet => w instanceof LightningArkWallet);
    if (wallets.length === 0) return;

    for (const wallet of wallets) {
      if (shouldStopRun()) break;
      try {
        await processWallet(wallet);
      } catch (e: any) {
        recordError(`processWallet: ${e?.message ?? e}`);
      }
    }
  } finally {
    state.lastRunFinishedAt = Date.now();
    runDeadline = null;
    cancelRequested = false;
    running = false;
    BackgroundFetch.finish(taskId);
  }
}

export function onArkBackgroundTaskTimeout(taskId: string): void {
  cancelRequested = true;
  state.lastError = 'timeout';
  state.lastRunFinishedAt = Date.now();
  BackgroundFetch.finish(taskId);
}

function availabilityFromStatus(status: number): ArkTaskState['availability'] {
  if (status === BackgroundFetch.STATUS_AVAILABLE) return 'available';
  if (status === BackgroundFetch.STATUS_DENIED) return 'denied';
  if (status === BackgroundFetch.STATUS_RESTRICTED) return 'restricted';
  return 'unknown';
}

export async function registerArkBackgroundTask(): Promise<void> {
  if (configured) {
    await BackgroundFetch.start();
    state.lastRegisteredAt = Date.now();
    return;
  }

  const config: Parameters<typeof BackgroundFetch.configure>[0] = {
    minimumFetchInterval: 15,
    stopOnTerminate: false,
    startOnBoot: true,
    enableHeadless: true,
    requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
  };

  try {
    const status = await BackgroundFetch.configure(config, runArkBackgroundTask, onArkBackgroundTaskTimeout);
    state.availability = availabilityFromStatus(status);
    if (state.availability === 'available') {
      configured = true;
      state.lastRegisteredAt = Date.now();
    } else {
      console.warn(`[ArkBackground] Background fetch unavailable: ${state.availability}`);
    }
  } catch (e: any) {
    recordError(`configure: ${e?.message ?? e}`);
  }
}

export async function stopArkBackgroundTask(): Promise<void> {
  cancelRequested = true;
  try {
    await BackgroundFetch.stop();
  } catch (e: any) {
    recordError(`stop: ${e?.message ?? e}`);
  }

  // Await in-flight run completion (draining). A live background run keeps
  // Detox's FabricTimersIdlingResource busy and disconnects the JS bridge.
  const start = Date.now();
  // eslint-disable-next-line no-unmodified-loop-condition
  while (running && Date.now() - start < 30_000) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  swapStatusCache.clear();
  // Clear in-process predicate-flip tracker so a later run does not
  // diagnose a flip on the first poll after restart. Persistent suppression
  // (Realm) is intentionally untouched — re-registering must keep history.
  lastSeenActionMap.clear();
  state.lastUnregisteredAt = Date.now();
}

export function reconcileArkBackgroundTaskResults(triggerRefreshForWallet: (walletId: string) => void): void {
  if (state.lastSwapUpdateAt <= state.lastReconciledAt) return;

  const wallets = BlueApp.getWallets().filter((w): w is LightningArkWallet => w instanceof LightningArkWallet);
  for (const wallet of wallets) {
    const namespace = wallet.getNamespace();
    const perWallet = swapStatusCache.get(namespace);
    if (perWallet && perWallet.size > 0) {
      triggerRefreshForWallet(wallet.getID());
    }
  }

  state.lastReconciledAt = Date.now();
}

// Exported for tests only.
export const __testing__ = {
  state,
  swapStatusCache,
  lastSeenActionMap,
  resetConfigured: (): void => {
    configured = false;
  },
  setMaxRunMs: (ms: number): void => {
    maxRunMs = ms;
  },
  reset: (): void => {
    state.lastRegisteredAt = null;
    state.lastUnregisteredAt = null;
    state.lastRunStartedAt = null;
    state.lastRunFinishedAt = null;
    state.walletsScanned = 0;
    state.swapsPolled = 0;
    state.swapsUpdated = 0;
    state.lastError = null;
    state.exitedDueToUnavailableStorage = false;
    state.availability = 'unknown';
    state.lastSwapUpdateAt = 0;
    state.lastReconciledAt = 0;
    swapStatusCache.clear();
    lastSeenActionMap.clear();
    configured = false;
    running = false;
    cancelRequested = false;
    runDeadline = null;
    maxRunMs = DEFAULT_MAX_RUN_MS;
  },
};
