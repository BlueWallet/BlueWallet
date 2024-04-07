import React, { useContext, useEffect, useMemo } from 'react';
import DefaultPreference from 'react-native-default-preference';
// @ts-ignore: fix later
import RNWidgetCenter from 'react-native-widget-center';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlueStorageContext } from '../blue_modules/storage-context';
import { TWallet, Transaction } from '../class/wallets/types';

enum WidgetCommunicationKeys {
  AllWalletsSatoshiBalance = 'WidgetCommunicationAllWalletsSatoshiBalance',
  AllWalletsLatestTransactionTime = 'WidgetCommunicationAllWalletsLatestTransactionTime',
  DisplayBalanceAllowed = 'WidgetCommunicationDisplayBalanceAllowed',
  LatestTransactionIsUnconfirmed = 'WidgetCommunicationLatestTransactionIsUnconfirmed',
}

export const isBalanceDisplayAllowed = async (): Promise<boolean> => {
  try {
    const displayBalance = await AsyncStorage.getItem(WidgetCommunicationKeys.DisplayBalanceAllowed);
    return displayBalance !== null ? JSON.parse(displayBalance) : true;
  } catch {
    return true;
  }
};

export const setBalanceDisplayAllowed = async (value: boolean): Promise<void> => {
  await AsyncStorage.setItem(WidgetCommunicationKeys.DisplayBalanceAllowed, JSON.stringify(value));
  reloadAllTimelines();
};

export const reloadAllTimelines = (): void => {
  RNWidgetCenter.reloadAllTimelines();
};

const WidgetCommunication: React.FC = () => {
  const { wallets, walletsInitialized } = useContext(BlueStorageContext);

  const serializedWallets = useMemo(
    () =>
      JSON.stringify(
        wallets.map(wallet => ({
          balance: wallet.getBalance(),
          latestTransactionTimeEpoch: wallet.getLatestTransactionTimeEpoch(),
          transactions: wallet.getTransactions().map((tx: Transaction) => ({
            confirmations: tx.confirmations,
          })),
          hideBalance: wallet.hideBalance,
        })),
      ),
    [wallets],
  );

  const allWalletsBalanceAndTransactionTime = async (): Promise<{ allWalletsBalance: number; latestTransactionTime: number | string }> => {
    if (!walletsInitialized || !(await isBalanceDisplayAllowed())) {
      return { allWalletsBalance: 0, latestTransactionTime: 0 };
    } else {
      let balance = 0;
      let latestTransactionTime: number | string = 0; // Can be a number or the special string
      wallets.forEach((wallet: TWallet) => {
        if (wallet.hideBalance) return;
        balance += wallet.getBalance();
        const walletLatestTime = wallet.getLatestTransactionTimeEpoch();

        // Ensure we only compare numbers; ignore comparison if latestTransactionTime is a string
        if (typeof latestTransactionTime === 'number' && walletLatestTime > latestTransactionTime) {
          // Check if the latest transaction is unconfirmed
          if (wallet.getTransactions()[0]?.confirmations === 0) {
            latestTransactionTime = WidgetCommunicationKeys.LatestTransactionIsUnconfirmed;
          } else {
            latestTransactionTime = walletLatestTime;
          }
        }
      });
      return { allWalletsBalance: balance, latestTransactionTime };
    }
  };

  const setValues = async (): Promise<void> => {
    await DefaultPreference.setName('group.io.bluewallet.bluewallet');
    const { allWalletsBalance, latestTransactionTime } = await allWalletsBalanceAndTransactionTime();
    await DefaultPreference.set(WidgetCommunicationKeys.AllWalletsSatoshiBalance, JSON.stringify(allWalletsBalance));
    await DefaultPreference.set(WidgetCommunicationKeys.AllWalletsLatestTransactionTime, JSON.stringify(latestTransactionTime));
    RNWidgetCenter.reloadAllTimelines();
  };

  useEffect(() => {
    if (walletsInitialized) {
      setValues();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serializedWallets, walletsInitialized]);

  return null;
};

export default WidgetCommunication;
