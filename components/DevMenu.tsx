import React, { useEffect } from 'react';
import { DevSettings, Alert, Platform, AlertButton } from 'react-native';
import { useStorage } from '../hooks/context/useStorage';
import { useSettings } from '../hooks/context/useSettings';
import { HDSegwitBech32Wallet, WatchOnlyWallet } from '../class';
import Clipboard from '@react-native-clipboard/clipboard';
import { TWallet } from '../class/wallets/types';
import { ContinuityActivityType } from './types';
import NativeReactNativeContinuity from '../codegen/NativeReactNativeContinuity';
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

type ContinuityLogLevel = 'debug' | 'info' | 'warn' | 'error';

const logContinuity = (level: ContinuityLogLevel, message: string, details?: Record<string, unknown>, error?: unknown): void => {
  const logger = console[level] ?? console.log;

  if (details && error) {
    logger(`[Continuity] ${message}`, details, error);
  } else if (details) {
    logger(`[Continuity] ${message}`, details);
  } else if (error) {
    logger(`[Continuity] ${message}`, error);
  } else {
    logger(`[Continuity] ${message}`);
  }
};

const showContinuityAdvertisedAlert = (
  id: number,
  type: ContinuityActivityType,
  title: string,
  userInfo?: Record<string, unknown> | null,
  url?: string,
) => {
  const details = ['Continuity activity advertised.', '', `Title: ${title}`, `Type: ${type}`, `ID: ${id}`];

  if (userInfo && Object.keys(userInfo).length > 0) {
    details.push('', `User info: ${JSON.stringify(userInfo, null, 2)}`);
  }

  if (url) {
    details.push('', `URL: ${url}`);
  }

  details.push('', 'Check another device for Continuity availability.');

  Alert.alert('Continuity Test Activity', details.join('\n'), [
    {
      text: 'Keep Active',
      style: 'cancel',
    },
    {
      text: 'Invalidate Now',
      onPress: () => {
        NativeReactNativeContinuity?.invalidate(id);
        logContinuity('info', 'Invalidated dev menu continuity activity', { id, type, title });
        Alert.alert('Continuity test activity invalidated');
      },
    },
  ]);
};

