import { useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter, Linking, Platform } from 'react-native';
import QuickActions, { ShortcutItem } from 'react-native-quick-actions';
import DeeplinkSchemaMatch from '../class/deeplink-schema-match';
import { TWallet } from '../class/wallets/types';
import useOnAppLaunch from '../hooks/useOnAppLaunch';
import { formatBalance } from '../loc';
import { useSettings } from '../hooks/context/useSettings';
import { useStorage } from '../hooks/context/useStorage';
import { useExtendedNavigation } from './useExtendedNavigation';

const DeviceQuickActionsStorageKey = 'DeviceQuickActionsEnabled';

export async function setEnabled(enabled: boolean = true): Promise<void> {
  await AsyncStorage.setItem(DeviceQuickActionsStorageKey, JSON.stringify(enabled));
}

export async function getEnabled(): Promise<boolean> {
  try {
    const isEnabled = await AsyncStorage.getItem(DeviceQuickActionsStorageKey);
    if (isEnabled === null) {
      await setEnabled(true);
      return true;
    }
    return !!JSON.parse(isEnabled);
  } catch {
    return true;
  }
}

const useDeviceQuickActions = () => {
  const { wallets, walletsInitialized, isStorageEncrypted, addWallet, saveToDisk, setSharedCosigner } = useStorage();
  const { preferredFiatCurrency, isQuickActionsEnabled } = useSettings();
  const { isViewAllWalletsEnabled, getSelectedDefaultWallet } = useOnAppLaunch();
  const navigation = useExtendedNavigation();

  const handleOpenURL = useCallback(
    (event: { url: string }): void => {
      DeeplinkSchemaMatch.navigationRouteFor(event, (value: [string, any]) => navigation.navigate(...value), {
        wallets,
        addWallet,
        saveToDisk,
        setSharedCosigner,
      });
    },
    [wallets, addWallet, saveToDisk, setSharedCosigner, navigation],
  );

  const handleWalletQuickAction = useCallback(
    (data: any): void => {
      const urlParts = data.userInfo.url.split('wallet/');
      if (urlParts.length > 1) {
        const wallet = wallets.find(w => w.getID() === urlParts[1]);
        if (wallet) {
          navigation.navigate({
            name: 'WalletTransactions',
            params: {
              walletID: wallet.getID(),
              walletType: wallet.type,
            },
          });
        }
      }
    },
    [navigation, wallets],
  );

  const navigateToDefaultWallet = useCallback(async (): Promise<void> => {
    if (!(await isViewAllWalletsEnabled())) {
      const selectedDefaultWalletID = (await getSelectedDefaultWallet()) as string;
      const selectedDefaultWallet = wallets.find((w: TWallet) => w.getID() === selectedDefaultWalletID);
      if (selectedDefaultWallet) {
        navigation.navigate({
          name: 'WalletTransactions',
          params: {
            walletID: selectedDefaultWalletID,
            walletType: selectedDefaultWallet.type,
          },
        });
      }
    }
  }, [isViewAllWalletsEnabled, getSelectedDefaultWallet, wallets, navigation]);

  const handleInitialURL = useCallback(async (): Promise<void> => {
    const url = await Linking.getInitialURL();
    if (url) {
      if (DeeplinkSchemaMatch.hasSchema(url)) {
        handleOpenURL({ url });
      }
    } else {
      await navigateToDefaultWallet();
    }
  }, [handleOpenURL, navigateToDefaultWallet]);

  const walletQuickActions = useCallback(
    (data: { userInfo: { url: string } }): void => {
      const urlParts = data.userInfo.url.split('wallet/');
      if (urlParts.length > 1) {
        const wallet = wallets.find(w => w.getID() === urlParts[1]);
        if (wallet) {
          navigation.navigate({
            name: 'WalletTransactions',
            params: {
              walletID: wallet.getID(),
              walletType: wallet.type,
            },
          });
        }
      }
    },
    [navigation, wallets],
  );

  const setQuickActions = useCallback(async (): Promise<void> => {
    if (await getEnabled()) {
      QuickActions.isSupported((error: null, _supported: any) => {
        if (error === null) {
          const shortcutItems: ShortcutItem[] = wallets.slice(0, 4).map((wallet, index) => ({
            type: 'Wallets',
            title: wallet.getLabel(),
            subtitle:
              wallet.hideBalance || wallet.getBalance() <= 0
                ? ''
                : formatBalance(Number(wallet.getBalance()), wallet.getPreferredBalanceUnit(), true),
            userInfo: {
              url: `bluewallet://wallet/${wallet.getID()}`,
            },
            icon:
              Platform.select({
                android: 'quickactions',
                ios: index === 0 ? 'Favorite' : 'Bookmark',
              }) || 'quickactions',
          }));
          QuickActions.setShortcutItems(shortcutItems);
        }
      });
    } else {
      removeShortcuts();
    }
  }, [wallets]);

  useEffect(() => {
    if (walletsInitialized) {
      isStorageEncrypted()
        .then(value => {
          if (value) {
            removeShortcuts();
          } else {
            setQuickActions();
          }
        })
        .catch(() => removeShortcuts());
    }
  }, [wallets, walletsInitialized, preferredFiatCurrency, isStorageEncrypted, setQuickActions]);

  useEffect(() => {
    if (walletsInitialized) {
      DeviceEventEmitter.addListener('quickActionShortcut', walletQuickActions);
      popInitialShortcutAction().then(popInitialAction);
      return () => DeviceEventEmitter.removeAllListeners('quickActionShortcut');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletsInitialized, walletQuickActions]);

  useEffect(() => {
    if (walletsInitialized) {
      if (isQuickActionsEnabled) {
        setQuickActions();
      } else {
        removeShortcuts();
      }
    }
  }, [isQuickActionsEnabled, walletsInitialized, setQuickActions]);

  const popInitialShortcutAction = async (): Promise<any> => {
    try {
      const data = await QuickActions.popInitialAction();
      return data;
    } catch (error) {
      console.error('Error popping initial shortcut action:', error);
      return null;
    }
  };

  const popInitialAction = async (data: any): Promise<void> => {
    if (data) {
      handleWalletQuickAction(data);
    } else {
      await handleInitialURL();
    }
  };

  const removeShortcuts = async (): Promise<void> => {
    if (Platform.OS === 'android') {
      QuickActions.clearShortcutItems();
    } else {
      QuickActions.setShortcutItems([{ type: 'EmptyWallets', title: '', icon: 'quickactions', userInfo: { url: '' } }]);
    }
  };

  return { popInitialAction };
};

export default useDeviceQuickActions;
