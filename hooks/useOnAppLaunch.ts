import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStorage } from './context/useStorage';

const STORAGE_KEY = 'ONAPP_LAUNCH_SELECTED_DEFAULT_WALLET_KEY';

const useOnAppLaunch = () => {
  const { wallets, walletsInitialized } = useStorage();
  const [isViewAllWalletsEnabled, setIsViewAllWalletsEnabled] = useState<boolean>(true);
  const [selectedDefaultWallet, setSelectedDefaultWallet] = useState<string | undefined>(undefined);
  const [ready, setReady] = useState<boolean>(false);

  // Fetches the selected default wallet ID from AsyncStorage
  const getSelectedDefaultWallet = useCallback(async (): Promise<string | undefined> => {
    if (!walletsInitialized) return undefined;
    try {
      const selectedWalletID = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) || 'null');
      console.warn('selectedWalletID', selectedWalletID);
      if (selectedWalletID) {
        const wallet = wallets.find((w) => w.getID() === selectedWalletID);
        console.warn('wallet', wallet);
        if (wallet) return wallet.getID();
        await AsyncStorage.removeItem(STORAGE_KEY); // Remove if wallet no longer exists
      }
    } catch (error) {
      console.error('Error fetching selected default wallet:', error);
    }
    return undefined;
  }, [wallets, walletsInitialized]);

  // Sets the selected default wallet ID in AsyncStorage
  const setSelectedDefaultWalletStorage = useCallback(async (walletID: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(walletID));
      setSelectedDefaultWallet(walletID);
    } catch (error) {
      console.error('Error setting selected default wallet:', error);
    }
  }, []);

  // Checks if viewing all wallets is enabled based on AsyncStorage
  const getIsViewAllWalletsEnabled = useCallback(async (): Promise<boolean> => {
    if (!walletsInitialized) return undefined;

    try {
      const value = await AsyncStorage.getItem(STORAGE_KEY);
      return value === '' || value === null;
    } catch (error) {
      console.error('Error checking if view all wallets is enabled:', error);
      return true;
    }
  }, [walletsInitialized]);

  // Sets the "view all wallets" state and stores it in AsyncStorage
  const setViewAllWalletsEnabledStorage = useCallback(
    async (enabled: boolean): Promise<void> => {
      try {
        if (enabled) {
          await AsyncStorage.setItem(STORAGE_KEY, '');
          setIsViewAllWalletsEnabled(true);
          setSelectedDefaultWallet(undefined); // Clear default wallet
        } else {
          if (!selectedDefaultWallet && wallets.length > 0) {
            await setSelectedDefaultWalletStorage(wallets[0].getID()); // Set to the first wallet if none selected
          }
          setIsViewAllWalletsEnabled(false);
        }
      } catch (error) {
        console.error('Error setting view all wallets enabled:', error);
      }
    },
    [selectedDefaultWallet, wallets, setSelectedDefaultWalletStorage],
  );

  // Initializes the hook state on component mount
  useEffect(() => {
    const initialize = async () => {
      if (!walletsInitialized) return;
      const viewAllEnabled = await getIsViewAllWalletsEnabled();
      setIsViewAllWalletsEnabled(viewAllEnabled);

      if (!viewAllEnabled) {
        const walletID = await getSelectedDefaultWallet();
        setSelectedDefaultWallet(walletID);
      }
      
      setReady(true); // Mark initialization as complete
    };

    initialize();
  }, [getIsViewAllWalletsEnabled, getSelectedDefaultWallet, walletsInitialized]);

  return {
    ready, // Indicates if initialization is complete
    isViewAllWalletsEnabled,
    selectedDefaultWallet,
    setViewAllWalletsEnabledStorage,
    setSelectedDefaultWalletStorage,
  };
};

export default useOnAppLaunch;