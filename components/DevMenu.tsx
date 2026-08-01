import React, { useEffect } from 'react';
import { DevSettings, Alert, Platform, AlertButton } from 'react-native';
import { useStorage } from '../hooks/context/useStorage';
import { HDSegwitBech32Wallet } from '../class/wallets/hd-segwit-bech32-wallet';
import { WatchOnlyWallet } from '../class/wallets/watch-only-wallet';
import Clipboard from '@react-native-clipboard/clipboard';
import { TWallet } from '../class/wallets/types';
import { previewPendingTransactionsLiveActivity, showcasePendingTransactionsLiveActivity } from '../blue_modules/dynamicIslandPreview';

type DynamicIslandPreview = {
  title: string;
  pendingTransactionCount: number;
  totalPendingSats: number;
};

export const DYNAMIC_ISLAND_PREVIEWS: DynamicIslandPreview[] = [
  {
    title: '1 transaction · zero amount',
    pendingTransactionCount: 1,
    totalPendingSats: 0,
  },
  {
    title: '1 transaction · 1 sat',
    pendingTransactionCount: 1,
    totalPendingSats: 1,
  },
  {
    title: '1 transaction · 0.001 BTC',
    pendingTransactionCount: 1,
    totalPendingSats: 100_000,
  },
  {
    title: '2 transactions · 0.00175 BTC',
    pendingTransactionCount: 2,
    totalPendingSats: 175_000,
  },
  {
    title: '12 transactions · 1.23456789 BTC',
    pendingTransactionCount: 12,
    totalPendingSats: 123_456_789,
  },
  {
    title: '999 transactions · 21M BTC',
    pendingTransactionCount: 999,
    totalPendingSats: 2_100_000_000_000_000,
  },
];

const showDynamicIslandPreviews = () => {
  const options: AlertButton[] = DYNAMIC_ISLAND_PREVIEWS.map(preview => ({
    text: preview.title,
    onPress: () => previewPendingTransactionsLiveActivity(preview.pendingTransactionCount, preview.totalPendingSats),
  }));

  options.push({
    text: 'End Live Activity',
    style: 'destructive',
    onPress: () => previewPendingTransactionsLiveActivity(0, 0),
  });
  options.push({ text: 'Cancel', style: 'cancel' });

  Alert.alert(
    'Dynamic Island Preview',
    'Choose a content state. Lock the simulator to inspect the Lock Screen view, or press and hold the Dynamic Island for its expanded view.',
    options,
    { cancelable: true },
  );
};

const showDynamicIslandShowcase = () => {
  Alert.alert(
    'Dynamic Island Showcase',
    'Cycles through singular, plural, tiny, typical, large, and stress-test values every 5 seconds. Swipe home to see the compact view, then press and hold it to inspect the expanded view.',
    [
      {
        text: 'Start Showcase',
        onPress: showcasePendingTransactionsLiveActivity,
      },
      { text: 'Cancel', style: 'cancel' },
    ],
    { cancelable: true },
  );
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
      if (Platform.OS === 'ios') {
        DevSettings.addMenuItem('Showcase Dynamic Island (5s)', showDynamicIslandShowcase);
        DevSettings.addMenuItem('Preview Dynamic Island', showDynamicIslandPreviews);
      }

      // Clear existing Dev Menu items to prevent duplication
      DevSettings.addMenuItem('Reset Dev Menu', () => {
        DevSettings.reload();
      });

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
