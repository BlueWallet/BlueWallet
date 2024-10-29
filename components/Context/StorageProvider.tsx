import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
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
  isElectrumDisabled: boolean;
  setIsElectrumDisabled: (value: boolean) => void;
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

export const StorageContext = createContext<StorageContextType | undefined>(undefined);

export const StorageProvider = ({ children }: { children: React.ReactNode }) => {
  const txMetadata = useRef<TTXMetadata>(BlueApp.tx_metadata);
  const counterpartyMetadata = useRef<TCounterpartyMetadata>(BlueApp.counterparty_metadata || {});

  const [wallets, setWallets] = useState<TWallet[]>([]);
  const [selectedWalletID, setSelectedWalletID] = useState<string | undefined>();
  const [walletTransactionUpdateStatus, setWalletTransactionUpdateStatus] = useState<WalletTransactionsStatus | string>(
    WalletTransactionsStatus.NONE,
  );
  const [walletsInitialized, setWalletsInitialized] = useState<boolean>(false);
  const [isElectrumDisabled, setIsElectrumDisabled] = useState<boolean>(true);
  const [currentSharedCosigner, setCurrentSharedCosigner] = useState<string>('');
  const [reloadTransactionsMenuActionFunction, setReloadTransactionsMenuActionFunction] = useState<() => void>(() => {});

  const saveToDisk = useCallback(async (force: boolean = false) => {
    if (!force && BlueApp.getWallets().length === 0) {
      console.debug('Not saving empty wallets array');
      return;
    }
    await InteractionManager.runAfterInteractions(async () => {
      BlueApp.tx_metadata = txMetadata.current;
      BlueApp.counterparty_metadata = counterpartyMetadata.current;
      await BlueApp.saveToDisk();
      setWallets([...BlueApp.getWallets()]);
    });
  }, []);

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

  useEffect(() => {
    BlueElectrum.isDisabled().then(setIsElectrumDisabled);
    if (walletsInitialized) {
      txMetadata.current = BlueApp.tx_metadata;
      counterpartyMetadata.current = BlueApp.counterparty_metadata;
      setWallets(BlueApp.getWallets());
      BlueElectrum.connectMain();
    }
  }, [walletsInitialized]);

  const refreshAllWalletTransactions = useCallback(
    async (lastSnappedTo?: number, showUpdateStatusIndicator = true) => {
      const TIMEOUT_DURATION = 30000;
      const timeoutPromise = new Promise<never>((_resolve, reject) => setTimeout(() => reject(new Error('Timeout')), TIMEOUT_DURATION));
      const mainLogicPromise = new Promise<void>(async (resolve, reject) => {
        try {
          await InteractionManager.runAfterInteractions(async () => {
            await BlueElectrum.waitTillConnected();
            if (showUpdateStatusIndicator) setWalletTransactionUpdateStatus(WalletTransactionsStatus.ALL);
            await BlueApp.fetchSenderPaymentCodes(lastSnappedTo);
            await BlueApp.fetchWalletBalances(lastSnappedTo);
            await BlueApp.fetchWalletTransactions(lastSnappedTo);
            await saveToDisk();
            setWalletTransactionUpdateStatus(WalletTransactionsStatus.NONE);
            resolve();
          });
        } catch (error) {
          console.error(error);
          reject(error);
        }
      });
      await Promise.race([mainLogicPromise, timeoutPromise]);
    },
    [saveToDisk],
  );

  const fetchAndSaveWalletTransactions = useCallback(
    async (walletID: string) => {
      await InteractionManager.runAfterInteractions(async () => {
        if (Date.now() - (_lastTimeTriedToRefetchWallet[walletID] || 0) < 5000) return;
        _lastTimeTriedToRefetchWallet[walletID] = Date.now();

        const index = wallets.findIndex(wallet => wallet.getID() === walletID);
        try {
          await BlueElectrum.waitTillConnected();
          setWalletTransactionUpdateStatus(walletID);
          await BlueApp.fetchWalletBalances(index);
          await BlueApp.fetchWalletTransactions(index);
          await saveToDisk();
        } catch (error) {
          console.error(error);
        } finally {
          setWalletTransactionUpdateStatus(WalletTransactionsStatus.NONE);
        }
      });
    },
    [saveToDisk, wallets],
  );

  const addAndSaveWallet = useCallback(
    async (wallet: TWallet) => {
      if (wallets.some(w => w.getID() === wallet.getID())) {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        presentAlert({ message: 'This wallet has been previously imported.' });
        return;
      }
      const emptyWalletLabel = new LegacyWallet().getLabel();
      triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
      wallet.setLabel(wallet.getLabel() === emptyWalletLabel ? `${loc.wallets.import_imported} ${wallet.typeReadable}` : wallet.getLabel());
      wallet.setUserHasSavedExport(true);
      addWallet(wallet);
      await saveToDisk();
      A(A.ENUM.CREATED_WALLET);
      presentAlert({
        hapticFeedback: HapticFeedbackTypes.ImpactHeavy,
        message: wallet.type === WatchOnlyWallet.type ? loc.wallets.import_success_watchonly : loc.wallets.import_success,
      });
      Notifications.majorTomToGroundControl(wallet.getAllExternalAddresses(), [], []);
      await wallet.fetchBalance();
    },
    [wallets, addWallet, saveToDisk],
  );

  const value = useMemo(
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
      isElectrumDisabled,
      setIsElectrumDisabled,
      reloadTransactionsMenuActionFunction,
      setReloadTransactionsMenuActionFunction,
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
      isElectrumDisabled,
      setIsElectrumDisabled,
      reloadTransactionsMenuActionFunction,
      setReloadTransactionsMenuActionFunction,
    ],
  );

  return <StorageContext.Provider value={value}>{children}</StorageContext.Provider>;
};