import React, { useEffect } from 'react';
import { DevSettings, Alert, Platform, AlertButton, DeviceEventEmitter } from 'react-native';
import { useStorage } from '../hooks/context/useStorage';
import { HDSegwitBech32Wallet, WatchOnlyWallet } from '../class';
import Clipboard from '@react-native-clipboard/clipboard';
import { TWallet } from '../class/wallets/types';
import { ContinuityActivityType } from './types';

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

      // ---- Continuity Debug ----

      DevSettings.addMenuItem('Test Continuity', () => {
        const testData: Record<ContinuityActivityType, { userInfo: Record<string, any>; webpageURL?: string }> = {
          [ContinuityActivityType.ReceiveOnchain]: {
            userInfo: { address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq' },
          },
          [ContinuityActivityType.Xpub]: {
            userInfo: {
              xpub: 'xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz37',
              walletID: wallets.length > 0 ? wallets[0].getID() : 'test-wallet-id',
            },
          },
          [ContinuityActivityType.ViewInBlockExplorer]: {
            userInfo: {},
            webpageURL: 'https://mempool.space/tx/e9a66845e05d5abc0ad04ec80f774a7e585c6e8db975962d069a522137b80c1d',
          },
          [ContinuityActivityType.SendOnchain]: {
            userInfo: {
              address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
              amount: '0.001',
              memo: 'Continuity test payment',
            },
          },
          [ContinuityActivityType.SignVerify]: {
            userInfo: {
              address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
              message: 'Hello from Continuity',
              walletID: wallets.length > 0 ? wallets[0].getID() : 'test-wallet-id',
            },
          },
          [ContinuityActivityType.IsItMyAddress]: {
            userInfo: { address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq' },
          },
        };

        const labels: Record<ContinuityActivityType, string> = {
          [ContinuityActivityType.ReceiveOnchain]: 'Receive Onchain',
          [ContinuityActivityType.Xpub]: 'Xpub',
          [ContinuityActivityType.ViewInBlockExplorer]: 'View in Block Explorer',
          [ContinuityActivityType.SendOnchain]: 'Send Onchain',
          [ContinuityActivityType.SignVerify]: 'Sign / Verify',
          [ContinuityActivityType.IsItMyAddress]: 'Is It My Address',
        };

        const options: AlertButton[] = Object.values(ContinuityActivityType).map(activityType => ({
          text: labels[activityType],
          onPress: () => {
            const { userInfo, webpageURL } = testData[activityType];
            const event = { activityType, userInfo, webpageURL };
            DeviceEventEmitter.emit('onUserActivityOpen', event);
          },
        }));

        options.push({ text: 'Cancel', style: 'cancel' });

        Alert.alert('Test Continuity', 'Simulate receiving a Continuity activity:', options, { cancelable: true });
      });
    }
  }, [wallets, addWallet]);

  return null;
};

export default DevMenu;
