import { useEffect, useRef, useState } from 'react';
import { useStorage } from './context/useStorage';
import { TWallet } from '../class/wallets/types';

/**
 * A React hook that subscribes to wallet data changes (e.g. new transactions fetched)
 * and triggers a re-render while returning a stable wallet reference.
 */
const useWalletSubscribe = (walletID: string): TWallet => {
  const { wallets } = useStorage();

  const previousWallet = useRef<TWallet | undefined>();
  const origWallet = wallets.find(w => w.getID() === walletID) ?? previousWallet.current;
  if (!origWallet) {
    throw new Error(`Wallet with ID ${walletID} not found`);
  }
  previousWallet.current = origWallet;

  // Track lastTxFetch to trigger re-renders when wallet data changes,
  // without changing the wallet object reference.
  const [, setLastTxFetch] = useState(origWallet.getLastTxFetch());

  useEffect(() => {
    const interval = setInterval(() => {
      const current = origWallet.getLastTxFetch();
      setLastTxFetch(prev => (prev === current ? prev : current));
    }, 1000);

    return () => clearInterval(interval);
  }, [origWallet]);

  return origWallet;
};

export default useWalletSubscribe;
