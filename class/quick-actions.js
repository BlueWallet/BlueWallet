import QuickActions from 'react-native-quick-actions';
import { DeviceEventEmitter, Linking, Platform } from 'react-native';
import { formatBalance } from '../loc';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useContext, useEffect } from 'react';
import { BlueStorageContext } from '../blue_modules/storage-context';
import DeeplinkSchemaMatch from './deeplink-schema-match';
import OnAppLaunch from './on-app-launch';
import * as NavigationService from '../NavigationService';
import { CommonActions } from '@react-navigation/native';

function DeviceQuickActions() {
  DeviceQuickActions.STORAGE_KEY = 'DeviceQuickActionsEnabled';
  const { wallets, walletsInitialized, isStorageEncrypted, preferredFiatCurrency, addWallet, saveToDisk, setSharedCosigner } =
    useContext(BlueStorageContext);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallets, walletsInitialized, preferredFiatCurrency]);

  useEffect(() => {
    if (walletsInitialized) {
      DeviceEventEmitter.addListener('quickActionShortcut', walletQuickActions);
      DeviceQuickActions.popInitialAction().then(popInitialAction);
      return () => DeviceEventEmitter.removeListener('quickActionShortcut', walletQuickActions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletsInitialized]);

  DeviceQuickActions.setEnabled = (enabled = true) => {
    return AsyncStorage.setItem(DeviceQuickActions.STORAGE_KEY, JSON.stringify(enabled)).then(() => {
      if (!enabled) {
        removeShortcuts();
      } else {
        setQuickActions();
      }
    });
  };

  DeviceQuickActions.popInitialAction = async () => {
    const data = await QuickActions.popInitialAction();
    return data;
  };

  DeviceQuickActions.getEnabled = async () => {
    try {
      const isEnabled = await AsyncStorage.getItem(DeviceQuickActions.STORAGE_KEY);
      if (isEnabled === null) {
        await DeviceQuickActions.setEnabled(JSON.stringify(true));
        return true;
      }
      return !!JSON.parse(isEnabled);
    } catch {
      return true;
    }
  };

  const popInitialAction = async data => {
    if (data) {
      const wallet = wallets.find(w => w.getID() === data.userInfo.url.split('wallet/')[1]);
      NavigationService.dispatch(
        CommonActions.navigate({
          name: 'WalletTransactions',
          key: `WalletTransactions-${wallet.getID()}`,
          params: {
            walletID: wallet.getID(),
            walletType: wallet.type,
          },
        }),
      );
    } else {
      const url = await Linking.getInitialURL();
      if (url) {
        if (DeeplinkSchemaMatch.hasSchema(url)) {
          handleOpenURL({ url });
        }
      } else {
        const isViewAllWalletsEnabled = await OnAppLaunch.isViewAllWalletsEnabled();
        if (!isViewAllWalletsEnabled) {
          const selectedDefaultWallet = await OnAppLaunch.getSelectedDefaultWallet();
          const wallet = wallets.find(w => w.getID() === selectedDefaultWallet.getID());
          if (wallet) {
            NavigationService.dispatch(
              CommonActions.navigate({
                name: 'WalletTransactions',
                key: `WalletTransactions-${wallet.getID()}`,
                params: {
                  walletID: wallet.getID(),
                  walletType: wallet.type,
                },
              }),
            );
          }
        }
      }
    }
  };

  const handleOpenURL = event => {
    DeeplinkSchemaMatch.navigationRouteFor(event, value => NavigationService.navigate(...value), {
      wallets,
      addWallet,
      saveToDisk,
      setSharedCosigner,
    });
  };

  const walletQuickActions = data => {
    const wallet = wallets.find(w => w.getID() === data.userInfo.url.split('wallet/')[1]);
    NavigationService.dispatch(
      CommonActions.navigate({
        name: 'WalletTransactions',
        key: `WalletTransactions-${wallet.getID()}`,
        params: {
          walletID: wallet.getID(),
          walletType: wallet.type,
        },
      }),
    );
  };

  const removeShortcuts = async () => {
    if (Platform.OS === 'android') {
      QuickActions.clearShortcutItems();
    } else {
      /* iOS has a bug where if you nil the array or send an empty one it will restore the previous array on device reboot. */
      QuickActions.setShortcutItems([
        {
          type: 'EmptyWallets', // Required
          title: '',
        },
      ]);
    }
  };

  const setQuickActions = async () => {
    if (await DeviceQuickActions.getEnabled()) {
      QuickActions.isSupported((error, _supported) => {
        if (error === null) {
          const shortcutItems = [];
          for (const wallet of wallets.slice(0, 4)) {
            shortcutItems.push({
              type: 'Wallets', // Required
              title: wallet.getLabel(), // Optional, if empty, `type` will be used instead
              subtitle:
                wallet.hideBalance || wallet.getBalance() <= 0
                  ? ''
                  : formatBalance(Number(wallet.getBalance()), wallet.getPreferredBalanceUnit(), true),
              userInfo: {
                url: `bluewallet://wallet/${wallet.getID()}`, // Provide any custom data like deep linking URL
              },
              icon: Platform.select({ android: 'quickactions', ios: 'bookmark' }),
            });
          }
          QuickActions.setShortcutItems(shortcutItems);
        }
      });
    } else {
      removeShortcuts();
    }
  };

  return null;
}

export default DeviceQuickActions;
