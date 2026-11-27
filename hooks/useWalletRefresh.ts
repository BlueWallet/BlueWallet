import { useCallback, useRef, useState } from 'react';

import presentAlert, { AlertType } from '../components/Alert';
import { isReportedSaveError } from '../class/storage-errors';
import { TWallet } from '../class/wallets/types';
import { useStorage } from './context/useStorage';

/** The part of the balance on silent payment addresses (ECDSA wallets), which the home breaks down. */
const silentOf = (wallet: TWallet): bigint =>
  'getSilentBalance' in wallet && typeof wallet.getSilentBalance === 'function' ? wallet.getSilentBalance() : 0n;

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
      const oldSilent = silentOf(wallet);
      const oldCount = wallet.getTransactions().length;
      await wallet.fetchBalance();
      await wallet.fetchTransactions();
      const changed = oldBalance !== wallet.getBalance() || oldSilent !== silentOf(wallet) || oldCount !== wallet.getTransactions().length;
      if (changed) await saveToDisk();
    } catch (err: any) {
      if (err?.message && !isReportedSaveError(err)) presentAlert({ message: err.message, type: AlertType.Toast });
    } finally {
      running.current = false;
      setRefreshing(false);
    }
  }, [wallet, saveToDisk]);

  return { refreshing, refresh };
}
