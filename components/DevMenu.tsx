import React, { useEffect } from 'react';
import { DevSettings, Alert, Platform, AlertButton } from 'react-native';
import { useStorage } from '../hooks/context/useStorage';
import { HDSegwitBech32Wallet } from '../class/wallets/hd-segwit-bech32-wallet';
import { WatchOnlyWallet } from '../class/wallets/watch-only-wallet';
import Clipboard from '@react-native-clipboard/clipboard';
import { TWallet } from '../class/wallets/types';

export const RECEIVE_DETAILS_MOCKED_VALUE = 'mocked' as const;

export type ReceiveDetailsMockScenario =
  | 'loading'
  | 'address'
  | 'custom-btc'
  | 'custom-sats'
  | 'custom-fiat'
  | 'pending-fast'
  | 'pending-medium'
  | 'pending-slow'
  | 'confirmed'
  | 'evicted'
  | 'payment-code'
  | 'payment-code-not-found';

type ReceiveDetailsMockHandler = (scenario: ReceiveDetailsMockScenario, value: typeof RECEIVE_DETAILS_MOCKED_VALUE) => void;

const receiveDetailsMockHandlers: ReceiveDetailsMockHandler[] = [];
const getActiveReceiveDetailsMockHandler = () => receiveDetailsMockHandlers.at(-1);

// React Native exposes no removeMenuItem API. Keep one stable launcher in the
// native menu and make its scenario options available only while this handler
// is registered by the mounted ReceiveDetails screen.
export const registerReceiveDetailsDevMenu = (handler: ReceiveDetailsMockHandler): (() => void) => {
  receiveDetailsMockHandlers.push(handler);
  return () => {
    const index = receiveDetailsMockHandlers.lastIndexOf(handler);
    if (index >= 0) receiveDetailsMockHandlers.splice(index, 1);
  };
};

const activateReceiveDetailsMock = (scenario: ReceiveDetailsMockScenario) => {
  getActiveReceiveDetailsMockHandler()?.(scenario, RECEIVE_DETAILS_MOCKED_VALUE);
};

const receiveDetailsMockOptions: Array<{ text: string; scenario: ReceiveDetailsMockScenario }> = [
  { text: 'Loading', scenario: 'loading' },
  { text: 'Address', scenario: 'address' },
  { text: 'Custom BTC', scenario: 'custom-btc' },
  { text: 'Custom sats', scenario: 'custom-sats' },
  { text: 'Custom fiat', scenario: 'custom-fiat' },
  { text: 'Pending: fast', scenario: 'pending-fast' },
  { text: 'Pending: medium', scenario: 'pending-medium' },
  { text: 'Pending: slow', scenario: 'pending-slow' },
  { text: 'Confirmed', scenario: 'confirmed' },
  { text: 'Evicted', scenario: 'evicted' },
  { text: 'Payment code', scenario: 'payment-code' },
  { text: 'Payment code: not found', scenario: 'payment-code-not-found' },
];

const showReceiveDetailsMockOptions = () => {
  if (!getActiveReceiveDetailsMockHandler()) return;

  if (Platform.OS !== 'android') {
    Alert.alert(
      'Receive Details mock scenario',
      'Select a reducer state to preview.',
      [
        ...receiveDetailsMockOptions.map(({ text, scenario }) => ({
          text,
          onPress: () => activateReceiveDetailsMock(scenario),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
      { cancelable: true },
    );
    return;
  }

  const showCustomOptions = () => {
    Alert.alert('Custom amount', 'Select a unit.', [
      { text: 'BTC', onPress: () => activateReceiveDetailsMock('custom-btc') },
      { text: 'Sats', onPress: () => activateReceiveDetailsMock('custom-sats') },
      { text: 'Fiat', onPress: () => activateReceiveDetailsMock('custom-fiat') },
    ]);
  };
  const showBasicOptions = () => {
    Alert.alert('Basic states', 'Select a state.', [
      { text: 'Loading', onPress: () => activateReceiveDetailsMock('loading') },
      { text: 'Address', onPress: () => activateReceiveDetailsMock('address') },
      { text: 'Custom amount…', onPress: showCustomOptions },
    ]);
  };
  const showPendingOptions = () => {
    Alert.alert('Pending ETA', 'Select a fee tier.', [
      { text: 'Fast', onPress: () => activateReceiveDetailsMock('pending-fast') },
      { text: 'Medium', onPress: () => activateReceiveDetailsMock('pending-medium') },
      { text: 'Slow', onPress: () => activateReceiveDetailsMock('pending-slow') },
    ]);
  };
  const showCompletedOptions = () => {
    Alert.alert('Completed states', 'Select a state.', [
      { text: 'Confirmed', onPress: () => activateReceiveDetailsMock('confirmed') },
      { text: 'Evicted', onPress: () => activateReceiveDetailsMock('evicted') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };
  const showPaymentCodeOptions = () => {
    Alert.alert('Payment code states', 'Select a state.', [
      { text: 'Payment code', onPress: () => activateReceiveDetailsMock('payment-code') },
      { text: 'Not found', onPress: () => activateReceiveDetailsMock('payment-code-not-found') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };
  const showPaymentOptions = () => {
    Alert.alert('Payment states', 'Select a state.', [
      { text: 'Pending…', onPress: showPendingOptions },
      { text: 'Completed…', onPress: showCompletedOptions },
      { text: 'Payment codes…', onPress: showPaymentCodeOptions },
    ]);
  };

  Alert.alert('Receive Details mock scenario', 'Select a category.', [
    { text: 'Basic states…', onPress: showBasicOptions },
    { text: 'Payment states…', onPress: showPaymentOptions },
    { text: 'Cancel', style: 'cancel' },
  ]);
};

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

const DevMenu: React.FC = () => {
  const { wallets, addWallet } = useStorage();

  useEffect(() => {
    if (__DEV__) {
      // Clear existing Dev Menu items to prevent duplication
      DevSettings.addMenuItem('Reset Dev Menu', () => {
        DevSettings.reload();
      });

      DevSettings.addMenuItem('Receive Details Mock Scenarios', showReceiveDetailsMockOptions);

      DevSettings.addMenuItem('Add New Wallet', async () => {
        const wallet = new HDSegwitBech32Wallet();
        await wallet.generate();
        const label = getRandomLabelFromSecret(wallet.getSecret());
        wallet.setLabel(label);
        addWallet(wallet);

        Clipboard.setString(wallet.getSecret());
        Alert.alert('New Wallet created!', `Wallet secret copied to clipboard.\nLabel: ${label}`);
      });

      DevSettings.addMenuItem('Copy Wallet Secret', () => {
        if (wallets.length === 0) {
          Alert.alert('No wallets available');
          return;
        }

        showAlertWithWalletOptions(wallets, 'Copy Wallet Secret', 'Select the wallet to copy the secret', wallet => {
          Clipboard.setString(wallet.getSecret());
          Alert.alert('Wallet Secret copied to clipboard!');
        });
      });

      DevSettings.addMenuItem('Copy Wallet ID', () => {
        if (wallets.length === 0) {
          Alert.alert('No wallets available');
          return;
        }

        showAlertWithWalletOptions(wallets, 'Copy Wallet ID', 'Select the wallet to copy the ID', wallet => {
          Clipboard.setString(wallet.getID());
          Alert.alert('Wallet ID copied to clipboard!');
        });
      });

      DevSettings.addMenuItem('Copy Wallet Xpub', () => {
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
      });

      DevSettings.addMenuItem('Purge Wallet Transactions', () => {
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
      });
    }
  }, [wallets, addWallet]);

  return null;
};

export default DevMenu;
