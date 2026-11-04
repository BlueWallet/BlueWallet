import React, { useEffect } from 'react';
import { DevSettings, Alert, Platform, AlertButton } from 'react-native';
import { useStorage } from '../hooks/context/useStorage';
import { HDSegwitBech32Wallet } from '../class/wallets/hd-segwit-bech32-wallet';
import { WatchOnlyWallet } from '../class/wallets/watch-only-wallet';
import Clipboard from '@react-native-clipboard/clipboard';
import { LightningTransaction, Transaction, TWallet } from '../class/wallets/types';
import { encodeBip329Record, encodeBip329TransactionLabel, writeFileAndExport } from '../blue_modules/fs';
import {
  createAccountingHistoryCsv,
  createAccountingHistoryRows,
  createHistoryExportFileNames,
} from '../blue_modules/wallet-history-export';
import { createAccountingHistoryXlsx } from '../blue_modules/wallet-history-xlsx';
import { Chain } from '../models/bitcoinUnits';

const DEV_SAMPLE_TXID = 'f91d0a8a78462bc59398f2c5d7a84fcff491c26ba54c4833478b202796c8aafd';
const DEV_SAMPLE_PREVIOUS_TXID = 'f546156d9044844e02b181026a1a407abfca62e7ea1159f87bbeaa77b4286c74';
const DEV_SAMPLE_ORIGIN = "wpkh([d34db33f/84'/0'/0'])";
const DEV_SAMPLE_TIMESTAMP = Date.UTC(2025, 0, 23, 11, 40, 35) / 1000;

export const createDeveloperAccountingSample = (): string => {
  const transaction = createDeveloperTransaction();

  return createAccountingHistoryCsv([transaction], Chain.ONCHAIN, {
    [DEV_SAMPLE_TXID]: { memo: 'Developer sample, "coffee"' },
  });
};

const createDeveloperTransaction = (): Transaction & LightningTransaction =>
  ({
    txid: DEV_SAMPLE_TXID,
    hash: DEV_SAMPLE_TXID,
    version: 2,
    size: 222,
    vsize: 141,
    weight: 561,
    locktime: 0,
    inputs: [
      {
        txid: DEV_SAMPLE_PREVIOUS_TXID,
        vout: 0,
        scriptSig: { asm: '', hex: '' },
        txinwitness: [],
        sequence: 0xfffffffd,
        address: 'bc1q2wae8w8z8n8z0v8j2x6rrz3q9d9w6hyn0k2e4g',
        value: 0.0011,
      },
    ],
    outputs: [
      {
        value: 0.001,
        n: 0,
        scriptPubKey: {
          asm: '',
          hex: '',
          reqSigs: 1,
          type: 'witness_v0_keyhash',
          addresses: ['bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'],
        },
      },
    ],
    blockhash: '00000000000000000001d8f981c0a6f1d49ea12d7c8ca251b3687727f9e21a00',
    confirmations: 12,
    blocktime: DEV_SAMPLE_TIMESTAMP,
    timestamp: DEV_SAMPLE_TIMESTAMP,
    value: -100_000,
    counterparty: 'Developer sample merchant',
  }) as Transaction & LightningTransaction;

export const createDeveloperAccountingExcelSample = (): string =>
  createAccountingHistoryXlsx(
    createAccountingHistoryRows([createDeveloperTransaction()], Chain.ONCHAIN, {
      [DEV_SAMPLE_TXID]: { memo: 'Developer sample, "coffee"' },
    }),
  );

export const createDeveloperBip329Sample = (): string =>
  [
    encodeBip329TransactionLabel(DEV_SAMPLE_TXID, 'Developer sample transaction', {
      origin: DEV_SAMPLE_ORIGIN,
      time: new Date(DEV_SAMPLE_TIMESTAMP * 1000).toISOString(),
      fee: 10_000,
      value: -100_000,
    }),
    encodeBip329Record({
      type: 'addr',
      ref: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      label: 'Developer sample address',
      origin: DEV_SAMPLE_ORIGIN,
      keypath: '/0/7',
    }),
    encodeBip329Record({
      type: 'input',
      ref: `${DEV_SAMPLE_TXID}:0`,
      origin: DEV_SAMPLE_ORIGIN,
      keypath: '/0/3',
      value: 110_000,
      time: new Date(DEV_SAMPLE_TIMESTAMP * 1000).toISOString(),
    }),
    encodeBip329Record({
      type: 'output',
      ref: `${DEV_SAMPLE_TXID}:0`,
      label: 'Developer frozen output',
      origin: DEV_SAMPLE_ORIGIN,
      keypath: '/0/7',
      spendable: false,
      value: 100_000,
      time: new Date(DEV_SAMPLE_TIMESTAMP * 1000).toISOString(),
    }),
  ].join('\n');

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

      DevSettings.addMenuItem('Test History Export Menu', () => {
        const fileNames = createHistoryExportFileNames('[Developer] Sample Wallet');
        const exportSample = async (format: 'accountingCsv' | 'accountingExcel' | 'backup', share: boolean) => {
          try {
            if (format === 'accountingCsv') {
              await writeFileAndExport(fileNames.accounting, createDeveloperAccountingSample(), share);
            } else if (format === 'accountingExcel') {
              await writeFileAndExport(fileNames.accountingExcel, createDeveloperAccountingExcelSample(), share, 'base64');
            } else {
              await writeFileAndExport(fileNames.backup, createDeveloperBip329Sample(), share);
            }
          } catch (error) {
            Alert.alert('Sample export failed', error instanceof Error ? error.message : String(error));
          }
        };
        const showAccountingFormats = (share: boolean) => {
          Alert.alert('Accounting', 'Export transaction records for bookkeeping. Choose a file format.', [
            {
              text: 'CSV',
              onPress: async () => await exportSample('accountingCsv', share),
            },
            {
              text: 'Excel / Apple Numbers (.xlsx)',
              onPress: async () => await exportSample('accountingExcel', share),
            },
            { text: 'Cancel', style: 'cancel' },
          ]);
        };

        const showBackupFormats = (share: boolean) => {
          Alert.alert('Backup', 'Export portable Bitcoin wallet labels and notes using the BIP-329 standard.', [
            {
              text: 'BIP-329 JSONL',
              onPress: async () => await exportSample('backup', share),
            },
            { text: 'Cancel', style: 'cancel' },
          ]);
        };

        const showCategories = (share: boolean) => {
          Alert.alert(
            share ? 'Share Sample History' : 'Save Sample History',
            'Choose Accounting for bookkeeping or Backup for portable Bitcoin wallet labels and notes.',
            [
              { text: 'Accounting', onPress: () => showAccountingFormats(share) },
              { text: 'Backup', onPress: () => showBackupFormats(share) },
              { text: 'Cancel', style: 'cancel' },
            ],
          );
        };

        Alert.alert('Export Sample History', 'Choose how to deliver the sample export', [
          { text: 'Share', onPress: () => showCategories(true) },
          { text: 'Save', onPress: () => showCategories(false) },
          { text: 'Cancel', style: 'cancel' },
        ]);
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
