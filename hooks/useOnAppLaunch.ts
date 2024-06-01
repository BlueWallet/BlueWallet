import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TWallet } from '../class/wallets/types';
import { useStorage } from './context/useStorage';

const useOnAppLaunch = () => {
  const STORAGE_KEY = 'ONAPP_LAUNCH_SELECTED_DEFAULT_WALLET_KEY';
  const { wallets } = useStorage();

  const getSelectedDefaultWallet = useCallback(async (): Promise<string | undefined> => {
    let selectedWallet: TWallet | undefined;
    try {
      const selectedWalletID = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) || 'null');
      if (selectedWalletID !== null) {
        selectedWallet = wallets.find((wallet: TWallet) => wallet.getID() === selectedWalletID);
        if (!selectedWallet) {
          await AsyncStorage.removeItem(STORAGE_KEY);
          return undefined;
        }
      } else {
        return undefined;
      }
    } catch (_e) {
      return undefined;
    }
    return selectedWallet.getID();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [STORAGE_KEY]);

  const setSelectedDefaultWallet = useCallback(
    async (value: string): Promise<void> => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    },
    [STORAGE_KEY],
  ); // No external dependencies

  const isViewAllWalletsEnabled = useCallback(async (): Promise<boolean> => {
    try {
      const selectedDefaultWallet = await AsyncStorage.getItem(STORAGE_KEY);
      return selectedDefaultWallet === '' || selectedDefaultWallet === null;
    } catch (_e) {
      return true;
    }
  }, [STORAGE_KEY]); // No external dependencies

  const setViewAllWalletsEnabled = useCallback(
    async (value: boolean): Promise<void> => {
      if (!value) {
        const selectedDefaultWallet = await getSelectedDefaultWallet();
        if (!selectedDefaultWallet) {
          const firstWallet = wallets[0];
          await setSelectedDefaultWallet(firstWallet.getID());
        }
      } else {
        await AsyncStorage.setItem(STORAGE_KEY, '');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [STORAGE_KEY, getSelectedDefaultWallet, setSelectedDefaultWallet],
  );

  return {
    isViewAllWalletsEnabled,
    setViewAllWalletsEnabled,
    getSelectedDefaultWallet,
    setSelectedDefaultWallet,
  };
};

export default useOnAppLaunch;
