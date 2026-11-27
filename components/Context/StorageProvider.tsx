import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutAnimation } from 'react-native';
import { BlueApp as BlueAppClass, TCounterpartyMetadata, TTXMetadata } from '../../class/blue-app';
import type { TWallet } from '../../class/wallets/types';
import presentAlert from '../../components/Alert';
import loc, { formatBalanceWithoutSuffix } from '../../loc';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { startAndDecrypt } from '../../blue_modules/start-and-decrypt';
import { isNotificationsEnabled, syncGroundControlSubscriptions, TSubscriptionEntry, unsubscribe } from '../../blue_modules/notifications';
import { isNeuraiWallet } from '../../class/wallets/is-neurai-wallet';
import { isTestnetChain } from '../../blue_modules/neurai/networkConfig';
import { onWalletChanged } from '../../blue_modules/neurai/eventBus';
import { XnaUnit } from '../../models/xnaUnits';
import { navigationRef } from '../../NavigationService';
import { StorageWriteError } from '../../class/storage-errors';

const BlueApp = BlueAppClass.getInstance();

// hashmap of timestamps we _started_ refetching some wallet
const _lastTimeTriedToRefetchWallet: { [walletID: string]: number } = {};

const SAVE_ALERT_INTERVAL_MS = 60_000;
/** Upper bound for one refresh of every wallet. */
const REFRESH_TIMEOUT_MS = 120_000;
let lastSaveAlertAt = 0;

/**
 * Tells the user that wallets were not saved, at most once a minute: a broken
 * keystore fails every refresh, and one alert per refresh helps no one.
 * Returns the error marked as reported.
 */
function reportSaveFailure(error: unknown): unknown {
  console.error('saving wallets failed:', (error as Error)?.message);
  const now = Date.now();
  if (now - lastSaveAlertAt >= SAVE_ALERT_INTERVAL_MS) {
    lastSaveAlertAt = now;
    presentAlert({ message: loc.settings.storage_save_failed });
  }
  if (error instanceof StorageWriteError) error.reported = true;
  return error;
}

interface StorageContextType {
  wallets: TWallet[];
  setWalletsWithNewOrder: (wallets: TWallet[]) => void;
  txMetadata: TTXMetadata;
  counterpartyMetadata: TCounterpartyMetadata;
  saveToDisk: (force?: boolean) => Promise<void>;
  selectedWalletID: () => string | undefined; // Change from string|undefined to a function
  addWallet: (wallet: TWallet) => void;
  addWalletAndSave: (wallet: TWallet) => Promise<void>;
  deleteWallet: (wallet: TWallet) => void;
  currentSharedCosigner: string;
  setSharedCosigner: (cosigner: string) => void;
  fetchAndSaveWalletTransactions: (walletID: string) => Promise<void>;
  walletsInitialized: boolean;
  setWalletsInitialized: (initialized: boolean) => void;
  refreshAllWalletTransactions: (lastSnappedTo?: number, showUpdateStatusIndicator?: boolean) => Promise<void>;
  walletTransactionUpdateStatus: WalletTransactionsStatus | string;
  setWalletTransactionUpdateStatus: (status: WalletTransactionsStatus | string) => void;
  getTransactions: typeof BlueApp.getTransactions;
  fetchWalletBalances: typeof BlueApp.fetchWalletBalances;
  fetchWalletTransactions: typeof BlueApp.fetchWalletTransactions;
  getBalance: typeof BlueApp.getBalance;
  isStorageEncrypted: typeof BlueApp.storageIsEncrypted;
  startAndDecrypt: typeof startAndDecrypt;
  encryptStorage: typeof BlueApp.encryptStorage;
  sleep: typeof BlueApp.sleep;
  decryptStorage: typeof BlueApp.decryptStorage;
  canUpgradeEncryption: typeof BlueApp.canUpgradeEncryption;
  upgradeEncryption: typeof BlueApp.upgradeEncryption;
  hasOlderBackupCopies: typeof BlueApp.hasOlderBackupCopies;
  cachedPassword: typeof BlueApp.cachedPassword;
  getItem: typeof BlueApp.getItem;
  setItem: typeof BlueApp.setItem;
  handleWalletDeletion: (walletID: string, forceDelete?: boolean) => Promise<boolean>;
  confirmWalletDeletion: (wallet: any, onConfirmed: () => void) => void;
}

export enum WalletTransactionsStatus {
  NONE = 'NONE',
  ALL = 'ALL',
}

// @ts-ignore default value does not match the type
export const StorageContext = createContext<StorageContextType>(undefined);

