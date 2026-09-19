import { useEffect } from 'react';
import { Platform } from 'react-native';
import { clearReceiveAddressShortcutData, syncReceiveAddressShortcutWallets } from './receiveAddressShortcut';
import { useSettings } from '../hooks/context/useSettings';
import { useStorage } from '../hooks/context/useStorage';

/** Keeps the opt-in Keychain catalog up to date on iOS. */
const useReceiveAddressShortcut = (): void => {
  const { wallets, walletsInitialized, isStorageEncrypted } = useStorage();
  const { isReceiveAddressShortcutEnabled, setIsReceiveAddressShortcutEnabledStorage } = useSettings();

  useEffect(() => {
    if (Platform.OS !== 'ios' || !walletsInitialized || !isReceiveAddressShortcutEnabled) return;
    let current = true;

    (async () => {
      const storageEncrypted = await isStorageEncrypted();
      if (!current) return;
      if (storageEncrypted) {
        await setIsReceiveAddressShortcutEnabledStorage(false);
        await clearReceiveAddressShortcutData();
        return;
      }
      await syncReceiveAddressShortcutWallets(wallets, () => current);
    })().catch(error => {
      console.error('Failed to sync receive address shortcut wallets:', error);
    });
    return () => {
      current = false;
    };
  }, [wallets, walletsInitialized, isReceiveAddressShortcutEnabled, isStorageEncrypted, setIsReceiveAddressShortcutEnabledStorage]);
};

export default useReceiveAddressShortcut;
