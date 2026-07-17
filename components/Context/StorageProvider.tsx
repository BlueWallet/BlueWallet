import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BlueApp as BlueAppClass, TCounterpartyMetadata, TTXMetadata } from '../../class/blue-app';
import { LegacyWallet } from '../../class/wallets/legacy-wallet';
import { LightningArkWallet } from '../../class/wallets/lightning-ark-wallet';
import { WatchOnlyWallet } from '../../class/wallets/watch-only-wallet';
import type { TWallet } from '../../class/wallets/types';
import presentAlert from '../../components/Alert';
import loc, { formatBalanceWithoutSuffix } from '../../loc';
import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { registerArkBackgroundTask, stopArkBackgroundTask } from '../../blue_modules/arkade-background';
import { startAndDecrypt } from '../../blue_modules/start-and-decrypt';
import { isNotificationsEnabled, majorTomToGroundControl, unsubscribe } from '../../blue_modules/notifications';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import { navigationRef } from '../../NavigationService';
import { getScanWasBBQR } from '../../helpers/scan-qr.ts';
import { setWalletIdMustUseBBQR } from '../../blue_modules/ur';

const BlueApp = BlueAppClass.getInstance();

// hashmap of timestamps we _started_ refetching some wallet
const _lastTimeTriedToRefetchWallet: { [walletID: string]: number } = {};

interface StorageContextType {
  wallets: TWallet[];
  setWalletsWithNewOrder: (wallets: TWallet[]) => void;
  txMetadata: TTXMetadata;
  counterpartyMetadata: TCounterpartyMetadata;
  saveToDisk: (force?: boolean) => Promise<void>;
  selectedWalletID: () => string | undefined; // Change from string|undefined to a function
  addWallet: (wallet: TWallet) => void;
  deleteWallet: (wallet: TWallet) => void;
  currentSharedCosigner: string;
  setSharedCosigner: (cosigner: string) => void;
  addAndSaveWallet: (wallet: TWallet) => Promise<void>;
  fetchAndSaveWalletTransactions: (walletID: string) => Promise<void>;
  walletsInitialized: boolean;
  setWalletsInitialized: (initialized: boolean) => void;
  refreshAllWalletTransactions: (lastSnappedTo?: number, showUpdateStatusIndicator?: boolean) => Promise<void>;
  resetWallets: () => void;
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
  createFakeStorage: typeof BlueApp.createFakeStorage;
  decryptStorage: typeof BlueApp.decryptStorage;
  isPasswordInUse: typeof BlueApp.isPasswordInUse;
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
  const [walletsInitialized, setWalletsInitializedState] = useState<boolean>(false);
  const [currentSharedCosigner, setCurrentSharedCosigner] = useState<string>('');

  const setWalletsInitialized = useCallback((initialized: boolean) => {
    setWalletsInitializedState(initialized);
  }, []);

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

