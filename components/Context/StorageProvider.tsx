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
import { majorTomToGroundControl } from '../../blue_modules/notifications';

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

      const timeoutPromise = new Promise<never>((_resolve, reject) =>
        setTimeout(() => {
          reject(new Error('refreshAllWalletTransactions: Timeout reached'));
        }, TIMEOUT_DURATION),
      );

      const mainLogicPromise = new Promise<void>((resolve, reject) => {
        InteractionManager.runAfterInteractions(async () => {
          let noErr = true;
          try {
            await BlueElectrum.waitTillConnected();
            if (showUpdateStatusIndicator) {
              setWalletTransactionUpdateStatus(WalletTransactionsStatus.ALL);
            }
            const paymentCodesStart = Date.now();
            await BlueApp.fetchSenderPaymentCodes(lastSnappedTo);
            const paymentCodesEnd = Date.now();
            console.debug('fetch payment codes took', (paymentCodesEnd - paymentCodesStart) / 1000, 'sec');

            const balanceStart = Date.now();
            await BlueApp.fetchWalletBalances(lastSnappedTo);
            const balanceEnd = Date.now();
            console.debug('fetch balance took', (balanceEnd - balanceStart) / 1000, 'sec');

            const start = Date.now();
            await BlueApp.fetchWalletTransactions(lastSnappedTo);
            const end = Date.now();
            console.debug('fetch tx took', (end - start) / 1000, 'sec');
          } catch (err) {
            noErr = false;
            console.error(err);
            reject(err);
          } finally {
            setWalletTransactionUpdateStatus(WalletTransactionsStatus.NONE);
          }
          if (noErr) await saveToDisk();
          resolve();
        });
      });

      try {
        await Promise.race([mainLogicPromise, timeoutPromise]);
      } catch (err) {
        console.error('Error in refreshAllWalletTransactions:', err);
      } finally {
        setWalletTransactionUpdateStatus(WalletTransactionsStatus.NONE);
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
            console.debug('Re-fetch wallet happens too fast; NOP');
            return;
          }
          _lastTimeTriedToRefetchWallet[walletID] = Date.now();

          await BlueElectrum.waitTillConnected();
          setWalletTransactionUpdateStatus(walletID);
          const balanceStart = Date.now();
          await BlueApp.fetchWalletBalances(index);
          const balanceEnd = Date.now();
          console.debug('fetch balance took', (balanceEnd - balanceStart) / 1000, 'sec');
          const start = Date.now();
          await BlueApp.fetchWalletTransactions(index);
          const end = Date.now();
          console.debug('fetch tx took', (end - start) / 1000, 'sec');
        } catch (err) {
          noErr = false;
          console.error(err);
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
    ],
  );

  return <StorageContext.Provider value={value}>{children}</StorageContext.Provider>;
};
