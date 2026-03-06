import { useEffect, useRef, useCallback } from "react";
import { useStorage } from "./context/useStorage";
import { LightningArkWallet } from "../class/wallets/lightning-ark-wallet";
import {
  registerArkadeBackgroundTask,
  unregisterArkadeBackgroundTask,
} from "../blue_modules/arkade-adapters/background/task-scheduler";
import {
  startPolling,
  stopPolling,
} from "../blue_modules/arkade-adapters/background/foreground-poller";

export function useArkadeBackgroundSync() {
  const { wallets } = useStorage();
  const isRegistered = useRef(false);

  const syncAllArkWallets = useCallback(async () => {
    const arkWallets = wallets.filter(
      (w) => w.type === LightningArkWallet.type,
    ) as LightningArkWallet[];
    for (const wallet of arkWallets) {
      try {
        await wallet.init();
        await wallet.fetchBalance();
        await wallet.fetchTransactions();
      } catch (error) {
        console.log("[ArkadeSync] Sync error for wallet:", error);
      }
    }
  }, [wallets]);

  useEffect(() => {
    const hasArkWallet = wallets.some(
      (w) => w.type === LightningArkWallet.type,
    );

    if (hasArkWallet && !isRegistered.current) {
      registerArkadeBackgroundTask(syncAllArkWallets).catch((e) =>
        console.log("[ArkadeSync] Registration failed:", e),
      );
      startPolling(syncAllArkWallets);
      isRegistered.current = true;
    }

    if (!hasArkWallet && isRegistered.current) {
      unregisterArkadeBackgroundTask().catch((e) =>
        console.log("[ArkadeSync] Unregistration failed:", e),
      );
      stopPolling();
      isRegistered.current = false;
    }

    return () => {
      if (isRegistered.current) {
        unregisterArkadeBackgroundTask().catch((e) =>
          console.log("[ArkadeSync] Cleanup failed:", e),
        );
        stopPolling();
        isRegistered.current = false;
      }
    };
  }, [wallets, syncAllArkWallets]);
}
