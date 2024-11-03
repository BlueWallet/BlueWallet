import { useEffect, useCallback } from 'react';
import { CommonActions } from '@react-navigation/native';
import { DeviceEventEmitter, Linking, Platform } from 'react-native';
import QuickActions from 'react-native-quick-actions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeeplinkSchemaMatch from '../class/deeplink-schema-match';
import { TWallet } from '../class/wallets/types';
import useOnAppLaunch from './useOnAppLaunch';
import { formatBalance } from '../loc';
import * as NavigationService from '../NavigationService';
import { useSettings } from './context/useSettings';
import { useStorage } from './context/useStorage';

const DeviceQuickActionsStorageKey = 'DeviceQuickActionsEnabled';

export async function setEnabled(enabled: boolean = true): Promise<void> {
  try {
    await AsyncStorage.setItem(DeviceQuickActionsStorageKey, JSON.stringify(enabled));
  } catch (error) {
    console.error('Failed to set QuickActions enabled state:', error);
  }
}

export async function getEnabled(): Promise<boolean> {
  try {
    const isEnabled = await AsyncStorage.getItem(DeviceQuickActionsStorageKey);
    if (isEnabled === null) {
      await setEnabled(true);
      return true;
    }
    return !!JSON.parse(isEnabled);
  } catch (error) {
    console.error('Failed to get QuickActions enabled state:', error);
    return true;
  }
}

const useDeviceQuickActions = () => {
  const { wallets, walletsInitialized, isStorageEncrypted, addWallet, saveToDisk, setSharedCosigner } = useStorage();
  const { preferredFiatCurrency, isQuickActionsEnabled } = useSettings();
  const { isViewAllWalletsEnabled, getSelectedDefaultWallet } = useOnAppLaunch();

  const dispatchNavigate = useCallback((routeName: string, params?: object) => {
    NavigationService.dispatch(
      CommonActions.navigate({
        name: routeName,
        params,
      }),
    );
  }, []);

  const walletQuickActions = useCallback(
    (data: any): void => {
      try {
        const walletID = data?.userInfo?.url?.split('wallet/')[1];
        const wallet = wallets.find((w: { getID: () => any }) => w.getID() === walletID);
        if (wallet) {
          dispatchNavigate('WalletTransactions', {
            walletID: wallet.getID(),
            walletType: wallet.type,
          });
        }
      } catch (error) {
        console.error('Error handling wallet quick action:', error);
      }
    },
    [wallets, dispatchNavigate],
  );

  const handleOpenURL = useCallback(
    (event: { url: string }): void => {
      try {
        DeeplinkSchemaMatch.navigationRouteFor(event, (value: [string, any]) => NavigationService.navigate(...value), {
          wallets,
          addWallet,
          saveToDisk,
          setSharedCosigner,
        });
      } catch (error) {
        console.error('Error handling open URL:', error);
      }
    },
    [wallets, addWallet, saveToDisk, setSharedCosigner],
  );

  const popInitialShortcutAction = useCallback(async (): Promise<any> => {
    try {
      const data = await QuickActions.popInitialAction();
      return data;
    } catch (error) {
      console.error('Failed to pop initial shortcut action:', error);
      return null;
    }
  }, []);

  const popInitialAction = useCallback(
    async (data: any): Promise<void> => {
      try {
        if (data) {
          const walletID = data?.userInfo?.url?.split('wallet/')[1];
          const wallet = wallets.find((w: { getID: () => any }) => w.getID() === walletID);
          if (wallet) {
            dispatchNavigate('WalletTransactions', {
              walletID: wallet.getID(),
              walletType: wallet.type,
            });
          }
        } else {
          const url = await Linking.getInitialURL();
          if (url && DeeplinkSchemaMatch.hasSchema(url)) {
            handleOpenURL({ url });
          } else if (!(await isViewAllWalletsEnabled())) {
            const selectedDefaultWalletID = (await getSelectedDefaultWallet()) as string;
            const selectedDefaultWallet = wallets.find((w: TWallet) => w.getID() === selectedDefaultWalletID);
            if (selectedDefaultWallet) {
              dispatchNavigate('WalletTransactions', {
                walletID: selectedDefaultWalletID,
                walletType: selectedDefaultWallet.type,
              });
            }
          }
        }
      } catch (error) {
        console.error('Error processing initial shortcut action:', error);
      }
    },
    [wallets, dispatchNavigate, handleOpenURL, isViewAllWalletsEnabled, getSelectedDefaultWallet],
  );

  const removeShortcuts = useCallback(async (): Promise<void> => {
    try {
      if (Platform.OS === 'android') {
        QuickActions.clearShortcutItems();
      } else {
        // @ts-ignore: Property 'setShortcutItems' does not exist on type 'typeof QuickActions'
        QuickActions.setShortcutItems([{ type: 'EmptyWallets', title: '' }]);
      }
    } catch (error) {
      console.error('Failed to remove shortcuts:', error);
    }
  }, []);

  const setQuickActions = useCallback(async (): Promise<void> => {
    try {
      if (await getEnabled()) {
        QuickActions.isSupported((error: null, _supported: any) => {
          if (error === null) {
            const shortcutItems = wallets.slice(0, 4).map((wallet, index) => ({
              type: 'Wallets',
              title: wallet.getLabel(),
              subtitle:
                wallet.hideBalance || wallet.getBalance() <= 0
                  ? ''
                  : formatBalance(Number(wallet.getBalance()), wallet.getPreferredBalanceUnit(), true),
              userInfo: {
                url: `bluewallet://wallet/${wallet.getID()}`,
              },
              icon: Platform.select({ android: 'quickactions', ios: index === 0 ? 'Favorite' : 'Bookmark' }) || 'defaultIcon',
            }));
            QuickActions.setShortcutItems(shortcutItems);
          } else {
            console.error('QuickActions not supported:', error);
          }
        });
      } else {
        removeShortcuts();
      }
    } catch (error) {
      console.error('Failed to set QuickActions:', error);
    }
  }, [wallets, removeShortcuts]);

  useEffect(() => {
    const handleEncryptionStatus = async () => {
      try {
        const encrypted = await isStorageEncrypted();
        if (encrypted) {
          await removeShortcuts();
        } else {
          await setQuickActions();
        }
      } catch (error) {
        console.error('Error handling storage encryption:', error);
        await removeShortcuts();
      }
    };

    if (walletsInitialized) {
      handleEncryptionStatus();
    }
  }, [walletsInitialized, isStorageEncrypted, setQuickActions, removeShortcuts]);

  useEffect(() => {
    if (!walletsInitialized) {
      return;
    }

    let subscription: any = null;

    const addListeners = () => {
      subscription = DeviceEventEmitter.addListener('quickActionShortcut', walletQuickActions);
      popInitialShortcutAction().then(popInitialAction);
    };

    addListeners();

    return () => {
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      } else {
        DeviceEventEmitter.removeAllListeners('quickActionShortcut');
      }
    };
  }, [walletsInitialized, walletQuickActions, popInitialShortcutAction, popInitialAction]);

  useEffect(() => {
    const manageQuickActions = async () => {
      if (isQuickActionsEnabled && walletsInitialized) {
        await setQuickActions();
      } else if (walletsInitialized) {
        await removeShortcuts();
      }
    };

    manageQuickActions();
  }, [isQuickActionsEnabled, walletsInitialized, setQuickActions, removeShortcuts, preferredFiatCurrency]);
};

export default useDeviceQuickActions;