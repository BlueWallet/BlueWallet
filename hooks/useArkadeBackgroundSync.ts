import { useEffect, useRef, useCallback } from 'react';
import { useStorage } from './context/useStorage';
import { LightningArkWallet } from '../class/wallets/lightning-ark-wallet';
import {
  registerArkadeBackgroundTask,
  unregisterArkadeBackgroundTask,
  type DepsFactory,
} from '../blue_modules/arkade-adapters/background/task-scheduler';
import { startPolling, stopPolling } from '../blue_modules/arkade-adapters/background/foreground-poller';
import type { SwapProcessorDeps } from '../blue_modules/arkade-adapters/background/swap-processor';
import type { TaskResult } from '@arkade-os/sdk/worker/expo';

export function useArkadeBackgroundSync() {
  const { wallets, saveToDisk } = useStorage();
  const isRegistered = useRef(false);

  /**
   * Build SwapProcessorDeps for each Ark wallet.
   * Called by the task scheduler on every background/foreground wake.
   */
  const buildDeps: DepsFactory = useCallback(async () => {
    const arkWallets = wallets.filter(w => w.type === LightningArkWallet.type) as LightningArkWallet[];
    const depsMap = new Map<string, SwapProcessorDeps>();

    for (const wallet of arkWallets) {
      try {
        await wallet.init();
        const walletDeps = wallet.getProcessorDeps();
        if (walletDeps) {
          depsMap.set(wallet.getNamespace(), walletDeps);
        }
      } catch (error) {
        console.log('[ArkadeSync] Failed to build deps for wallet:', error);
      }
    }

    return depsMap;
  }, [wallets]);

  /**
   * Reconcile the task queue: ensure every pending swap has a queued task,
   * and remove tasks for swaps that reached a final state.
   */
  const reconcile = useCallback(async () => {
    const arkWallets = wallets.filter(w => w.type === LightningArkWallet.type) as LightningArkWallet[];

    for (const wallet of arkWallets) {
      try {
        await wallet.init();
        await wallet.reconcileBackgroundTasks();
      } catch (error) {
        console.log('[ArkadeSync] Reconcile error:', error);
      }
    }
  }, [wallets]);

  /**
   * Handle outbox results — refresh wallet state and trigger notifications.
   * Also polls Ark balance on every tick to detect direct Ark address payments
   * (which don't go through the swap pipeline).
   */
  const handleResults = useCallback(
    (results: TaskResult[]) => {
      // Always refresh Ark wallets: direct Ark address payments don't produce
      // swap task results, so we poll balance on every foreground tick.
      const arkWallets = wallets.filter(w => w.type === LightningArkWallet.type) as LightningArkWallet[];
      for (const wallet of arkWallets) {
        wallet
          .fetchBalance()
          .then(() => wallet.fetchTransactions())
          .then(() => saveToDisk())
          .catch(e => console.log('[ArkadeSync] Refresh error:', e));
      }
    },
    [wallets, saveToDisk],
  );

  useEffect(() => {
    const hasArkWallet = wallets.some(w => w.type === LightningArkWallet.type);

    if (hasArkWallet && !isRegistered.current) {
      // Reconcile tasks on startup, then register background + foreground
      reconcile()
        .then(() => registerArkadeBackgroundTask(buildDeps))
        .catch(e => console.log('[ArkadeSync] Registration failed:', e));
      startPolling(handleResults);
      isRegistered.current = true;
    }

    if (!hasArkWallet && isRegistered.current) {
      unregisterArkadeBackgroundTask().catch(e => console.log('[ArkadeSync] Unregistration failed:', e));
      stopPolling();

      // Clean up all task queue entries for removed wallets
      const cleanup = async () => {
        // We don't know which namespace was removed, so clear all swap tasks
        // This is safe because we reconcile on next startup anyway
        const { swapTaskQueue } = await import('../blue_modules/arkade-adapters/background/swap-queue');
        await swapTaskQueue.clearTasks();
      };
      cleanup().catch(e => console.log('[ArkadeSync] Cleanup failed:', e));

      isRegistered.current = false;
    }

    return () => {
      if (isRegistered.current) {
        unregisterArkadeBackgroundTask().catch(e => console.log('[ArkadeSync] Cleanup failed:', e));
        stopPolling();
        isRegistered.current = false;
      }
    };
  }, [wallets, buildDeps, reconcile, handleResults]);
}
