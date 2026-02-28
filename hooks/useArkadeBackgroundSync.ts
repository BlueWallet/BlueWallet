import { useEffect, useRef, useCallback } from 'react';
import { useStorage } from './context/useStorage';
import { LightningArkWallet } from '../class/wallets/lightning-ark-wallet';
import { registerArkadeBackgroundTask, unregisterArkadeBackgroundTask } from '../blue_modules/arkade-adapters/background/task-scheduler';
import { startPolling, stopPolling } from '../blue_modules/arkade-adapters/background/foreground-poller';

export function useArkadeBackgroundSync() {
  const { wallets } = useStorage();
  const isRegistered = useRef(false);

  const taskFactory = useCallback(async () => {
    // Find an Ark wallet to get its task dependencies
    const arkWallet = wallets.find(w => w.type === LightningArkWallet.type) as LightningArkWallet | undefined;
    if (!arkWallet) throw new Error('No Ark wallet found');

    // Ensure wallet is initialized
    await arkWallet.init();

    // TODO: Wire up actual TaskQueue and TaskProcessors when SDK exposes them
    // For now, the background task will call wallet.fetchBalance() which handles
    // VTXO refresh and boarding internally
    return {
      queue: { tasks: [] } as any,
      processors: [],
      deps: {} as any,
    };
  }, [wallets]);

  useEffect(() => {
    const hasArkWallet = wallets.some(w => w.type === LightningArkWallet.type);

    if (hasArkWallet && !isRegistered.current) {
      registerArkadeBackgroundTask(taskFactory);
      startPolling(taskFactory);
      isRegistered.current = true;
    }

    if (!hasArkWallet && isRegistered.current) {
      unregisterArkadeBackgroundTask();
      stopPolling();
      isRegistered.current = false;
    }

    return () => {
      if (isRegistered.current) {
        unregisterArkadeBackgroundTask();
        stopPolling();
        isRegistered.current = false;
      }
    };
  }, [wallets, taskFactory]);
}