  const saveToDisk = useCallback(
    async (force: boolean = false) => {
      if (!force && BlueApp.getWallets().length === 0) {
        console.debug('Not saving empty wallets array');
        return;
      }
      BlueApp.tx_metadata = txMetadata.current;
      BlueApp.counterparty_metadata = counterpartyMetadata.current;
      await BlueApp.saveToDisk();
      const w: TWallet[] = [...BlueApp.getWallets()];
      setWallets(w);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [txMetadata.current, counterpartyMetadata.current],
  );

  const addWallet = useCallback((wallet: TWallet) => {
    BlueApp.wallets.push(wallet);
    setWallets([...BlueApp.getWallets()]);
  }, []);

  const deleteWallet = useCallback((wallet: TWallet) => {
    BlueApp.deleteWallet(wallet);
    setWallets([...BlueApp.getWallets()]);
    if (wallet.type === LightningArkWallet.type) {
      // Fire-and-forget: cleans up the per-wallet Arkade Realm (close + delete files)
      // and the Keychain encryption key. Errors stay scoped to the Ark wallet path
      // and never block deletion.
      (wallet as LightningArkWallet).onDelete().catch(e => console.warn('[StorageProvider] Ark wallet cleanup failed:', e?.message ?? e));
      if (!BlueApp.getWallets().some(w => w.type === LightningArkWallet.type)) {
        stopArkBackgroundTask().catch(e => console.warn('[StorageProvider] Ark background task stop failed:', e?.message ?? e));
      }
    }
  }, []);

  const handleWalletDeletion = useCallback(
    async (walletID: string, forceDelete = false): Promise<boolean> => {
      console.debug(`handleWalletDeletion: invoked for walletID ${walletID}`);
      const wallet = wallets.find(w => w.getID() === walletID);
      if (!wallet) {
        console.warn(`handleWalletDeletion: wallet not found for ${walletID}`);
        return false;
      }

      if (forceDelete) {
        deleteWallet(wallet);
        await saveToDisk(true);
        triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
        return true;
      }

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
            try {
              await unsubscribe(externalAddresses, [], []);
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
        deleteWallet(wallet);
        console.debug(`handleWalletDeletion: wallet ${walletID} deleted successfully`);
        await saveToDisk(true);
        triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
        return true;
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
    [deleteWallet, saveToDisk, wallets],
  );

  const resetWallets = useCallback(() => {
    setWallets(BlueApp.getWallets());
  }, []);

  const setWalletsWithNewOrder = useCallback(
    (wlts: TWallet[]) => {
      BlueApp.wallets = wlts;
      saveToDisk();
    },
    [saveToDisk],
  );

  // Initialize wallets
  useEffect(() => {
    if (walletsInitialized) {
      txMetadata.current = BlueApp.tx_metadata;
      counterpartyMetadata.current = BlueApp.counterparty_metadata;
      const loaded = BlueApp.getWallets();
      setWallets(loaded);
      if (loaded.some(w => w.type === LightningArkWallet.type)) {
        registerArkBackgroundTask().catch(e => console.warn('[StorageProvider] Ark background task register failed:', e?.message ?? e));
      }
    }
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
        console.debug('[refreshAllWalletTransactions] Waiting for connectivity...');
        // `ensureConnected()` ping-checks the existing socket and, only if needed,
        // tears it down and reconnects. Replaces the old wait+ping+wait pattern
        // which surfaced false "network error" alerts after iOS suspend/resume.
        const connected = await BlueElectrum.ensureConnected();
        if (!connected) {
          console.log('[refreshAllWalletTransactions] could not establish Electrum connection, aborting refresh');
          return;
        }

        console.debug('[refreshAllWalletTransactions] Connected to Electrum');

        // Race only the post-connect work. We budget ample time so that a slow
        // initial Electrum connection (cold start, slow TLS, flaky network) doesn't
        // cause the fetch race to abort prematurely.
        const REFRESH_FETCH_PHASE_TIMEOUT_MS = Math.max(120_000, BlueElectrum.ENSURE_CONNECTED_MAX_WALL_MS * 2);
        const timeoutPromise = new Promise<never>(
          (_resolve, reject) =>
            (refreshTimeout = setTimeout(() => {
              console.debug('[refreshAllWalletTransactions] Timeout reached');
              reject(new Error('Timeout reached'));
            }, REFRESH_FETCH_PHASE_TIMEOUT_MS)),
        );

        if (typeof BlueApp.fetchSenderPaymentCodes !== 'function') {
          console.warn('[refreshAllWalletTransactions] fetchSenderPaymentCodes is not available');
        }

        const paymentCodesPromise =
          typeof BlueApp.fetchSenderPaymentCodes === 'function'
            ? (async () => {
                const codesStart = Date.now();
                console.debug('[refreshAllWalletTransactions] Fetching sender payment codes (parallel)');
                await BlueApp.fetchSenderPaymentCodes(lastSnappedTo);
                console.debug('[refreshAllWalletTransactions] fetch payment codes took', (Date.now() - codesStart) / 1000, 'sec');
              })()
            : Promise.resolve();

        console.debug('[refreshAllWalletTransactions] Fetching wallet balances and transactions');
        await Promise.race([
          (async () => {
            await Promise.all([
              paymentCodesPromise,
              (async () => {
                const balanceStart = Date.now();
                await BlueApp.fetchWalletBalances(lastSnappedTo);
                console.debug('[refreshAllWalletTransactions] fetch balance took', (Date.now() - balanceStart) / 1000, 'sec');

                const txStart = Date.now();
                await BlueApp.fetchWalletTransactions(lastSnappedTo);
                console.debug('[refreshAllWalletTransactions] fetch tx took', (Date.now() - txStart) / 1000, 'sec');
              })(),
            ]);

            console.debug('[refreshAllWalletTransactions] Saving data to disk');
            await saveToDisk();
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
      const index = wallets.findIndex(wallet => wallet.getID() === walletID);
      let noErr = true;
      try {
        if (Date.now() - (_lastTimeTriedToRefetchWallet[walletID] || 0) < 5000) {
          console.debug('[fetchAndSaveWalletTransactions] Re-fetch wallet happens too fast; NOP');
          return;
        }
        _lastTimeTriedToRefetchWallet[walletID] = Date.now();

        const connected = await BlueElectrum.ensureConnected();
        if (!connected) {
          console.log('[fetchAndSaveWalletTransactions] could not establish Electrum connection, aborting');
          return;
        }
        setWalletTransactionUpdateStatus(walletID);

        const balanceStart = Date.now();
        await BlueApp.fetchWalletBalances(index);
        const balanceEnd = Date.now();
        console.debug('[fetchAndSaveWalletTransactions] fetch balance took', (balanceEnd - balanceStart) / 1000, 'sec');

        const txStart = Date.now();
        await BlueApp.fetchWalletTransactions(index);
        const txEnd = Date.now();
        console.debug('[fetchAndSaveWalletTransactions] fetch tx took', (txEnd - txStart) / 1000, 'sec');
      } catch (err) {
        noErr = false;
        console.error('[fetchAndSaveWalletTransactions] Error:', err);
      } finally {
        setWalletTransactionUpdateStatus(WalletTransactionsStatus.NONE);
      }
      if (noErr) await saveToDisk();
    },
    [saveToDisk, wallets],
  );

  const addAndSaveWallet = useCallback(
    async (w: TWallet) => {
      if (wallets.some(i => i.getID() === w.getID())) {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        presentAlert({ message: 'This wallet has been previously imported.' });
        return;
      }
      const emptyWalletLabel = new LegacyWallet().getLabel();
      if (w.getLabel() === emptyWalletLabel) w.setLabel(loc.wallets.import_imported + ' ' + w.typeReadable);
      w.setUserHasSavedExport(true);
      addWallet(w);
      if (w instanceof LightningArkWallet) {
        registerArkBackgroundTask().catch(e => console.warn('[StorageProvider] Ark background task register failed:', e?.message ?? e));
      }
      if (getScanWasBBQR()) {
        // to avoid proxying `useBBQR` through a bunch of screens during import procedure, we use a trick:
        // on add-wallet screen we reset `lastScanWasBBQR` to false. then potentially user scans QR in BBQR format
        // and saves his wallet to storage, in which case execution lands here, where we check last scan and save walletID
        // internally as a marker that this wallet should display animated QR codes in this format
        await setWalletIdMustUseBBQR(w.getID());
      }
      triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
      await saveToDisk();

      presentAlert({
        hapticFeedback: HapticFeedbackTypes.ImpactHeavy,
        message: w.type === WatchOnlyWallet.type ? loc.wallets.import_success_watchonly : loc.wallets.import_success,
      });

      await w.fetchBalance();
      try {
        await majorTomToGroundControl(w.getAllExternalAddresses(), [], []);
      } catch (error) {
        console.warn('Failed to setup notifications:', error);
        // Consider if user should be notified of notification setup failure
      }
    },
    [wallets, addWallet, saveToDisk],
  );

  function confirmWalletDeletion(wallet: any, onConfirmed: () => void) {
    triggerHapticFeedback(HapticFeedbackTypes.NotificationWarning);
    try {
      const balance = formatBalanceWithoutSuffix(wallet.getBalance(), BitcoinUnit.SATS, true);
      presentAlert({
        title: loc.wallets.details_delete_wallet,
        message: loc.formatString(loc.wallets.details_del_wb_q, { balance }),
        buttons: [
          {
            text: loc.wallets.details_delete,
            onPress: () => {
              triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
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
      deleteWallet,
      currentSharedCosigner,
      setSharedCosigner: setCurrentSharedCosigner,
      addAndSaveWallet,
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
      createFakeStorage: BlueApp.createFakeStorage,
      resetWallets,
      decryptStorage: BlueApp.decryptStorage,
      isPasswordInUse: BlueApp.isPasswordInUse,
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
      deleteWallet,
      currentSharedCosigner,
      addAndSaveWallet,
      fetchAndSaveWalletTransactions,
      walletsInitialized,
      setWalletsInitialized,
      refreshAllWalletTransactions,
      resetWallets,
      walletTransactionUpdateStatus,
      handleWalletDeletion,
    ],
  );

  return <StorageContext.Provider value={value}>{children}</StorageContext.Provider>;
};
