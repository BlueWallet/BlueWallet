import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AbstractWallet } from '../class';
const BlueApp = require('../BlueApp');

const useOnAppLaunch = () => {
  const STORAGE_KEY = 'ONAPP_LAUNCH_SELECTED_DEFAULT_WALLET_KEY';

  const getSelectedDefaultWallet = useCallback(async (): Promise<AbstractWallet | false> => {
    let selectedWallet: AbstractWallet | false = false;
    try {
      const selectedWalletID = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) || 'null');
      if (selectedWalletID) {
        selectedWallet = BlueApp.getWallets().find((wallet: AbstractWallet) => wallet.getID() === selectedWalletID);
        if (!selectedWallet) {
          await AsyncStorage.setItem(STORAGE_KEY, '');
        }
      }
    } catch (_e) {
      return false;
    }
    return selectedWallet;
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
          const firstWallet = BlueApp.getWallets()[0];
          await setSelectedDefaultWallet(firstWallet.getID());
        }
      } else {
        await AsyncStorage.setItem(STORAGE_KEY, '');
      }
    },
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
