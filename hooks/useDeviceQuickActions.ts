import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';
import { DeviceEventEmitter, Linking, Platform } from 'react-native';
import QuickActions, { ShortcutItem } from 'react-native-quick-actions';
import DeeplinkSchemaMatch from '../class/deeplink-schema-match';
import { showFilePickerAndReadFile } from '../blue_modules/fs';
import { setAvailableRecentWalletIDs, setHiddenRecentWalletIDs, setRecentMenuItemsEnabled } from '../components/Context/recentMenuItems';
import { formatBalance } from '../loc';
import * as NavigationService from '../NavigationService';
import { useSettings } from '../hooks/context/useSettings';
import { useStorage } from '../hooks/context/useStorage';
import { setNativeMenuWalletsInitialized, setNativeOpenFileHandler } from './useMenuActions.native';

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
  const [isEnabled, setIsEnabled] = useState<boolean | undefined>();

  useEffect(() => {
    setNativeMenuWalletsInitialized(walletsInitialized);
    return () => setNativeMenuWalletsInitialized(false);
  }, [walletsInitialized]);

  useEffect(() => {
    if (!walletsInitialized) return;
    setAvailableRecentWalletIDs(new Set(wallets.map(wallet => wallet.getID())));
    const hiddenWalletIDs = new Set(wallets.filter(wallet => wallet.getHideTransactionsInWalletsList?.()).map(wallet => wallet.getID()));
    setHiddenRecentWalletIDs(hiddenWalletIDs);
  }, [wallets, walletsInitialized]);

  useEffect(() => {
    if (isEnabled === undefined) return;
    setRecentMenuItemsEnabled(isEnabled).catch(error => console.warn('Failed to update native menu history privacy:', error));
  }, [isEnabled]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([isStorageEncrypted(), getEnabled()])
      .then(([storageIsEncrypted, storedEnabled]) => {
        if (cancelled) return;
        const enabled = !storageIsEncrypted && isQuickActionsEnabled && storedEnabled;
        setIsEnabled(enabled);
        if (enabled && walletsInitialized) setQuickActions();
        else removeShortcuts();
      })
      .catch(() => {
        if (cancelled) return;
        setIsEnabled(false);
        removeShortcuts();
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallets, walletsInitialized, preferredFiatCurrency, isQuickActionsEnabled, isStorageEncrypted]);

  useEffect(() => {
    if (walletsInitialized) {
      DeviceEventEmitter.addListener('quickActionShortcut', walletQuickActions);
      popInitialShortcutAction()
        .then(popInitialAction)
        .catch(error => {
          console.error('Failed to process initial quick action:', error);
        });
      return () => DeviceEventEmitter.removeAllListeners('quickActionShortcut');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletsInitialized]);

  const popInitialShortcutAction = async (): Promise<any> => {
    const data = await QuickActions.popInitialAction();
    return data;
  };

  const popInitialAction = async (data: any): Promise<void> => {
    try {
      if (data) {
        const wallet = wallets.find(w => w.getID() === data.userInfo.url.split('wallet/')[1]);
        if (wallet) {
          NavigationService.dispatch(
            CommonActions.navigate({
              name: 'WalletTransactions',
              params: {
                walletID: wallet.getID(),
                walletType: wallet.type,
              },
            }),
          );
        }
      } else {
        const url = await Linking.getInitialURL();
        if (url && DeeplinkSchemaMatch.hasSchema(url)) {
          handleOpenURL({ url });
        }
      }
    } catch (error) {
      console.error('Failed to handle initial quick action/deeplink:', error);
    }
  };

  const handleOpenURL = useCallback(
    (event: { url: string }): void => {
      DeeplinkSchemaMatch.navigationRouteFor(event, (value: [string, any]) => NavigationService.navigate(...value), {
        wallets,
        addWallet,
        saveToDisk,
        setSharedCosigner,
      });
    },
    [wallets, addWallet, saveToDisk, setSharedCosigner],
  );

  useEffect(() => {
    if (!walletsInitialized) return;
    setNativeOpenFileHandler(async () => {
      const { data, uri } = await showFilePickerAndReadFile();
      const fileUrl = uri && /\.(psbt|bwcosigner)$/i.test(uri) ? uri : data;
      if (fileUrl) handleOpenURL({ url: fileUrl });
    });
    return () => setNativeOpenFileHandler(undefined);
  }, [handleOpenURL, walletsInitialized]);

  const walletQuickActions = (data: any): void => {
    const wallet = wallets.find(w => w.getID() === data.userInfo.url.split('wallet/')[1]);
    if (wallet) {
      NavigationService.dispatch(
        CommonActions.navigate({
          name: 'WalletTransactions',
          params: {
            walletID: wallet.getID(),
            walletType: wallet.type,
          },
        }),
      );
    }
  };

  const removeShortcuts = async (): Promise<void> => {
    if (Platform.OS === 'android') {
      QuickActions.clearShortcutItems();
    } else {
      // @ts-ignore: Fix later
      QuickActions.setShortcutItems([{ type: 'EmptyWallets', title: '' }]);
    }
  };

  const setQuickActions = async (): Promise<void> => {
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
  };

  return { popInitialAction, isEnabled };
};

export default useDeviceQuickActions;
