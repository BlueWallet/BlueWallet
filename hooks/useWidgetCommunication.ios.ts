import { useEffect, useRef } from 'react';
import DefaultPreference from 'react-native-default-preference';
import { Transaction, TWallet } from '../class/wallets/types';
import { useSettings } from '../hooks/context/useSettings';
import { useStorage } from '../hooks/context/useStorage';
import { GROUP_IO_BLUEWALLET } from '../blue_modules/currency';
import debounce from '../blue_modules/debounce';
import NativeWidgetHelper from '../blue_modules/NativeWidgetHelper';
import {
  calculatePendingOnchainTransactions,
  createPendingTransactionsSharedSnapshot,
  createPendingTransactionsWatchConfiguration,
} from '../blue_modules/pendingTransactions';
import type { PendingTransactionsWatchConfiguration } from '../blue_modules/pendingTransactions';

enum WidgetCommunicationKeys {
  AllWalletsSatoshiBalance = 'WidgetCommunicationAllWalletsSatoshiBalance',
  AllWalletsLatestTransactionTime = 'WidgetCommunicationAllWalletsLatestTransactionTime',
  DisplayBalanceAllowed = 'WidgetCommunicationDisplayBalanceAllowed',
  LatestTransactionIsUnconfirmed = 'WidgetCommunicationLatestTransactionIsUnconfirmed',
  PendingTransactionsLiveActivityEnabled = 'PendingTransactionsLiveActivityEnabled',
  PendingTransactionsLiveActivitySnapshot = 'PendingTransactionsLiveActivitySnapshot',
  PendingTransactionsLiveActivityWatchConfiguration = 'PendingTransactionsLiveActivityWatchConfiguration',
}

const WIDGET_ENABLED = '1';
const WIDGET_DISABLED = '0';
const WIDGET_CLEARED_VALUE = '0';
const DISABLED_PENDING_TRANSACTIONS_CONFIGURATION = JSON.stringify(
  createPendingTransactionsWatchConfiguration([], false),
);
const EMPTY_PENDING_TRANSACTIONS_SNAPSHOT = JSON.stringify(
  createPendingTransactionsSharedSnapshot({ pendingTransactionCount: 0, totalPendingSats: 0 }),
);

const secondsToMilliseconds = (seconds: number): number => seconds * 1000;

DefaultPreference.setName(GROUP_IO_BLUEWALLET);

export const isBalanceDisplayAllowed = async (): Promise<boolean> => {
  try {
    const displayBalance = await DefaultPreference.get(WidgetCommunicationKeys.DisplayBalanceAllowed);
    if (displayBalance === WIDGET_ENABLED) {
      return true;
    } else if (displayBalance === WIDGET_DISABLED) {
      return false;
    } else {
      // Preference not set, initialize to enabled by default
      await DefaultPreference.set(WidgetCommunicationKeys.DisplayBalanceAllowed, WIDGET_ENABLED);
      return true;
    }
  } catch (error) {
    console.error('Failed to get DisplayBalanceAllowed:', error);
    return true;
  }
};

export const setBalanceDisplayAllowed = async (allowed: boolean): Promise<void> => {
  try {
    if (allowed) {
      await DefaultPreference.set(WidgetCommunicationKeys.DisplayBalanceAllowed, WIDGET_ENABLED);
    } else {
      await DefaultPreference.set(WidgetCommunicationKeys.DisplayBalanceAllowed, WIDGET_DISABLED);
      await Promise.all([
        DefaultPreference.set(WidgetCommunicationKeys.AllWalletsSatoshiBalance, WIDGET_CLEARED_VALUE),
        DefaultPreference.set(WidgetCommunicationKeys.AllWalletsLatestTransactionTime, WIDGET_CLEARED_VALUE),
      ]);
    }
    console.debug('setBalanceDisplayAllowed:', allowed);
  } catch (error) {
    console.error('Failed to set DisplayBalanceAllowed:', error);
  }
};

export const isPendingTransactionsLiveActivityEnabled = async (): Promise<boolean> => {
  try {
    const enabled = await DefaultPreference.get(WidgetCommunicationKeys.PendingTransactionsLiveActivityEnabled);
    if (enabled === WIDGET_DISABLED) return false;
    if (enabled !== WIDGET_ENABLED) {
      await DefaultPreference.set(WidgetCommunicationKeys.PendingTransactionsLiveActivityEnabled, WIDGET_ENABLED);
    }
    return true;
  } catch (error) {
    console.error('Failed to get PendingTransactionsLiveActivityEnabled:', error);
    return true;
  }
};

