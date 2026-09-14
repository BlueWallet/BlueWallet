import { useSyncExternalStore } from 'react';
import { isWalletSpotlightIndexing, subscribeToSpotlightIndexing } from '../blue_modules/spotlight-index-status';

const useIsWalletSpotlightIndexing = (walletID: string): boolean =>
  useSyncExternalStore(
    subscribeToSpotlightIndexing,
    () => isWalletSpotlightIndexing(walletID),
    () => false,
  );

export default useIsWalletSpotlightIndexing;
