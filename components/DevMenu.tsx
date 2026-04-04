import React, { useEffect, useRef } from 'react';
import { DevSettings, Alert, Platform, AlertButton } from 'react-native';
import { useStorage } from '../hooks/context/useStorage';
import { HDSegwitBech32Wallet, WatchOnlyWallet } from '../class';
import Clipboard from '@react-native-clipboard/clipboard';
import { addNotification } from '../blue_modules/notifications';
import { TWallet } from '../class/wallets/types';
import { Chain } from '../models/bitcoinUnits';
import { navigateFromDeepLink } from '../navigation/linking';
import presentAlert from '../components/Alert';

const TEST_BITCOIN_URI = 'bitcoin:12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG?amount=0.0001&label=Dev%20Menu';
const TEST_LIGHTNING_URI =
  'lightning:lnbc10u1pwjqwkkpp5vlc3tttdzhpk9fwzkkue0sf2pumtza7qyw9vucxyyeh0yaqq66yqdq5f38z6mmwd3ujqar9wd6qcqzpgxq97zvuqrzjqvgptfurj3528snx6e3dtwepafxw5fpzdymw9pj20jj09sunnqmwqz9hx5qqtmgqqqqqqqlgqqqqqqgqjq5duu3fs9xq9vn89qk3ezwpygecu4p3n69wm3tnl28rpgn2gmk5hjaznemw0gy32wrslpn3g24khcgnpua9q04fttm2y8pnhmhhc2gncplz0zde';
const TEST_BIP21_AND_LIGHTNING_URI =
  'bitcoin:1DamianM2k8WfNEeJmyqSe2YW1upB7UATx?amount=0.000001&lightning=' +
  'lnbc1u1pwry044pp53xlmkghmzjzm3cljl6729cwwqz5hhnhevwfajpkln850n7clft4sdqlgfy4qv33ypmj7sj0f32rzvfqw3jhxaqcqzysxq97zvuq5zy8ge6q70prnvgwtade0g2k5h2r76ws7j2926xdjj2pjaq6q3r4awsxtm6k5prqcul73p3atveljkn6wxdkrcy69t6k5edhtc6q7lgpe4m5k4';
const TEST_ELECTRUM_URI = 'bluewallet:setelectrumserver?server=electrum1.bluewallet.io%3A443%3As';
const TEST_LNDHUB_URI = 'bluewallet:setlndhuburl?url=https%3A%2F%2Flndhub.herokuapp.com';

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
  } else if (wallets.length > 0) {
    Alert.alert('No matching wallets available', 'Your wallets are loaded, but none currently match this action.');
  } else {
    Alert.alert('No wallets available');
  }
};

type TDevMenuActionItem = {
  label: string;
  action: () => void | Promise<void>;
};

const runDevMenuAction = (label: string, action: () => void | Promise<void>) => {
  Promise.resolve(action()).catch(error => {
    console.error(`Dev menu action failed for ${label}:`, error);
  });
};

const showAlertWithActionItems = (title: string, items: TDevMenuActionItem[], startIndex = 0) => {
  if (items.length === 0) {
    Alert.alert('No items available');
    return;
  }

  if (Platform.OS === 'android') {
    const visibleItems = items.slice(startIndex, startIndex + 2);
    const buttons: AlertButton[] = visibleItems.map(item => ({
      text: item.label,
      onPress: () => runDevMenuAction(`${title} / ${item.label}`, item.action),
    }));

    if (startIndex + visibleItems.length < items.length) {
      buttons.push({
        text: 'More...',
        onPress: () => showAlertWithActionItems(title, items, startIndex + visibleItems.length),
      });
    } else {
      buttons.push({
        text: 'Cancel',
        style: 'cancel',
      });
    }

    presentAlert({
      title,
      message: 'Select an action',
      buttons,
      options: { cancelable: true },
    });
    return;
  }

  presentAlert({
    title,
    message: 'Select an action',
    buttons: [
      ...items.map(item => ({
        text: item.label,
        onPress: () => runDevMenuAction(`${title} / ${item.label}`, item.action),
      })),
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: () => {},
      },
    ],
    options: { cancelable: true },
  });
};

const addCategoryMenuItem = (category: string, items: TDevMenuActionItem[]) => {
  DevSettings.addMenuItem(category, () => {
    showAlertWithActionItems(category, items);
  });
};

