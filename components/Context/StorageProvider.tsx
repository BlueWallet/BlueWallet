import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import A from '../../blue_modules/analytics';
import { BlueApp as BlueAppClass, LegacyWallet, TCounterpartyMetadata, TTXMetadata, WatchOnlyWallet } from '../../class';
import type { TWallet } from '../../class/wallets/types';
import presentAlert from '../../components/Alert';
import loc from '../../loc';
import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { startAndDecrypt } from '../../blue_modules/start-and-decrypt';
import { isNotificationsEnabled, majorTomToGroundControl, unsubscribe } from '../../blue_modules/notifications';

const BlueApp = BlueAppClass.getInstance();

// hashmap of timestamps we _started_ refetching some wallet
const _lastTimeTriedToRefetchWallet: { [walletID: string]: number } = {};

interface StorageContextType {
  wallets: TWallet[];
  setWalletsWithNewOrder: (wallets: TWallet[]) => void;
  txMetadata: TTXMetadata;
  counterpartyMetadata: TCounterpartyMetadata;
  saveToDisk: (force?: boolean) => Promise<void>;
  selectedWalletID: string | undefined;
  setSelectedWalletID: (walletID: string | undefined) => void;
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
  const [selectedWalletID, setSelectedWalletID] = useState<string | undefined>();
  const [walletTransactionUpdateStatus, setWalletTransactionUpdateStatus] = useState<WalletTransactionsStatus | string>(
    WalletTransactionsStatus.NONE,
  );
  const [walletsInitialized, setWalletsInitialized] = useState<boolean>(false);
  const [currentSharedCosigner, setCurrentSharedCosigner] = useState<string>('');