export const setPendingTransactionsLiveActivityEnabled = async (enabled: boolean): Promise<void> => {
  try {
    await DefaultPreference.set(WidgetCommunicationKeys.PendingTransactionsLiveActivityEnabled, enabled ? WIDGET_ENABLED : WIDGET_DISABLED);

    if (!enabled) {
      await Promise.all([
        DefaultPreference.set(
          WidgetCommunicationKeys.PendingTransactionsLiveActivityWatchConfiguration,
          DISABLED_PENDING_TRANSACTIONS_CONFIGURATION,
        ),
        DefaultPreference.set(WidgetCommunicationKeys.PendingTransactionsLiveActivitySnapshot, EMPTY_PENDING_TRANSACTIONS_SNAPSHOT),
      ]);
    }

    NativeWidgetHelper.refreshPendingTransactionsLiveActivity();
  } catch (error) {
    console.error('Failed to set PendingTransactionsLiveActivityEnabled:', error);
  }
};

export const calculateBalanceAndTransactionTime = async (
  wallets: TWallet[],
  walletsInitialized: boolean,
): Promise<{
  allWalletsBalance: number;
  latestTransactionTime: number | string;
  pendingTransactionCount: number;
  totalPendingSats: number;
  pendingTransactionsWatchConfiguration: PendingTransactionsWatchConfiguration;
}> => {
  if (!walletsInitialized) {
    return {
      allWalletsBalance: 0,
      latestTransactionTime: 0,
      pendingTransactionCount: 0,
      totalPendingSats: 0,
      pendingTransactionsWatchConfiguration: createPendingTransactionsWatchConfiguration([], false),
    };
  }

  const [balanceDisplayAllowed, liveActivityEnabled] = await Promise.all([
    isBalanceDisplayAllowed(),
    isPendingTransactionsLiveActivityEnabled(),
  ]);

  let allWalletsBalance = 0;
  let latestTransactionTime: number | string = 0;

  if (balanceDisplayAllowed) {
    const results = await Promise.allSettled(
      wallets.map(async wallet => {
        if (wallet.hideBalance) return { balance: 0, latestTransactionTime: 0 };

        const balance = await wallet.getBalance();
        const transactions: Transaction[] = await wallet.getTransactions();
        const confirmedTransactions = transactions.filter(t => (t.confirmations ?? 0) > 0);
        const walletLatestTransactionTime =
          confirmedTransactions.length > 0
            ? secondsToMilliseconds(Math.max(...confirmedTransactions.map(t => t.timestamp || t.time || 0)))
            : WidgetCommunicationKeys.LatestTransactionIsUnconfirmed;

        return { balance, latestTransactionTime: walletLatestTransactionTime };
      }),
    );

    allWalletsBalance = results.reduce((acc, result) => acc + (result.status === 'fulfilled' ? result.value.balance : 0), 0);
    latestTransactionTime = results.reduce<number | string>(
      (max, result) =>
        result.status === 'fulfilled' &&
        typeof result.value.latestTransactionTime === 'number' &&
        typeof max === 'number' &&
        result.value.latestTransactionTime > max
          ? result.value.latestTransactionTime
          : max,
      0,
    );
  }

  const { pendingTransactionCount, totalPendingSats } = liveActivityEnabled
    ? calculatePendingOnchainTransactions(wallets)
    : { pendingTransactionCount: 0, totalPendingSats: 0 };
  const pendingTransactionsWatchConfiguration = createPendingTransactionsWatchConfiguration(wallets, liveActivityEnabled);

  return {
    allWalletsBalance,
    latestTransactionTime,
    pendingTransactionCount,
    totalPendingSats,
    pendingTransactionsWatchConfiguration,
  };
};

export const syncWidgetBalanceWithWallets = async (
  wallets: TWallet[],
  walletsInitialized: boolean,
  cachedBalance: { current: number },
  cachedLatestTransactionTime: { current: number | string },
  cachedPendingTransactionCount: { current: number },
  cachedTotalPendingSats: { current: number },
  cachedPendingTransactionsWatchConfiguration: { current: string },
): Promise<void> => {
  try {
    const {
      allWalletsBalance,
      latestTransactionTime,
      pendingTransactionCount,
      totalPendingSats,
      pendingTransactionsWatchConfiguration,
    } = await calculateBalanceAndTransactionTime(wallets, walletsInitialized);
    const encodedWatchConfiguration = JSON.stringify(pendingTransactionsWatchConfiguration);

    if (
      cachedBalance.current !== allWalletsBalance ||
      cachedLatestTransactionTime.current !== latestTransactionTime ||
      cachedPendingTransactionCount.current !== pendingTransactionCount ||
      cachedTotalPendingSats.current !== totalPendingSats ||
      cachedPendingTransactionsWatchConfiguration.current !== encodedWatchConfiguration
    ) {
      const encodedSnapshot = JSON.stringify(
        createPendingTransactionsSharedSnapshot({ pendingTransactionCount, totalPendingSats }),
      );
      await Promise.all([
        DefaultPreference.set(WidgetCommunicationKeys.AllWalletsSatoshiBalance, String(allWalletsBalance)),
        DefaultPreference.set(WidgetCommunicationKeys.AllWalletsLatestTransactionTime, String(latestTransactionTime)),
        DefaultPreference.set(
          WidgetCommunicationKeys.PendingTransactionsLiveActivityWatchConfiguration,
          encodedWatchConfiguration,
        ),
        DefaultPreference.set(WidgetCommunicationKeys.PendingTransactionsLiveActivitySnapshot, encodedSnapshot),
      ]);
      NativeWidgetHelper.refreshPendingTransactionsLiveActivity();

      cachedBalance.current = allWalletsBalance;
      cachedLatestTransactionTime.current = latestTransactionTime;
      cachedPendingTransactionCount.current = pendingTransactionCount;
      cachedTotalPendingSats.current = totalPendingSats;
      cachedPendingTransactionsWatchConfiguration.current = encodedWatchConfiguration;
    }
  } catch (error) {
    console.error('Failed to sync widget balance with wallets:', error);
  }
};