const openTestDeepLink = async (url: string, wallets: TWallet[]): Promise<void> => {
  const handled = await navigateFromDeepLink(url, {
    wallets,
    saveToDisk: () => {},
    addWallet: () => {},
    setSharedCosigner: () => {},
  });

  if (!handled) {
    Alert.alert('Link test failed', `Could not handle:\n${url}`);
  }
};

const queueTestNotificationPayload = async (
  wallet: TWallet,
  type: 1 | 2 | 3 | 4,
  options: { foreground?: boolean; userInteraction?: boolean } = {},
): Promise<void> => {
  const payload = {
    foreground: options.foreground ?? false,
    userInteraction: options.userInteraction ?? true,
    address: '',
    txid: '',
    type,
    hash: '',
    title: `[Dev] Notification type ${type}`,
    subText: `Test payload for ${wallet.getLabel()}`,
    message: `Queued notification payload type ${type}`,
    identifier: `dev-notification-${type}-${Date.now()}`,
  };

  if (type === 3 && wallet.chain !== Chain.ONCHAIN) {
    Alert.alert('Notification test unavailable', 'Type 3 payloads require an on-chain wallet.');
    return;
  }

  if (type === 2 || type === 3) {
    const address = await wallet.getAddressAsync();
    if (!address) {
      Alert.alert('Notification test unavailable', 'The selected wallet does not currently have a usable address.');
      return;
    }

    payload.address = String(address);
  } else {
    const tx = wallet.getTransactions()[0];
    const txid = tx?.txid ?? tx?.hash;
    if (!txid) {
      Alert.alert('Notification test unavailable', 'The selected wallet does not have any transactions to reference yet.');
      return;
    }

    payload.txid = String(txid);
    payload.hash = String(tx?.hash ?? txid);
  }

  await addNotification(payload);
  Alert.alert(
    'Notification queued',
    `Queued payload type ${type} for ${wallet.getLabel()}\n\nBackground and reopen the app to let the notification handler process it.`,
  );
};

