import { useCallback, useRef, useState } from 'react';

import presentAlert, { AlertType } from '../components/Alert';
import { TWallet } from '../class/wallets/types';
import { useStorage } from './context/useStorage';

/**
 * Pull-to-refresh for one wallet: fetches its balance and transactions, and
 * saves only when either changed. A second pull while one runs is ignored.
 */
export function useWalletRefresh(wallet: TWallet): { refreshing: boolean; refresh: () => Promise<void> } {
  const { saveToDisk } = useStorage();
  const [refreshing, setRefreshing] = useState(false);
  const running = useRef(false);

  const refresh = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setRefreshing(true);
    try {
      const oldBalance = wallet.getBalance();
      const oldCount = wallet.getTransactions().length;
      await wallet.fetchBalance();
      await wallet.fetchTransactions();
      if (oldBalance !== wallet.getBalance() || oldCount !== wallet.getTransactions().length) await saveToDisk();
    } catch (err: any) {
      if (err?.message) presentAlert({ message: err.message, type: AlertType.Toast });
    } finally {
      running.current = false;
      setRefreshing(false);
    }
  }, [wallet, saveToDisk]);

  return { refreshing, refresh };
}
