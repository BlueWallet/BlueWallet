import { useEffect, useState } from 'react';

import { LightningArkWallet } from '../class/wallets/lightning-ark-wallet';

/** True once an Arkade wallet's Lightning fees load; false otherwise, as the fee line they feed is optional. */
export const useArkFeesReady = (wallet: unknown): boolean => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(false);
    if (!(wallet instanceof LightningArkWallet)) return;
    let cancelled = false;
    wallet
      .ensureLightningFeesLoaded()
      .then(() => !cancelled && setReady(true))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [wallet]);
  return ready;
};
