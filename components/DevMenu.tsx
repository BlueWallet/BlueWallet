import React, { useEffect } from 'react';
import { DevSettings, Alert, Platform, AlertButton } from 'react-native';
import { useStorage } from '../hooks/context/useStorage';
import { HDSegwitBech32Wallet, WatchOnlyWallet } from '../class';
import Clipboard from '@react-native-clipboard/clipboard';
import { TWallet } from '../class/wallets/types';
import { navigationRef } from '../NavigationService';
import {
  setCoinControlSampleDataEnabled,
  setPaymentCodesSampleDataEnabled,
  setSendDetailsSampleDataEnabled,
  setWalletsListSampleDataEnabled,
  setWalletTransactionsSampleDataEnabled,
} from '../blue_modules/devMenuSampleData';

const getRandomLabelFromSecret = (secret: string): string => {
  const words = secret.split(' ');
  const firstWord = words[0];
  const lastWord = words[words.length - 1];
  return `[Developer] ${firstWord} ${lastWord}`;
};

const showAlertWithWalletOptions = (
  wallets: TWallet[],
  title: string,
  message: string,
  onWalletSelected: (wallet: TWallet) => void,
  filterFn?: (wallet: TWallet) => boolean,
) => {
  const filteredWallets = filterFn ? wallets.filter(filterFn) : wallets;

  const showWallet = (index: number) => {
    if (index >= filteredWallets.length) return;
    const wallet = filteredWallets[index];

    if (Platform.OS === 'android') {
      // Android: Use a limited number of buttons since the alert dialog has a limit
      Alert.alert(
        `${title}: ${wallet.getLabel()}`,
        `${message}\n\nSelected Wallet: ${wallet.getLabel()}\n\nWould you like to select this wallet or see the next one?`,
        [
          {
            text: 'Select This Wallet',
            onPress: () => onWalletSelected(wallet),
          },
          {
            text: 'Show Next Wallet',
            onPress: () => showWallet(index + 1),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ],
        { cancelable: true },
      );
    } else {
      const options: AlertButton[] = filteredWallets.map(w => ({
        text: w.getLabel(),
        onPress: () => onWalletSelected(w),
      }));

      options.push({
        text: 'Cancel',
        style: 'cancel',
      });

      Alert.alert(title, message, options, { cancelable: true });
    }
  };

  if (filteredWallets.length > 0) {
    showWallet(0);
  } else {
    Alert.alert('No wallets available');
  }
};

const getActiveRouteName = (state: any): string | undefined => {
  if (!state || !state.routes || state.routes.length === 0) return undefined;
  const route = state.routes[state.index ?? 0];
  if (route?.state) return getActiveRouteName(route.state);
  return route?.name;
};

type DevMenuOption = {
  title: string;
  onPress: () => void;
};

const showDevMenuOptions = (options: DevMenuOption[], title = 'Developer Tools') => {
  if (options.length === 0) return;

  const showOption = (index: number) => {
    if (index >= options.length) return;
    const option = options[index];

    if (Platform.OS === 'android') {
      Alert.alert(
        `${title}: ${option.title}`,
        `Option ${index + 1} of ${options.length}`,
        [
          {
            text: 'Select',
            onPress: () => option.onPress(),
          },
          {
            text: 'Next',
            onPress: () => showOption(index + 1),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ],
        { cancelable: true },
      );
    } else {
      const alertButtons: AlertButton[] = options.map(o => ({
        text: o.title,
        onPress: () => o.onPress(),
      }));

      alertButtons.push({ text: 'Cancel', style: 'cancel' });

      Alert.alert(title, 'Select an option', alertButtons, { cancelable: true });
    }
  };

  showOption(0);
};

const DevMenu: React.FC = () => {
  const { wallets, addWallet } = useStorage();

  useEffect(() => {
    if (__DEV__) {
      DevSettings.addMenuItem('Developer Tools', () => {
        const routeName = navigationRef.isReady() ? getActiveRouteName(navigationRef.getRootState()) : undefined;
        const walletOptions: DevMenuOption[] = [
          {
            title: 'Add New Wallet',
            onPress: async () => {
              const wallet = new HDSegwitBech32Wallet();
              await wallet.generate();
              const label = getRandomLabelFromSecret(wallet.getSecret());
              wallet.setLabel(label);
              addWallet(wallet);

              Clipboard.setString(wallet.getSecret());
              Alert.alert('New Wallet created!', `Wallet secret copied to clipboard.\nLabel: ${label}`);
            },
          },
          {
            title: 'Copy Wallet Secret',
            onPress: () => {
              if (wallets.length === 0) {
                Alert.alert('No wallets available');
                return;
              }

              showAlertWithWalletOptions(wallets, 'Copy Wallet Secret', 'Select the wallet to copy the secret', wallet => {
                Clipboard.setString(wallet.getSecret());
                Alert.alert('Wallet Secret copied to clipboard!');
              });
            },
          },
          {
            title: 'Copy Wallet ID',
            onPress: () => {
              if (wallets.length === 0) {
                Alert.alert('No wallets available');
                return;
              }

              showAlertWithWalletOptions(wallets, 'Copy Wallet ID', 'Select the wallet to copy the ID', wallet => {
                Clipboard.setString(wallet.getID());
                Alert.alert('Wallet ID copied to clipboard!');
              });
            },
          },
          {
            title: 'Copy Wallet Xpub',
            onPress: () => {
              if (wallets.length === 0) {
                Alert.alert('No wallets available');
                return;
              }

              showAlertWithWalletOptions(
                wallets,
                'Copy Wallet Xpub',
                'Select the wallet to copy the Xpub',
                wallet => {
                  const xpub = wallet.getXpub();
                  if (xpub) {
                    Clipboard.setString(xpub);
                    Alert.alert('Wallet Xpub copied to clipboard!');
                  } else {
                    Alert.alert('This wallet does not have an Xpub.');
                  }
                },
                wallet => typeof wallet.getXpub === 'function',
              );
            },
          },
          {
            title: 'Purge Wallet Transactions',
            onPress: () => {
              if (wallets.length === 0) {
                Alert.alert('No wallets available');
                return;
              }

              showAlertWithWalletOptions(wallets, 'Purge Wallet Transactions', 'Select the wallet to purge transactions', wallet => {
                const msg = 'Transactions purged successfully!';

                if (wallet.type === HDSegwitBech32Wallet.type) {
                  wallet._txs_by_external_index = {};
                  wallet._txs_by_internal_index = {};
                }

                if (wallet.type === WatchOnlyWallet.type && wallet._hdWalletInstance) {
                  wallet._hdWalletInstance._txs_by_external_index = {};
                  wallet._hdWalletInstance._txs_by_internal_index = {};
                }

                Alert.alert(msg);
              });
            },
          },
        ];

        const sampleDataOptions: DevMenuOption[] = [];
        if (routeName === 'CoinControl') {
          sampleDataOptions.push(
            { title: 'Add CoinControl Sample Data', onPress: () => setCoinControlSampleDataEnabled(true) },
            { title: 'Remove CoinControl Sample Data', onPress: () => setCoinControlSampleDataEnabled(false) },
          );
        }
        if (routeName === 'PaymentCodeList' || routeName === 'PaymentCodesList') {
          sampleDataOptions.push(
            { title: 'Add PaymentCodeList Sample Data', onPress: () => setPaymentCodesSampleDataEnabled(true) },
            { title: 'Remove PaymentCodeList Sample Data', onPress: () => setPaymentCodesSampleDataEnabled(false) },
          );
        }
        if (routeName === 'WalletsList') {
          sampleDataOptions.push(
            { title: 'Add WalletsList Sample Data', onPress: () => setWalletsListSampleDataEnabled(true) },
            { title: 'Remove WalletsList Sample Data', onPress: () => setWalletsListSampleDataEnabled(false) },
          );
        }
        if (routeName === 'WalletTransactions') {
          sampleDataOptions.push(
            { title: 'Add WalletTransactions Sample Data', onPress: () => setWalletTransactionsSampleDataEnabled(true) },
            { title: 'Remove WalletTransactions Sample Data', onPress: () => setWalletTransactionsSampleDataEnabled(false) },
          );
        }
        if (routeName === 'SendDetails') {
          sampleDataOptions.push(
            { title: 'Add SendDetails Sample Data', onPress: () => setSendDetailsSampleDataEnabled(true) },
            { title: 'Remove SendDetails Sample Data', onPress: () => setSendDetailsSampleDataEnabled(false) },
          );
        }

        const topLevelOptions: DevMenuOption[] = [
          {
            title: 'Wallet Tools',
            onPress: () => showDevMenuOptions(walletOptions, 'Wallet Tools'),
          },
          ...(sampleDataOptions.length
            ? [
                {
                  title: 'Sample Data',
                  onPress: () => showDevMenuOptions(sampleDataOptions, 'Sample Data'),
                },
              ]
            : []),
          {
            title: 'Reset Dev Menu',
            onPress: () => DevSettings.reload(),
          },
        ];

        showDevMenuOptions(topLevelOptions);
      });
    }
  }, [wallets, addWallet]);

  return null;
};

export default DevMenu;
