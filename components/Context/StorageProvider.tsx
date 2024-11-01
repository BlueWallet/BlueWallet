import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import debounce from '../../blue_modules/debounce';
import A from '../../blue_modules/analytics';
import Notifications from '../../blue_modules/notifications';
import { BlueApp as BlueAppClass, LegacyWallet, TCounterpartyMetadata, TTXMetadata, WatchOnlyWallet } from '../../class';
import type { TWallet } from '../../class/wallets/types';
import presentAlert from '../../components/Alert';
import loc from '../../loc';
import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { startAndDecrypt } from '../../blue_modules/start-and-decrypt';

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
  walletTransactionUpdateStatus: 'ALL' | string | null;
  setWalletTransactionUpdateStatus: (status: 'ALL' | string | null) => void;
  reloadTransactionsMenuActionFunction: () => void;
  setReloadTransactionsMenuActionFunction: (func: () => void) => void;
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
}

export enum WalletTransactionsStatus {
  NONE = 'NONE',
  ALL = 'ALL',
}

// @ts-ignore default value does not match the type
export const StorageContext = createContext<StorageContextType>(undefined);

export const StorageProvider = ({ children }: { children: React.ReactNode }) => {
  // Use refs for metadata to avoid causing re-renders when they change
  const txMetadata = useRef<TTXMetadata>(BlueApp.tx_metadata);
  const counterpartyMetadata = useRef<TCounterpartyMetadata>(BlueApp.counterparty_metadata || {});

  const [wallets, setWallets] = useState<TWallet[]>(BlueApp.getWallets());
  const [selectedWalletID, setSelectedWalletID] = useState<string | undefined>();
  const [walletTransactionUpdateStatus, setWalletTransactionUpdateStatus] = useState<'ALL' | string | null>(null);
  const [walletsInitialized, setWalletsInitialized] = useState<boolean>(false);
  const [currentSharedCosigner, setCurrentSharedCosigner] = useState<string>('');
  const [reloadTransactionsMenuActionFunction, setReloadTransactionsMenuActionFunction] = useState<() => void>(() => {});

  const debouncedSaveToDisk = useMemo(
    () =>
      debounce(async (force: boolean = false) => {
        if (!force && BlueApp.getWallets().length === 0) {
          console.debug('Not saving empty wallets array');
          return;
        }

        await InteractionManager.runAfterInteractions(async () => {
          BlueApp.tx_metadata = txMetadata.current;
          BlueApp.counterparty_metadata = counterpartyMetadata.current;
          await BlueApp.saveToDisk();
          setWallets(BlueApp.getWallets());
        });
      }, 1000),
    [],
  );

  useEffect(() => {
    return () => {
      debouncedSaveToDisk.cancel();
    };
  }, [debouncedSaveToDisk]);

  const saveToDisk = useCallback(
    async (force: boolean = false) => {
      await debouncedSaveToDisk(force);
    },
    [debouncedSaveToDisk],
  );

  const addWallet = useCallback(
    (wallet: TWallet) => {
      BlueApp.wallets.push(wallet);
      setWallets(prevWallets => [...prevWallets, wallet]);
      saveToDisk();
    },
    [saveToDisk],
  );

  const deleteWallet = useCallback(
    (wallet: TWallet) => {
      BlueApp.deleteWallet(wallet);
      setWallets(prevWallets => prevWallets.filter(w => w.getID() !== wallet.getID()));
      saveToDisk();
    },
    [saveToDisk],
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

  const refreshAllWalletTransactions = useCallback(
    async (lastSnappedTo?: number, showUpdateStatusIndicator: boolean = true) => {
      const TIMEOUT_DURATION = 30000;

      const timeout = new Promise<never>((_resolve, reject) =>
        setTimeout(() => {
          reject(new Error('refreshAllWalletTransactions: Timeout reached'));
        }, TIMEOUT_DURATION),
      );

      const mainLogic = async () => {
        try {
          await BlueElectrum.waitTillConnected();

          if (showUpdateStatusIndicator) {
            setWalletTransactionUpdateStatus('ALL');
          }

          const paymentCodesStart = Date.now();
          const balanceStart = Date.now();
          const txStart = Date.now();

          const paymentCodesPromise = BlueApp.fetchSenderPaymentCodes(lastSnappedTo);
          const balancePromise = BlueApp.fetchWalletBalances(lastSnappedTo);
          const txPromise = BlueApp.fetchWalletTransactions(lastSnappedTo);

          await Promise.all([
            paymentCodesPromise.then(() => {
              console.debug('fetch payment codes took', (Date.now() - paymentCodesStart) / 1000, 'sec');
            }),
            balancePromise.then(() => {
              console.debug('fetch balance took', (Date.now() - balanceStart) / 1000, 'sec');
            }),
            txPromise.then(() => {
              console.debug('fetch tx took', (Date.now() - txStart) / 1000, 'sec');
            }),
          ]);

          await saveToDisk();
        } catch (err) {
          console.error('Error in refreshAllWalletTransactions:', err);
          throw err;
        } finally {
          setWalletTransactionUpdateStatus(null);
        }
      };

      try {
        await Promise.race([mainLogic(), timeout]);
      } catch (err) {
        console.error(err);
      }
    },
    [saveToDisk],
  );

  const fetchAndSaveWalletTransactions = useCallback(
    async (walletID: string) => {
      await InteractionManager.runAfterInteractions(async () => {
        const wallet = wallets.find(w => w.getID() === walletID);
        if (!wallet) return;

        const now = Date.now();
        if (now - (_lastTimeTriedToRefetchWallet[walletID] || 0) < 5000) {
          console.debug('Re-fetch wallet happens too fast; NOP');
          return;
        }
        _lastTimeTriedToRefetchWallet[walletID] = now;

        try {
          await BlueElectrum.waitTillConnected();
          setWalletTransactionUpdateStatus(walletID);

          const balanceStart = Date.now();
          const txStart = Date.now();

          const index = BlueApp.getWallets().findIndex(w => w.getID() === walletID);
          if (index === -1) {
            console.error(`Wallet with ID ${walletID} not found.`);
            return;
          }

          const balancePromise = BlueApp.fetchWalletBalances(index);
          const txPromise = BlueApp.fetchWalletTransactions(index);

          await Promise.all([
            balancePromise.then(() => {
              console.debug('fetch balance took', (Date.now() - balanceStart) / 1000, 'sec');
            }),
            txPromise.then(() => {
              console.debug('fetch tx took', (Date.now() - txStart) / 1000, 'sec');
            }),
          ]);

          await saveToDisk();
        } catch (err) {
          console.error(err);
        } finally {
          setWalletTransactionUpdateStatus(null);
        }
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

      triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
      const emptyWalletLabel = new LegacyWallet().getLabel();
      if (w.getLabel() === emptyWalletLabel) {
        w.setLabel(`${loc.wallets.import_imported} ${w.typeReadable}`);
      }
      w.setUserHasSavedExport(true);
      addWallet(w);
      await saveToDisk();
      A(A.ENUM.CREATED_WALLET);
      presentAlert({
        hapticFeedback: HapticFeedbackTypes.ImpactHeavy,
        message: w.type === WatchOnlyWallet.type ? loc.wallets.import_success_watchonly : loc.wallets.import_success,
      });

      // @ts-ignore: Notifications type is not defined
      Notifications.majorTomToGroundControl(w.getAllExternalAddresses(), [], []);
      await w.fetchBalance();
    },
    [wallets, addWallet, saveToDisk],
  );

  const value = useMemo<StorageContextType>(() => {
    return {
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
      reloadTransactionsMenuActionFunction,
      setReloadTransactionsMenuActionFunction,
    };
  }, [
    wallets,
    setWalletsWithNewOrder,
    saveToDisk,
    selectedWalletID,
    setSelectedWalletID,
    addWallet,
    deleteWallet,
    currentSharedCosigner,
    setCurrentSharedCosigner,
    addAndSaveWallet,
    fetchAndSaveWalletTransactions,
    walletsInitialized,
    setWalletsInitialized,
    refreshAllWalletTransactions,
    resetWallets,
    walletTransactionUpdateStatus,
    setWalletTransactionUpdateStatus,
    reloadTransactionsMenuActionFunction,
    setReloadTransactionsMenuActionFunction,
  ]);

  return <StorageContext.Provider value={value}>{children}</StorageContext.Provider>;
};