const DevMenu: React.FC = () => {
  const { wallets, addWallet } = useStorage();
  const walletsRef = useRef(wallets);
  const addWalletRef = useRef(addWallet);
  const hasRegisteredMenuRef = useRef(false);

  useEffect(() => {
    walletsRef.current = wallets;
    addWalletRef.current = addWallet;
  }, [wallets, addWallet]);

  useEffect(() => {
    if (!__DEV__ || hasRegisteredMenuRef.current) {
      return;
    }

    hasRegisteredMenuRef.current = true;

    const getWallets = () => walletsRef.current;

    addCategoryMenuItem('General', [
      {
        label: 'Reset',
        action: () => {
          DevSettings.reload();
        },
      },
    ]);

    addCategoryMenuItem('Wallets', [
      {
        label: 'Add wallet',
        action: async () => {
          const wallet = new HDSegwitBech32Wallet();
          await wallet.generate();
          const label = getRandomLabelFromSecret(wallet.getSecret());
          wallet.setLabel(label);
          addWalletRef.current(wallet);

          Clipboard.setString(wallet.getSecret());
          Alert.alert('New Wallet created!', `Wallet secret copied to clipboard.\nLabel: ${label}`);
        },
      },
    ]);

    addCategoryMenuItem('Clipboard', [
      {
        label: 'Copy secret',
        action: () => {
          const currentWallets = getWallets();
          if (currentWallets.length === 0) {
            Alert.alert('No wallets available');
            return;
          }

          showAlertWithWalletOptions(currentWallets, 'Copy Wallet Secret...', 'Select the wallet to copy the secret', wallet => {
            Clipboard.setString(wallet.getSecret());
            Alert.alert('Wallet Secret copied to clipboard!');
          });
        },
      },
      {
        label: 'Copy wallet ID',
        action: () => {
          const currentWallets = getWallets();
          if (currentWallets.length === 0) {
            Alert.alert('No wallets available');
            return;
          }

          showAlertWithWalletOptions(currentWallets, 'Copy Wallet ID...', 'Select the wallet to copy the ID', wallet => {
            Clipboard.setString(wallet.getID());
            Alert.alert('Wallet ID copied to clipboard!');
          });
        },
      },
      {
        label: 'Copy xpub',
        action: () => {
          const currentWallets = getWallets();
          if (currentWallets.length === 0) {
            Alert.alert('No wallets available');
            return;
          }

          showAlertWithWalletOptions(
            currentWallets,
            'Copy Wallet Xpub...',
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
    ]);

    addCategoryMenuItem('Linking', [
      {
        label: 'Bitcoin URI',
        action: () => openTestDeepLink(TEST_BITCOIN_URI, getWallets()),
      },
      {
        label: 'Lightning invoice',
        action: () => openTestDeepLink(TEST_LIGHTNING_URI, getWallets()),
      },
      {
        label: 'Bitcoin + Lightning',
        action: () => openTestDeepLink(TEST_BIP21_AND_LIGHTNING_URI, getWallets()),
      },
      {
        label: 'Electrum settings',
        action: () => openTestDeepLink(TEST_ELECTRUM_URI, getWallets()),
      },
      {
        label: 'LNDHub settings',
        action: () => openTestDeepLink(TEST_LNDHUB_URI, getWallets()),
      },
      {
        label: 'Wallet shortcut',
        action: () => {
          const currentWallets = getWallets();
          if (currentWallets.length === 0) {
            Alert.alert('No wallets available');
            return;
          }

          showAlertWithWalletOptions(
            currentWallets,
            'Test Wallet Shortcut',
            'Select the wallet to open with bluewallet://wallet/:id',
            wallet => openTestDeepLink(`bluewallet://wallet/${encodeURIComponent(wallet.getID())}`, currentWallets),
          );
        },
      },
    ]);

    addCategoryMenuItem('Notifications', [
      {
        label: 'Transaction events',
        action: () => {
          showAlertWithActionItems('Notifications / Transactions', [
            {
              label: 'Payment detected',
              action: () => {
                const currentWallets = getWallets();
                if (currentWallets.length === 0) {
                  Alert.alert('No wallets available');
                  return;
                }

                showAlertWithWalletOptions(
                  currentWallets,
                  'Simulate payment detected...',
                  'Select a wallet to simulate a payment-detected notification',
                  wallet => queueTestNotificationPayload(wallet, 1),
                );
              },
            },
            {
              label: 'Tx confirmation',
              action: () => {
                const currentWallets = getWallets();
                if (currentWallets.length === 0) {
                  Alert.alert('No wallets available');
                  return;
                }

                showAlertWithWalletOptions(
                  currentWallets,
                  'Simulate transaction confirmation...',
                  'Select a wallet to simulate a transaction-confirmed notification',
                  wallet => queueTestNotificationPayload(wallet, 4),
                );
              },
            },
          ]);
        },
      },
      {
        label: 'Address events',
        action: () => {
          showAlertWithActionItems('Notifications / Addresses', [
            {
              label: 'Address activity',
              action: () => {
                const currentWallets = getWallets();
                if (currentWallets.length === 0) {
                  Alert.alert('No wallets available');
                  return;
                }

                showAlertWithWalletOptions(
                  currentWallets,
                  'Simulate address activity...',
                  'Select a wallet to simulate incoming activity for one of its addresses',
                  wallet => queueTestNotificationPayload(wallet, 2),
                );
              },
            },
            {
              label: 'Open receive',
              action: () => {
                const currentWallets = getWallets();
                if (currentWallets.length === 0) {
                  Alert.alert('No wallets available');
                  return;
                }

                showAlertWithWalletOptions(
                  currentWallets,
                  'Open receive screen from notification...',
                  'Select an on-chain wallet to simulate a notification that opens Receive Details',
                  wallet => queueTestNotificationPayload(wallet, 3),
                );
              },
            },
          ]);
        },
      },
      {
        label: 'Foreground behavior',
        action: () => {
          showAlertWithActionItems('Notifications / Foreground', [
            {
              label: 'Foreground only',
              action: () => {
                const currentWallets = getWallets();
                if (currentWallets.length === 0) {
                  Alert.alert('No wallets available');
                  return;
                }

                showAlertWithWalletOptions(
                  currentWallets,
                  'Show foreground notification without opening...',
                  'Select a wallet to simulate a foreground notification that should not auto-open a screen',
                  wallet => queueTestNotificationPayload(wallet, 2, { foreground: true, userInteraction: false }),
                );
              },
            },
          ]);
        },
      },
    ]);

    addCategoryMenuItem('Maintenance', [
      {
        label: 'Purge transactions',
        action: () => {
          const currentWallets = getWallets();
          if (currentWallets.length === 0) {
            Alert.alert('No wallets available');
            return;
          }

          showAlertWithWalletOptions(currentWallets, 'Purge Wallet Transactions', 'Select the wallet to purge transactions', wallet => {
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
    ]);
  }, []);

  return null;
};

export default DevMenu;
