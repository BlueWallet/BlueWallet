import { useCallback, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AbstractWallet } from '../class';
import { BlueStorageContext } from '../blue_modules/storage-context';

const useOnAppLaunch = () => {
  const STORAGE_KEY = 'ONAPP_LAUNCH_SELECTED_DEFAULT_WALLET_KEY';
  const { wallets } = useContext(BlueStorageContext);

  const getSelectedDefaultWallet = useCallback(async (): Promise<AbstractWallet | false> => {
    let selectedWallet: AbstractWallet | false = false;
    try {
      const selectedWalletID = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) || 'null');
      if (selectedWalletID) {
        selectedWallet = wallets.find((wallet: AbstractWallet) => wallet.getID() === selectedWalletID);
        if (!selectedWallet) {
          await AsyncStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (_e) {
      return false;
    }
    return selectedWallet;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [STORAGE_KEY]); // No external dependencies

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
  ); // Include dependencies here

  return {
    isViewAllWalletsEnabled,
    setViewAllWalletsEnabled,
    getSelectedDefaultWallet,
    setSelectedDefaultWallet,
  };
};

export default useOnAppLaunch;