  const saveToDisk = useCallback(
    async (force: boolean = false) => {
      if (!force && BlueApp.getWallets().length === 0) {
        console.debug('Not saving empty wallets array');
        return;
      }
      await InteractionManager.runAfterInteractions(async () => {
        BlueApp.tx_metadata = txMetadata.current;
        BlueApp.counterparty_metadata = counterpartyMetadata.current;
        await BlueApp.saveToDisk();
        const w: TWallet[] = [...BlueApp.getWallets()];
        setWallets(w);
      });
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
        saveToDisk(true);
        triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
        return true;
      }

      let isNotificationsSettingsEnabled = false;
      try {
        isNotificationsSettingsEnabled = await isNotificationsEnabled();
      } catch (error) {
        console.error(`handleWalletDeletion: error checking notifications for wallet ${walletID}`, error);
        presentAlert({
          title: loc.errors.error,
          message: loc.wallets.details_delete_wallet_error_message,
          buttons: [
            {
              text: loc.wallets.details_delete_anyway,
              onPress: async () => await handleWalletDeletion(walletID, true),
              style: 'destructive',
            },
            {
              text: loc.wallets.list_tryagain,
              onPress: async () => await handleWalletDeletion(walletID),
            },
            {
              text: loc._.cancel,
              onPress: () => {},
              style: 'cancel',
            },
          ],
          options: { cancelable: false },
        });
        return false;
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
        saveToDisk(true);
        triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
        return true;
      } catch (e: unknown) {
        console.error(`handleWalletDeletion: encountered error for wallet ${walletID}`, e);
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        if (forceDelete) {
          deleteWallet(wallet);
          saveToDisk(true);
          triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
          return true;
        } else {
          presentAlert({
            title: loc.errors.error,
            message: loc.wallets.details_delete_wallet_error_message,
            buttons: [
              {
                text: loc.wallets.details_delete_anyway,
                onPress: async () => await handleWalletDeletion(walletID, true),
                style: 'destructive',
              },
              {
                text: loc.wallets.list_tryagain,
                onPress: async () => await handleWalletDeletion(walletID),
              },
              {
                text: loc._.cancel,
                onPress: () => {},
                style: 'cancel',
              },
            ],
            options: { cancelable: false },
          });
          return false;
        }
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

  // Initialize wallets and connect to Electrum
  useEffect(() => {
    if (walletsInitialized) {
      txMetadata.current = BlueApp.tx_metadata;
      counterpartyMetadata.current = BlueApp.counterparty_metadata;
      setWallets(BlueApp.getWallets());
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
      console.debug('[refreshAllWalletTransactions] Starting refreshAllWalletTransactions');
      refreshingRef.current = true;
      const TIMEOUT_DURATION = 30000;
      const timeoutPromise = new Promise<never>((_resolve, reject) =>
        setTimeout(() => {
          console.debug('[refreshAllWalletTransactions] Timeout reached');
          reject(new Error('Timeout reached'));
        }, TIMEOUT_DURATION),
      );

      try {
        if (showUpdateStatusIndicator) {
          console.debug('[refreshAllWalletTransactions] Setting wallet transaction status to ALL');
          setWalletTransactionUpdateStatus(WalletTransactionsStatus.ALL);
        }
        console.debug('[refreshAllWalletTransactions] Waiting for connectivity...');
        await BlueElectrum.waitTillConnected();
        console.debug('[refreshAllWalletTransactions] Connected to Electrum');

        // Restore fetch payment codes timing measurement
        if (typeof BlueApp.fetchSenderPaymentCodes === 'function') {
          const codesStart = Date.now();
          console.debug('[refreshAllWalletTransactions] Fetching sender payment codes');
          await BlueApp.fetchSenderPaymentCodes(lastSnappedTo);
          const codesEnd = Date.now();
          console.debug('[refreshAllWalletTransactions] fetch payment codes took', (codesEnd - codesStart) / 1000, 'sec');
        } else {
          console.warn('[refreshAllWalletTransactions] fetchSenderPaymentCodes is not available');
        }

        console.debug('[refreshAllWalletTransactions] Fetching wallet balances and transactions');
        await Promise.race([
          (async () => {
            const balanceStart = Date.now();
            await BlueApp.fetchWalletBalances(lastSnappedTo);
            const balanceEnd = Date.now();
            console.debug('[refreshAllWalletTransactions] fetch balance took', (balanceEnd - balanceStart) / 1000, 'sec');

            const txStart = Date.now();
            await BlueApp.fetchWalletTransactions(lastSnappedTo);
            const txEnd = Date.now();
            console.debug('[refreshAllWalletTransactions] fetch tx took', (txEnd - txStart) / 1000, 'sec');

            console.debug('[refreshAllWalletTransactions] Saving data to disk');
            await saveToDisk();
          })(),

          timeoutPromise,
        ]);
        console.debug('[refreshAllWalletTransactions] Refresh completed successfully');
      } catch (error) {
        console.error('[refreshAllWalletTransactions] Error in refreshAllWalletTransactions:', error);
      } finally {
        console.debug('[refreshAllWalletTransactions] Resetting wallet transaction status and refresh lock');
        setWalletTransactionUpdateStatus(WalletTransactionsStatus.NONE);
        refreshingRef.current = false;
      }
    },
    [saveToDisk],
  );

  const fetchAndSaveWalletTransactions = useCallback(
    async (walletID: string) => {
      await InteractionManager.runAfterInteractions(async () => {
        const index = wallets.findIndex(wallet => wallet.getID() === walletID);
        let noErr = true;
        try {
          if (Date.now() - (_lastTimeTriedToRefetchWallet[walletID] || 0) < 5000) {
            console.debug('[fetchAndSaveWalletTransactions] Re-fetch wallet happens too fast; NOP');
            return;
          }
          _lastTimeTriedToRefetchWallet[walletID] = Date.now();

          await BlueElectrum.waitTillConnected();
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
      });
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
      triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
      if (w.getLabel() === emptyWalletLabel) w.setLabel(loc.wallets.import_imported + ' ' + w.typeReadable);
      w.setUserHasSavedExport(true);
      addWallet(w);
      await saveToDisk();
      A(A.ENUM.CREATED_WALLET);
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

  const value: StorageContextType = useMemo(
    () => ({
      wallets,
      setWalletsWithNewOrder,
      txMetadata: txMetadata.current,
      counterpartyMetadata: counterpartyMetadata.current,
      saveToDisk,
      getTransactions: BlueApp.getTransactions,
      selectedWalletID,
      setSelectedWalletID,
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
    }),
    [
      wallets,
      setWalletsWithNewOrder,
      saveToDisk,
      selectedWalletID,
      setSelectedWalletID,
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
      setWalletTransactionUpdateStatus,
      handleWalletDeletion,
    ],
  );

  return <StorageContext.Provider value={value}>{children}</StorageContext.Provider>;
};
