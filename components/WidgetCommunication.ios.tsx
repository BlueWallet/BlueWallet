import React, { useEffect, useCallback } from 'react';
import DefaultPreference from 'react-native-default-preference';
import { TWallet, Transaction } from '../class/wallets/types';
import { useSettings } from '../hooks/context/useSettings';
import { useStorage } from '../hooks/context/useStorage';
import { GROUP_IO_BLUEWALLET } from '../blue_modules/currency';

enum WidgetCommunicationKeys {
  AllWalletsSatoshiBalance = 'WidgetCommunicationAllWalletsSatoshiBalance',
  AllWalletsLatestTransactionTime = 'WidgetCommunicationAllWalletsLatestTransactionTime',
  DisplayBalanceAllowed = 'WidgetCommunicationDisplayBalanceAllowed',
  LatestTransactionIsUnconfirmed = 'WidgetCommunicationLatestTransactionIsUnconfirmed',
}

export const isBalanceDisplayAllowed = async (): Promise<boolean> => {
  try {
    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
    const displayBalance = await DefaultPreference.get(WidgetCommunicationKeys.DisplayBalanceAllowed);
    return displayBalance === '1';
  } catch {
    await setBalanceDisplayAllowed(true);
    return true;
  }
};

export const setBalanceDisplayAllowed = async (value: boolean): Promise<void> => {
  await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
  if (value) {
    await DefaultPreference.set(WidgetCommunicationKeys.DisplayBalanceAllowed, '1');
  } else {
    await DefaultPreference.clear(WidgetCommunicationKeys.DisplayBalanceAllowed);
  }
};

const allWalletsBalanceAndTransactionTime = async (
  wallets: TWallet[],
  walletsInitialized: boolean,
): Promise<{ allWalletsBalance: number; latestTransactionTime: number | string }> => {
  if (!walletsInitialized || !(await isBalanceDisplayAllowed())) {
    return { allWalletsBalance: 0, latestTransactionTime: 0 };
  }
  let balance = 0;
  let latestTransactionTime: number | string = 0;

  for (const wallet of wallets) {
    if (wallet.hideBalance) continue;
    balance += await wallet.getBalance();

    const transactions: Transaction[] = await wallet.getTransactions();
    for (const transaction of transactions) {
      const transactionTime = await wallet.getLatestTransactionTimeEpoch();
      if (transaction.confirmations > 0 && transactionTime > Number(latestTransactionTime)) {
        latestTransactionTime = transactionTime;
      }
    }

    if (latestTransactionTime === 0 && transactions[0]?.confirmations === 0) {
      latestTransactionTime = WidgetCommunicationKeys.LatestTransactionIsUnconfirmed;
    }
  }

  return { allWalletsBalance: balance, latestTransactionTime };
};

const WidgetCommunication: React.FC = () => {
  const { wallets, walletsInitialized } = useStorage();
  const { isWidgetBalanceDisplayAllowed } = useSettings();

  const syncWidgetBalanceWithWallets = useCallback(async (): Promise<void> => {
    try {
      await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
      const { allWalletsBalance, latestTransactionTime } = await allWalletsBalanceAndTransactionTime(wallets, walletsInitialized);
      await Promise.all([
        DefaultPreference.set(WidgetCommunicationKeys.AllWalletsSatoshiBalance, String(allWalletsBalance)),
        DefaultPreference.set(WidgetCommunicationKeys.AllWalletsLatestTransactionTime, String(latestTransactionTime)),
      ]);
    } catch (error) {
      console.error('Failed to sync widget balance with wallets:', error);
    }
  }, [wallets, walletsInitialized]);

  useEffect(() => {
    if (walletsInitialized) {
      syncWidgetBalanceWithWallets();
    }
  }, [wallets, walletsInitialized, isWidgetBalanceDisplayAllowed, syncWidgetBalanceWithWallets]);

  return null;
};

export default WidgetCommunication;