const DevMenu: React.FC = () => {
  const { wallets, addWallet } = useStorage();
  const { isContinuityEnabled, setIsContinuityEnabledStorage } = useSettings();

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

      // ---- Continuity Debug Options ----

      const ensureContinuityAvailable = (): boolean => {
        if (Platform.OS === 'web') {
          logContinuity('warn', 'Continuity is unavailable on web', { platform: Platform.OS });
          Alert.alert('Continuity is not available on web');
          return false;
        }
        if (!NativeReactNativeContinuity) {
          logContinuity('warn', 'ReactNativeContinuity native module is not available', { platform: Platform.OS });
          Alert.alert('ReactNativeContinuity native module not available');
          return false;
        }
        return true;
      };

      const advertiseContinuityActivity = (
        type: ContinuityActivityType,
        title: string,
        userInfo?: Record<string, unknown> | null,
        url?: string,
      ) => {
        if (!ensureContinuityAvailable()) return;

        const testId = Date.now();
        try {
          logContinuity('info', 'Advertising dev menu continuity activity', {
            id: testId,
            type,
            title,
            hasUrl: Boolean(url),
            userInfoKeys: userInfo ? Object.keys(userInfo) : [],
          });
          NativeReactNativeContinuity?.becomeCurrent(testId, type, title, userInfo ?? null, url ?? null);
          logContinuity('info', 'Dev menu continuity activity advertised successfully', { id: testId, type, title });
          showContinuityAdvertisedAlert(testId, type, title, userInfo, url);
        } catch (error) {
          logContinuity('error', 'Failed to advertise dev menu continuity activity', { id: testId, type, title }, error);
          Alert.alert('Continuity Error', 'Failed to advertise continuity activity. Check logs for details.');
        }
      };

      DevSettings.addMenuItem('Continuity: Check Status', async () => {
        const lines: string[] = [`Setting enabled: ${isContinuityEnabled}`, `Platform: ${Platform.OS}`];
        if (Platform.OS !== 'web' && NativeReactNativeContinuity?.isSupported) {
          try {
            const supported = await NativeReactNativeContinuity.isSupported();
            logContinuity('info', 'Continuity support check completed', {
              enabled: isContinuityEnabled,
              platform: Platform.OS,
              supported,
            });
            lines.push(`Device supported: ${supported}`);
          } catch (e: any) {
            logContinuity('error', 'Continuity support check failed', { enabled: isContinuityEnabled, platform: Platform.OS }, e);
            lines.push(`Device supported: error (${e.message})`);
          }
        }
        lines.push(
          'Types: Block Explorer, Receive, Xpub, Sign/Verify, Is It My Address, Send Onchain, Lightning Settings, Electrum Settings',
        );
        Alert.alert('Continuity Status', lines.join('\n'));
      });

      DevSettings.addMenuItem('Continuity: Toggle Setting', async () => {
        const newValue = !isContinuityEnabled;
        await setIsContinuityEnabledStorage(newValue);
        logContinuity('info', 'Continuity setting toggled from dev menu', { enabled: newValue });
        Alert.alert('Continuity Setting', `Continuity is now ${newValue ? 'ON' : 'OFF'}`);
      });

      DevSettings.addMenuItem('Continuity: Test Block Explorer', () => {
        advertiseContinuityActivity(
          ContinuityActivityType.ViewInBlockExplorer,
          'View Transaction in Block Explorer',
          null,
          'https://mempool.space/tx/test-continuity-debug',
        );
      });

      DevSettings.addMenuItem('Continuity: Test Receive Onchain', () => {
        advertiseContinuityActivity(ContinuityActivityType.ReceiveOnchain, 'Receive Bitcoin', {
          address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
        });
      });

      DevSettings.addMenuItem('Continuity: Test Wallet Xpub', () => {
        if (wallets.length === 0) {
          Alert.alert('No wallets available');
          return;
        }

        showAlertWithWalletOptions(
          wallets,
          'Continuity: Test Wallet Xpub',
          'Select the wallet to advertise over Continuity',
          wallet => {
            const xpub = wallet.getXpub();
            if (!xpub) {
              Alert.alert('This wallet does not have an Xpub.');
              return;
            }
            advertiseContinuityActivity(ContinuityActivityType.Xpub, 'Wallet XPub', {
              walletID: wallet.getID(),
              xpub,
            });
          },
          wallet => typeof wallet.getXpub === 'function' && !!wallet.getXpub(),
        );
      });

      DevSettings.addMenuItem('Continuity: Test Is It My Address', () => {
        advertiseContinuityActivity(ContinuityActivityType.IsItMyAddress, 'Is It My Address', {
          address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
        });
      });

      DevSettings.addMenuItem('Continuity: Test Sign/Verify', () => {
        if (wallets.length === 0) {
          Alert.alert('No wallets available');
          return;
        }

        showAlertWithWalletOptions(wallets, 'Continuity: Test Sign/Verify', 'Select the wallet to advertise over Continuity', wallet => {
          advertiseContinuityActivity(ContinuityActivityType.SignVerify, 'Sign & Verify', {
            walletID: wallet.getID(),
            address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
          });
        });
      });

      DevSettings.addMenuItem('Continuity: Test Send Onchain', () => {
        const testAddress = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
        const testAmount = '0.001';
        const testMemo = 'Continuity Debug Test';

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
            'Continuity: Send Onchain',
            `Navigated to SendDetails.\n\nAddress: ${testAddress}\nAmount: ${testAmount} BTC\nMemo: ${testMemo}`,
          );
          return;
        }

        Alert.alert(loc.send.continuity_draft_conflict_title, loc.send.continuity_draft_conflict_message, [
          { text: loc._.cancel, style: 'cancel' },
          {
            text: loc.send.continuity_draft_replace,
            style: 'destructive',
            onPress: navigateToSend,
          },
          {
            text: loc.send.continuity_draft_add_recipient,
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

      DevSettings.addMenuItem('Continuity: Test Lightning Settings', () => {
        advertiseContinuityActivity(ContinuityActivityType.LightningSettings, loc.settings.lightning_settings, {
          url: 'https://lndhub.herokuapp.com',
        });
      });

      DevSettings.addMenuItem('Continuity: Test Electrum Settings', () => {
        advertiseContinuityActivity(ContinuityActivityType.ElectrumSettings, loc.settings.electrum_settings_server, {
          server: 'electrum1.bluewallet.io:443:s',
        });
      });
    }
  }, [wallets, addWallet, isContinuityEnabled, setIsContinuityEnabledStorage]);

  return null;
};

export default DevMenu;
