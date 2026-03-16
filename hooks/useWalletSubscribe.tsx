import { useEffect, useMemo, useRef, useState } from 'react';
import { useStorage } from './context/useStorage';
import { TWallet } from '../class/wallets/types';

/**
 * A React hook that provides a proxied wallet instance that automatically updates when new transactions are fetched.
 */
const useWalletSubscribe = (walletID: string): TWallet => {
  const { wallets } = useStorage();

  // get wallet by ID or used cached wallet
  const previousWallet = useRef<TWallet | undefined>();
  const origWallet = wallets.find(w => w.getID() === walletID) ?? previousWallet.current;
  if (!origWallet) {
    throw new Error(`Wallet with ID ${walletID} not found`);
  }
  previousWallet.current = origWallet;

  const [lastTxFetch, setLastTxFetch] = useState(origWallet.getLastTxFetch());

  const walletProxy = useMemo(() => {
    return new Proxy(origWallet, {});
    // force update when lastTxFetch changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastTxFetch, origWallet]);

  // check every second for getLastTxFetch
  useEffect(() => {
    const interval = setInterval(() => {
      setLastTxFetch(origWallet.getLastTxFetch());
    }, 1000);

    return () => clearInterval(interval);
  }, [origWallet]);

  return walletProxy;
};

export default useWalletSubscribe;