const debouncedSyncWidgetBalanceWithWallets = debounce(
  async (
    wallets: TWallet[],
    walletsInitialized: boolean,
    cachedBalance: { current: number },
    cachedLatestTransactionTime: { current: number | string },
    cachedPendingTransactionCount: { current: number },
    cachedTotalPendingSats: { current: number },
    cachedPendingTransactionsWatchConfiguration: { current: string },
  ) => {
    await syncWidgetBalanceWithWallets(
      wallets,
      walletsInitialized,
      cachedBalance,
      cachedLatestTransactionTime,
      cachedPendingTransactionCount,
      cachedTotalPendingSats,
      cachedPendingTransactionsWatchConfiguration,
    );
  },
  500,
);

const useWidgetCommunication = (): void => {
  const { wallets, walletsInitialized } = useStorage();
  const { isDynamicIslandEnabled, isWidgetBalanceDisplayAllowed } = useSettings();
  const cachedBalance = useRef<number>(0);
  const cachedLatestTransactionTime = useRef<number | string>(0);
  const cachedPendingTransactionCount = useRef<number>(-1);
  const cachedTotalPendingSats = useRef<number>(-1);
  const cachedPendingTransactionsWatchConfiguration = useRef<string>('');

  // Keep the two privacy controls independent: one clears home-screen widget
  // balances, while the other ends and clears the pending-transactions activity.
  useEffect(() => {
    const clearWidgetData = async () => {
      if (walletsInitialized && !isWidgetBalanceDisplayAllowed) {
        try {
          await Promise.all([
            DefaultPreference.set(WidgetCommunicationKeys.AllWalletsSatoshiBalance, WIDGET_CLEARED_VALUE),
            DefaultPreference.set(WidgetCommunicationKeys.AllWalletsLatestTransactionTime, WIDGET_CLEARED_VALUE),
          ]);
          cachedBalance.current = 0;
          cachedLatestTransactionTime.current = 0;
          console.debug('Widget data cleared due to setting being disabled');
        } catch (error) {
          console.error('Failed to clear widget data:', error);
        }
      }
    };

    clearWidgetData();
  }, [isWidgetBalanceDisplayAllowed, walletsInitialized]);

  useEffect(() => {
    const clearLiveActivityData = async () => {
      if (walletsInitialized && !isDynamicIslandEnabled) {
        try {
          await Promise.all([
            DefaultPreference.set(
              WidgetCommunicationKeys.PendingTransactionsLiveActivityWatchConfiguration,
              DISABLED_PENDING_TRANSACTIONS_CONFIGURATION,
            ),
            DefaultPreference.set(WidgetCommunicationKeys.PendingTransactionsLiveActivitySnapshot, EMPTY_PENDING_TRANSACTIONS_SNAPSHOT),
          ]);
          NativeWidgetHelper.refreshPendingTransactionsLiveActivity();
          cachedPendingTransactionCount.current = 0;
          cachedTotalPendingSats.current = 0;
          cachedPendingTransactionsWatchConfiguration.current = DISABLED_PENDING_TRANSACTIONS_CONFIGURATION;
          console.debug('Dynamic Island data cleared due to setting being disabled');
        } catch (error) {
          console.error('Failed to clear Dynamic Island data:', error);
        }
      }
    };

    clearLiveActivityData();
  }, [isDynamicIslandEnabled, walletsInitialized]);

  // Sync widget data when wallets change or setting is enabled
  useEffect(() => {
    if (walletsInitialized) {
      debouncedSyncWidgetBalanceWithWallets(
        wallets,
        walletsInitialized,
        cachedBalance,
        cachedLatestTransactionTime,
        cachedPendingTransactionCount,
        cachedTotalPendingSats,
        cachedPendingTransactionsWatchConfiguration,
      );
    }
  }, [wallets, walletsInitialized, isDynamicIslandEnabled, isWidgetBalanceDisplayAllowed]);

  useEffect(() => {
    return () => {
      debouncedSyncWidgetBalanceWithWallets.cancel();
    };
  }, []);
};

export default useWidgetCommunication;
