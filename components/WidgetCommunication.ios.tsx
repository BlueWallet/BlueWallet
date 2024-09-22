import React, { useEffect, useCallback } from 'react';
import { TWallet, Transaction } from '../class/wallets/types';
import { useSettings } from '../hooks/context/useSettings';
import { useStorage } from '../hooks/context/useStorage';
import { clearUserPreference, getUserPreference, setUserPreference } from '../helpers/userPreference';

enum WidgetCommunicationKeys {
  AllWalletsSatoshiBalance = 'WidgetCommunicationAllWalletsSatoshiBalance',
  AllWalletsLatestTransactionTime = 'WidgetCommunicationAllWalletsLatestTransactionTime',
  DisplayBalanceAllowed = 'WidgetCommunicationDisplayBalanceAllowed',
  LatestTransactionIsUnconfirmed = 'WidgetCommunicationLatestTransactionIsUnconfirmed',
}

export const isBalanceDisplayAllowed = async (): Promise<boolean> => {
  try {
    const displayBalance = await getUserPreference({
      key: WidgetCommunicationKeys.DisplayBalanceAllowed,
      useGroupContainer: false,
      migrateToGroupContainer: true,
    });
    return Boolean(displayBalance);
  } catch {
    await setBalanceDisplayAllowed(true);
    return true;
  }
};

export const setBalanceDisplayAllowed = async (value: boolean): Promise<void> => {
  if (value) {
    await setUserPreference({
      key: WidgetCommunicationKeys.DisplayBalanceAllowed,
      value: true,
      useGroupContainer: false,
    });
  } else {
    await clearUserPreference({
      key: WidgetCommunicationKeys.DisplayBalanceAllowed,
      useGroupContainer: false,
    });
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
      const { allWalletsBalance, latestTransactionTime } = await allWalletsBalanceAndTransactionTime(wallets, walletsInitialized);
      await Promise.all([
        setUserPreference({
          key: WidgetCommunicationKeys.AllWalletsSatoshiBalance,
          value: String(allWalletsBalance),
          useGroupContainer: false,
        }),
        setUserPreference({
          key: WidgetCommunicationKeys.AllWalletsLatestTransactionTime,
          value: String(latestTransactionTime),
          useGroupContainer: false,
        }),
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
