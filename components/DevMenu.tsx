import React, { useEffect } from 'react';
import { DevSettings, Alert, Platform, AlertButton } from 'react-native';
import { useStorage } from '../hooks/context/useStorage';
import { HDSegwitBech32Wallet } from '../class/wallets/hd-segwit-bech32-wallet';
import Clipboard from '@react-native-clipboard/clipboard';
import { TWallet } from '../class/wallets/types';
import { Chain } from '../models/bitcoinUnits';
import { useAppDataRealm } from '../blue_modules/realm/AppDataRealmProvider';
import {
  insertDeveloperIncomingTransaction,
  removeDeveloperTransactions,
  type DeveloperTransactionState,
} from '../blue_modules/realm/developerFixtures';

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
  const { wallets, addWallet, purgeWalletTransactions } = useStorage();
  const realm = useAppDataRealm();

  useEffect(() => {
    if (__DEV__) {
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

        showAlertWithWalletOptions(wallets, 'Purge Wallet Transactions', 'Select the wallet to purge transactions', async wallet => {
          await purgeWalletTransactions(wallet.getID());
          Alert.alert('Transactions purged successfully!');
        });
      });

      const addFakeIncomingTransaction = (state: DeveloperTransactionState) => {
        showAlertWithWalletOptions(
          wallets,
          `Add Fake ${state === 'pending' ? 'Pending' : 'Confirmed'} Transaction`,
          'Select the on-chain wallet that should receive the fake transaction',
          wallet => {
            // The fixture's positive value makes it an incoming wallet row. Do
            // not target the wallet's active receive address, otherwise the
            // Receive screen correctly treats its QR request as already paid.
            const transactionId = insertDeveloperIncomingTransaction(realm, wallet.getID(), state);
            Alert.alert(
              'Fake Realm transaction added',
              `${state === 'pending' ? 'Pending' : 'Confirmed'} incoming transaction added to ${wallet.getLabel()}.\n\n${transactionId}`,
            );
          },
          wallet => wallet.chain === Chain.ONCHAIN,
        );
      };

      DevSettings.addMenuItem('Add Fake Incoming Transaction (Pending)', () => addFakeIncomingTransaction('pending'));
      DevSettings.addMenuItem('Add Fake Incoming Transaction (Confirmed)', () => addFakeIncomingTransaction('confirmed'));
      DevSettings.addMenuItem('Remove Fake Realm Transactions', () => {
        const removed = removeDeveloperTransactions(realm);
        Alert.alert('Fake Realm transactions removed', `${removed} transaction${removed === 1 ? '' : 's'} removed.`);
      });
    }
  }, [wallets, addWallet, purgeWalletTransactions, realm]);

  return null;
};

export default DevMenu;
