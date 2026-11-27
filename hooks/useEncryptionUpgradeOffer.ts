import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { useStorage } from './context/useStorage';
import { useExtendedNavigation } from './useExtendedNavigation';

/** Once per start of the app: "later" brings the offer back on the next one. */
let offeredThisRun = false;

/**
 * A moment after the home appears. Not "after interactions": the home keeps
 * animating until its balances load, which can take many seconds.
 */
export const OFFER_DELAY_MS = 800;

/**
 * H08 · When the unlock opened a bucket in the old CryptoJS format, opens the
 * encryption upgrade once the home is on screen.
 */
export function useEncryptionUpgradeOffer(): void {
  const { walletsInitialized, canUpgradeEncryption } = useStorage();
  const navigation = useExtendedNavigation();
  useFocusEffect(
    useCallback(() => {
      if (offeredThisRun || !walletsInitialized || !canUpgradeEncryption()) return;
      const timer = setTimeout(() => {
        if (offeredThisRun || !canUpgradeEncryption()) return;
        offeredThisRun = true;
        navigation.navigate('EncryptionUpgradeSheet');
      }, OFFER_DELAY_MS);
      return () => clearTimeout(timer);
    }, [walletsInitialized, canUpgradeEncryption, navigation]),
  );
}
