import React, { useContext, useEffect } from 'react';
import QuickActions from 'react-native-quick-actions';
import { DeviceEventEmitter, Linking, Platform } from 'react-native';
import { formatBalance } from '../loc';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlueStorageContext } from '../blue_modules/storage-context';
import DeeplinkSchemaMatch from './deeplink-schema-match';
import OnAppLaunch from './on-app-launch';
import * as NavigationService from '../NavigationService';
import { CommonActions } from '@react-navigation/native';
import { AbstractWallet } from './wallets/abstract-wallet';

const DeviceQuickActionsStorageKey = 'DeviceQuickActionsEnabled';

function DeviceQuickActions(): JSX.Element | null {
  const { wallets, walletsInitialized, isStorageEncrypted, preferredFiatCurrency, addWallet, saveToDisk, setSharedCosigner } =
    useContext(BlueStorageContext);

  useEffect(() => {
    if (walletsInitialized) {
      isStorageEncrypted()
        .then((value: boolean | undefined | null) => {
          if (value) {
            removeShortcuts();
          } else {
            setQuickActions();
          }
        })
        .catch(() => removeShortcuts());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallets, walletsInitialized, preferredFiatCurrency, isStorageEncrypted]);

  useEffect(() => {
    if (walletsInitialized) {
      DeviceEventEmitter.addListener('quickActionShortcut', walletQuickActions);
      popInitialShortcutAction().then(popInitialAction);
      return () => DeviceEventEmitter.removeAllListeners('quickActionShortcut');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletsInitialized]);

  // @ts-ignore: Fix later
  DeviceQuickActions.setEnabled = async (enabled: boolean = true): Promise<void> => {
    await AsyncStorage.setItem(DeviceQuickActionsStorageKey, JSON.stringify(enabled));
    if (!enabled) {
      removeShortcuts();
    } else {
      setQuickActions();
    }
  };

  const popInitialShortcutAction = async (): Promise<any> => {
    const data = await QuickActions.popInitialAction();
    return data;
  };

  // @ts-ignore: Fix later
  DeviceQuickActions.getEnabled = async (): Promise<boolean> => {
    try {
      const isEnabled = await AsyncStorage.getItem(DeviceQuickActionsStorageKey);
      if (isEnabled === null) {
        // @ts-ignore: Fix later
        await DeviceQuickActions.setEnabled(true);
        return true;
      }
      return !!JSON.parse(isEnabled);
    } catch {
      return true;
    }
  };

  const popInitialAction = async (data: any): Promise<void> => {
    if (data) {
      const wallet = wallets.find((w: { getID: () => any }) => w.getID() === data.userInfo.url.split('wallet/')[1]);
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
    } else {
      const url = await Linking.getInitialURL();
      if (url) {
        if (DeeplinkSchemaMatch.hasSchema(url)) {
          handleOpenURL({ url });
        }
      } else {
        const isViewAllWalletsEnabled = await OnAppLaunch.isViewAllWalletsEnabled();
        if (!isViewAllWalletsEnabled) {
          const selectedDefaultWallet: AbstractWallet = (await OnAppLaunch.getSelectedDefaultWallet()) as AbstractWallet;
          if (selectedDefaultWallet) {
            const wallet = wallets.find((w: AbstractWallet) => w.getID() === selectedDefaultWallet.getID());
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
    }
  };

  const handleOpenURL = (event: { url: string }): void => {
    DeeplinkSchemaMatch.navigationRouteFor(event, (value: any) => NavigationService.navigate(...value), {
      wallets,
      addWallet,
      saveToDisk,
      setSharedCosigner,
    });
  };

  const walletQuickActions = (data: any): void => {
    const wallet = wallets.find((w: { getID: () => any }) => w.getID() === data.userInfo.url.split('wallet/')[1]);
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
    // @ts-ignore: Fix later
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
          // @ts-ignore: Fix later
          QuickActions.setShortcutItems(shortcutItems);
        }
      });
    } else {
      removeShortcuts();
    }
  };

  return <></>;
}

export default DeviceQuickActions;