export const StorageProvider = ({ children }: { children: React.ReactNode }) => {
  const txMetadata = useRef<TTXMetadata>(BlueApp.tx_metadata);
  const counterpartyMetadata = useRef<TCounterpartyMetadata>(BlueApp.counterparty_metadata || {}); // init

  const [wallets, setWallets] = useState<TWallet[]>([]);
  const [walletTransactionUpdateStatus, setWalletTransactionUpdateStatus] = useState<WalletTransactionsStatus | string>(
    WalletTransactionsStatus.NONE,
  );
  const [walletsInitialized, setWalletsInitialized] = useState<boolean>(false);
  const [currentSharedCosigner, setCurrentSharedCosigner] = useState<string>('');

  const selectedWalletID = useCallback((): string | undefined => {
    if (!navigationRef.current || !navigationRef.current.isReady()) return undefined;

    const screensToCheck = ['LNDCreateInvoice', 'SendDetails', 'WalletTransactions', 'TransactionStatus'];

    const currentRoute = navigationRef.current.getCurrentRoute();
    console.debug('[StorageProvider] Current route:', currentRoute?.name);

    if (currentRoute) {
      if (screensToCheck.includes(currentRoute.name) && currentRoute.params) {
        const params = currentRoute.params as { walletID?: string };
        if (params.walletID) {
          console.debug('[StorageProvider] selectedWalletID from current route:', params.walletID);
          return params.walletID;
        }
      }
    }

    const state = navigationRef.current.getState();

    if (state?.routes) {
      for (const screenName of screensToCheck) {
        const walletID = findWalletIDInNavigationState(state.routes, screenName);
        if (walletID) {
          console.debug('[StorageProvider] selectedWalletID from navigation state:', walletID, 'in screen:', screenName);
          return walletID;
        }
      }

      const drawerRoute = state.routes.find(route => route.name === 'DrawerRoot');
      if (drawerRoute?.state?.routes) {
        const detailViewStack = drawerRoute.state.routes.find(route => route.name === 'DetailViewStackScreensStack');
        if (detailViewStack?.state?.routes) {
          for (const route of detailViewStack.state.routes) {
            if (screensToCheck.includes(route.name) && (route.params as { walletID?: string })?.walletID) {
              console.debug(
                '[StorageProvider] selectedWalletID from drawer navigation:',
                (route.params as { walletID?: string })?.walletID,
              );
              return (route.params as { walletID?: string })?.walletID;
            }
          }
        }
      }
    }

    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const findWalletIDInNavigationState = (routes: any[], screenName: string): string | undefined => {
    for (let i = routes.length - 1; i >= 0; i--) {
      const route = routes[i];

      if (route.name === screenName && (route.params as { walletID?: string }).walletID) {
        return (route.params as { walletID?: string }).walletID;
      }

      if (route.state?.routes) {
        const walletID = findWalletIDInNavigationState(route.state.routes, screenName);
        if (walletID) return walletID;
      }

      if (route.params?.screen === screenName && route.params?.params?.walletID) {
        return route.params.params.walletID;
      }

      if (route.name === 'DetailViewStackScreensStack' && route.params?.screen === screenName && route.params?.params?.walletID) {
        return route.params.params.walletID;
      }
    }

    return undefined;
  };

  /**
   * Rejects when the wallets were not written. The user is told here, once
   * (see `reportSaveFailure`); the rejection carries `reported` so awaiting
   * screens stop their success path without a second alert (H03).
   */
  const saveToDisk = useCallback(
    async (force: boolean = false) => {
      if (!force && BlueApp.getWallets().length === 0) {
        console.debug('Not saving empty wallets array');
        return;
      }
      BlueApp.tx_metadata = txMetadata.current;
      BlueApp.counterparty_metadata = counterpartyMetadata.current;
      try {
        await BlueApp.saveToDisk();
      } catch (error) {
        throw reportSaveFailure(error);
      } finally {
        setWallets([...BlueApp.getWallets()]);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [txMetadata.current, counterpartyMetadata.current],
  );

  /** Throws when a wallet with the same identity is already loaded: one ID must name one wallet (H02). */
  const addWallet = useCallback((wallet: TWallet) => {
    const id = wallet.getID();
    if (BlueApp.wallets.some(existing => existing.getID() === id)) throw new Error(loc.wallets.import_already_loaded);
    BlueApp.wallets.push(wallet);
    setWallets([...BlueApp.getWallets()]);
  }, []);

  /**
   * Adds and persists a new wallet. When the save fails the wallet is taken
   * out again, so the list never shows a wallet the disk does not hold, and
   * the (already reported) error is rethrown (H03).
   */
  const addWalletAndSave = useCallback(
    async (wallet: TWallet) => {
      addWallet(wallet);
      try {
        await saveToDisk();
      } catch (error) {
        BlueApp.deleteWallet(wallet);
        setWallets([...BlueApp.getWallets()]);
        throw error;
      }
    },
    [addWallet, saveToDisk],
  );

  const deleteWallet = useCallback((wallet: TWallet) => {
    BlueApp.deleteWallet(wallet);
    setWallets([...BlueApp.getWallets()]);
  }, []);

  const handleWalletDeletion = useCallback(
    async (walletID: string, forceDelete = false): Promise<boolean> => {
      console.debug(`handleWalletDeletion: invoked for walletID ${walletID}`);
      const wallet = wallets.find(w => w.getID() === walletID);
      if (!wallet) {
        console.warn(`handleWalletDeletion: wallet not found for ${walletID}`);
        return false;
      }

      // The deletion is undone in memory when it could not be saved, so the
      // list keeps showing what the disk holds (H03).
      const deleteAndSave = async (): Promise<boolean> => {
        const removal = BlueApp.deleteWallet(wallet);
        setWallets([...BlueApp.getWallets()]);
        try {
          await saveToDisk(true);
        } catch (error) {
          removal.undo();
          setWallets([...BlueApp.getWallets()]);
          triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
          console.error(`handleWalletDeletion: saving the deletion of ${walletID} failed`, error);
          return false;
        }
        triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
        return true;
      };

      if (forceDelete) return deleteAndSave();

      let isNotificationsSettingsEnabled = false;
      try {
        isNotificationsSettingsEnabled = await isNotificationsEnabled();
      } catch (error) {
        console.error(`handleWalletDeletion: error checking notifications for wallet ${walletID}`, error);
        return await new Promise<boolean>(resolve => {
          presentAlert({
            title: loc.errors.error,
            message: loc.wallets.details_delete_wallet_error_message,
            buttons: [
              {
                text: loc.wallets.details_delete_anyway,
                onPress: async () => {
                  const result = await handleWalletDeletion(walletID, true);
                  resolve(result);
                },
                style: 'destructive',
              },
              {
                text: loc.wallets.list_tryagain,
                onPress: async () => {
                  const result = await handleWalletDeletion(walletID);
                  resolve(result);
                },
              },
              {
                text: loc._.cancel,
                onPress: () => resolve(false),
                style: 'cancel',
              },
            ],
            options: { cancelable: false },
          });
        });
      }

      try {
        if (isNotificationsSettingsEnabled) {
          const externalAddresses = wallet.getAllExternalAddresses();
          if (externalAddresses.length > 0) {
            console.debug(`handleWalletDeletion: unsubscribing addresses for wallet ${walletID}`);
            const walletChain = isNeuraiWallet(wallet) ? (isTestnetChain(wallet.network) ? 'testnet' : 'mainnet') : 'mainnet';
            try {
              await unsubscribe(externalAddresses, [], [], walletChain);
              console.debug(`handleWalletDeletion: unsubscribe succeeded for wallet ${walletID}`);
            } catch (unsubscribeError) {
              console.error(`handleWalletDeletion: unsubscribe failed for wallet ${walletID}`, unsubscribeError);
              presentAlert({
                title: loc.errors.error,
                message: loc.wallets.details_delete_wallet_error_message,
                buttons: [{ text: loc._.ok, onPress: () => {} }],
                options: { cancelable: false },
              });
              return false;
            }
          }
        }
        const deleted = await deleteAndSave();
        if (deleted) console.debug(`handleWalletDeletion: wallet ${walletID} deleted successfully`);
        return deleted;
      } catch (e: unknown) {
        console.error(`handleWalletDeletion: encountered error for wallet ${walletID}`, e);
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        return await new Promise<boolean>(resolve => {
          presentAlert({
            title: loc.errors.error,
            message: loc.wallets.details_delete_wallet_error_message,
            buttons: [
              {
                text: loc.wallets.details_delete_anyway,
                onPress: async () => {
                  const result = await handleWalletDeletion(walletID, true);
                  resolve(result);
                },
                style: 'destructive',
              },
              {
                text: loc.wallets.list_tryagain,
                onPress: async () => {
                  const result = await handleWalletDeletion(walletID);
                  resolve(result);
                },
              },
              {
                text: loc._.cancel,
                onPress: () => resolve(false),
                style: 'cancel',
              },
            ],
            options: { cancelable: false },
          });
        });
      }
    },
    [saveToDisk, wallets],
  );

  const setWalletsWithNewOrder = useCallback(
    (wlts: TWallet[]) => {
      BlueApp.wallets = wlts;
      // Already reported to the user by saveToDisk.
      saveToDisk().catch(() => {});
    },
    [saveToDisk],
  );

  // Initialize wallets
  useEffect(() => {
    if (walletsInitialized) {
      txMetadata.current = BlueApp.tx_metadata;
      counterpartyMetadata.current = BlueApp.counterparty_metadata;
      setWallets(BlueApp.getWallets());
    }
  }, [walletsInitialized]);

  // Keep GroundControl subscribed to every wallet address, also after its
  // database was reset. Cheap on each wallets update: the server is only
  // contacted for addresses it has not been sent yet.
  useEffect(() => {
    if (!walletsInitialized) return;
    const entries = wallets.map(
      (wallet): TSubscriptionEntry => ({
        chain: isNeuraiWallet(wallet) && isTestnetChain(wallet.network) ? 'testnet' : 'mainnet',
        addresses: wallet.getAllExternalAddresses(),
      }),
    );
    syncGroundControlSubscriptions(entries).catch(error => console.warn('GroundControl subscription sync failed:', error));
  }, [wallets, walletsInitialized]);

  // Re-render `wallets`-consuming screens when a Neurai wallet's cached
  // state changed because of a WSS push (`address.changed`). The wallet
  // mutates its own fields in place; without a fresh array identity React
  // never repaints. Persist to disk in the same tick so the new state
  // survives an app cold start.
  useEffect(() => {
    if (!walletsInitialized) return;
    const unsubscribeBus = onWalletChanged(() => {
      setWallets(BlueApp.getWallets().slice());
      BlueApp.saveToDisk().catch(err => {
        console.debug('[StorageProvider] saveToDisk after push failed', err);
      });
    });
    return unsubscribeBus;
  }, [walletsInitialized]);

  // Add a refresh lock to prevent concurrent refreshes
  const refreshingRef = useRef<boolean>(false);

  const refreshAllWalletTransactions = useCallback(
    async (lastSnappedTo?: number, showUpdateStatusIndicator: boolean = true) => {
      if (refreshingRef.current) {
        console.debug('[refreshAllWalletTransactions] Refresh already in progress');
        return;
      }
      console.debug('[refreshAllWalletTransactions] Starting refresh');
      refreshingRef.current = true;

      let refreshTimeout: ReturnType<typeof setTimeout> | undefined;

      try {
        if (showUpdateStatusIndicator) {
          console.debug('[refreshAllWalletTransactions] Setting wallet transaction status to ALL');
          setWalletTransactionUpdateStatus(WalletTransactionsStatus.ALL);
        }
        // Neurai wallets talk to their own backends (WSS/RPC); the inherited
        // Bitcoin Electrum client is always disabled, so waiting for it or for
        // the BIP47 payment-code task only delayed the refresh (H24).
        const timeoutPromise = new Promise<never>(
          (_resolve, reject) =>
            (refreshTimeout = setTimeout(() => {
              console.debug('[refreshAllWalletTransactions] Timeout reached');
              reject(new Error('Timeout reached'));
            }, REFRESH_TIMEOUT_MS)),
        );

        console.debug('[refreshAllWalletTransactions] Fetching wallet balances and transactions');
        await Promise.race([
          (async () => {
            const balanceStart = Date.now();
            await BlueApp.fetchWalletBalances(lastSnappedTo);
            console.debug('[refreshAllWalletTransactions] fetch balance took', (Date.now() - balanceStart) / 1000, 'sec');

            const txStart = Date.now();
            await BlueApp.fetchWalletTransactions(lastSnappedTo);
            console.debug('[refreshAllWalletTransactions] fetch tx took', (Date.now() - txStart) / 1000, 'sec');

            console.debug('[refreshAllWalletTransactions] Saving data to disk');
            await saveToDisk().catch(() => {}); // reported by saveToDisk
          })(),
          timeoutPromise,
        ]);
        console.debug('[refreshAllWalletTransactions] Refresh completed successfully');
      } catch (error) {
        console.error('[refreshAllWalletTransactions] Error:', error);
      } finally {
        if (refreshTimeout !== undefined) {
          clearTimeout(refreshTimeout);
        }
        console.debug('[refreshAllWalletTransactions] Resetting wallet transaction status and refresh lock');
        refreshingRef.current = false;
        setWalletTransactionUpdateStatus(WalletTransactionsStatus.NONE);
      }
    },
    [saveToDisk],
  );

  const fetchAndSaveWalletTransactions = useCallback(
    async (walletID: string) => {
      const wallet = wallets.find(w => w.getID() === walletID);
      let noErr = true;
      try {
        if (Date.now() - (_lastTimeTriedToRefetchWallet[walletID] || 0) < 5000) {
          console.debug('[fetchAndSaveWalletTransactions] Re-fetch wallet happens too fast; NOP');
          return;
        }
        _lastTimeTriedToRefetchWallet[walletID] = Date.now();

        if (wallet && isNeuraiWallet(wallet)) {
          // Neurai wallets fetch through the Neurai backend. Every stored wallet
          // is a Neurai wallet; the Bitcoin Electrum branch that used to follow
          // could not be reached (H24).
          setWalletTransactionUpdateStatus(walletID);
          const balanceStart = Date.now();
          await wallet.fetchBalance();
          console.debug('[fetchAndSaveWalletTransactions] (neurai) fetch balance took', (Date.now() - balanceStart) / 1000, 'sec');
          const txStart = Date.now();
          await wallet.fetchTransactions();
          console.debug('[fetchAndSaveWalletTransactions] (neurai) fetch tx took', (Date.now() - txStart) / 1000, 'sec');
        } else {
          console.warn('[fetchAndSaveWalletTransactions] no Neurai wallet with this ID');
          noErr = false;
        }
      } catch (err) {
        noErr = false;
        console.error('[fetchAndSaveWalletTransactions] Error:', err);
      } finally {
        setWalletTransactionUpdateStatus(WalletTransactionsStatus.NONE);
      }
      // A failed save was already reported by saveToDisk; callers fire and forget.
      if (noErr) await saveToDisk().catch(() => {});
    },
    [saveToDisk, wallets],
  );

  function confirmWalletDeletion(wallet: any, onConfirmed: () => void) {
    triggerHapticFeedback(HapticFeedbackTypes.NotificationWarning);
    try {
      const balance = formatBalanceWithoutSuffix(wallet.getBalance(), XnaUnit.SATS, true);
      presentAlert({
        title: loc.wallets.details_delete_wallet,
        message: loc.formatString(loc.wallets.details_del_wb_q, { balance }),
        buttons: [
          {
            text: loc.wallets.details_delete,
            onPress: () => {
              triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              onConfirmed();
            },
            style: 'destructive',
          },
          {
            text: loc._.cancel,
            onPress: () => {},
            style: 'cancel',
          },
        ],
        options: { cancelable: false },
      });
    } catch (error) {
      // Handle error silently if needed
    }
  }

  const value: StorageContextType = useMemo(
    () => ({
      wallets,
      setWalletsWithNewOrder,
      txMetadata: txMetadata.current,
      counterpartyMetadata: counterpartyMetadata.current,
      saveToDisk,
      getTransactions: BlueApp.getTransactions,
      selectedWalletID,
      addWallet,
      addWalletAndSave,
      deleteWallet,
      currentSharedCosigner,
      setSharedCosigner: setCurrentSharedCosigner,
      setItem: BlueApp.setItem,
      getItem: BlueApp.getItem,
      fetchWalletBalances: BlueApp.fetchWalletBalances,
      fetchWalletTransactions: BlueApp.fetchWalletTransactions,
      fetchAndSaveWalletTransactions,
      isStorageEncrypted: BlueApp.storageIsEncrypted,
      encryptStorage: BlueApp.encryptStorage,
      startAndDecrypt,
      cachedPassword: BlueApp.cachedPassword,
      getBalance: BlueApp.getBalance,
      walletsInitialized,
      setWalletsInitialized,
      refreshAllWalletTransactions,
      sleep: BlueApp.sleep,
      decryptStorage: BlueApp.decryptStorage,
      canUpgradeEncryption: BlueApp.canUpgradeEncryption,
      upgradeEncryption: BlueApp.upgradeEncryption,
      hasOlderBackupCopies: BlueApp.hasOlderBackupCopies,
      walletTransactionUpdateStatus,
      setWalletTransactionUpdateStatus,
      handleWalletDeletion,
      confirmWalletDeletion,
    }),
    [
      wallets,
      setWalletsWithNewOrder,
      saveToDisk,
      selectedWalletID,
      addWallet,
      addWalletAndSave,
      deleteWallet,
      currentSharedCosigner,
      fetchAndSaveWalletTransactions,
      walletsInitialized,
      setWalletsInitialized,
      refreshAllWalletTransactions,
      walletTransactionUpdateStatus,
      handleWalletDeletion,
    ],
  );

  return <StorageContext.Provider value={value}>{children}</StorageContext.Provider>;
};
