import React, { useEffect } from 'react';
import { DevSettings, Alert, Platform, AlertButton, NativeModules } from 'react-native';
import { useStorage } from '../hooks/context/useStorage';
import { useSettings } from '../hooks/context/useSettings';
import { HDSegwitBech32Wallet, WatchOnlyWallet } from '../class';
import Clipboard from '@react-native-clipboard/clipboard';
import { TWallet } from '../class/wallets/types';
import { HandOffActivityType } from './types';
import { navigationRef } from '../NavigationService';
import loc from '../loc';

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
  const { isHandOffUseEnabled, setIsHandOffUseEnabledAsyncStorage } = useSettings();

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

      // ---- Handoff Debug Options ----

      DevSettings.addMenuItem('Handoff: Check Status', async () => {
        const lines: string[] = [`Setting enabled: ${isHandOffUseEnabled}`, `Platform: ${Platform.OS}`];
        if (Platform.OS !== 'web' && NativeModules.BWHandoff?.isSupported) {
          try {
            const supported = await NativeModules.BWHandoff.isSupported();
            lines.push(`Device supported: ${supported}`);
          } catch (e: any) {
            lines.push(`Device supported: error (${e.message})`);
          }
        }
        Alert.alert('Handoff Status', lines.join('\n'));
      });

      DevSettings.addMenuItem('Handoff: Toggle Setting', async () => {
        const newValue = !isHandOffUseEnabled;
        await setIsHandOffUseEnabledAsyncStorage(newValue);
        Alert.alert('Handoff Setting', `Continuity is now ${newValue ? 'ON' : 'OFF'}`);
      });

      DevSettings.addMenuItem('Handoff: Test Activity', async () => {
        if (Platform.OS === 'web') {
          Alert.alert('Not available on web');
          return;
        }
        const BWHandoff = NativeModules.BWHandoff;
        if (!BWHandoff) {
          Alert.alert('BWHandoff native module not available');
          return;
        }

        const testId = Date.now();
        const testType = HandOffActivityType.ViewInBlockExplorer;
        const testUrl = 'https://mempool.space/tx/test-handoff-debug';
        BWHandoff.becomeCurrent(testId, testType, 'Handoff Debug Test', null, testUrl);
        Alert.alert(
          'Handoff Test Activity',
          `Activity advertised.\n\nType: ${testType}\nURL: ${testUrl}\nID: ${testId}\n\nCheck another device for Handoff availability. Tap OK to invalidate.`,
          [
            {
              text: 'Keep Active',
              style: 'cancel',
            },
            {
              text: 'Invalidate Now',
              onPress: () => {
                BWHandoff.invalidate(testId);
                Alert.alert('Test activity invalidated');
              },
            },
          ],
        );
      });

      DevSettings.addMenuItem('Handoff: Test Send Onchain', () => {
        const testAddress = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
        const testAmount = '0.001';
        const testMemo = 'Handoff Debug Test';

        const currentRoute = navigationRef.current?.getCurrentRoute();
        const isOnSendDetails = currentRoute?.name === 'SendDetails';

        const navigateToSend = () => {
          // @ts-ignore: debug-only navigation
          navigationRef.current?.navigate('SendDetailsRoot', {
            screen: 'SendDetails',
            params: {
              address: testAddress,
              amount: Number(testAmount),
              transactionMemo: testMemo,
            },
          });
        };

        if (!isOnSendDetails) {
          navigateToSend();
          Alert.alert(
            'Handoff: Send Onchain',
            `Navigated to SendDetails.\n\nAddress: ${testAddress}\nAmount: ${testAmount} BTC\nMemo: ${testMemo}`,
          );
          return;
        }

        // Simulate draft conflict
        Alert.alert(loc.send.handoff_draft_conflict_title, loc.send.handoff_draft_conflict_message, [
          { text: loc._.cancel, style: 'cancel' },
          {
            text: loc.send.handoff_draft_replace,
            style: 'destructive',
            onPress: navigateToSend,
          },
          {
            text: loc.send.handoff_draft_add_recipient,
            onPress: () => {
              // @ts-ignore: debug-only navigation
              navigationRef.current?.navigate('SendDetailsRoot', {
                screen: 'SendDetails',
                params: {
                  addRecipientParams: {
                    address: testAddress,
                    amount: Number(testAmount),
                    nonce: Date.now(),
                  },
                },
              });
            },
          },
        ]);
      });
    }
  }, [wallets, addWallet, isHandOffUseEnabled, setIsHandOffUseEnabledAsyncStorage]);

  return null;
};

export default DevMenu;
