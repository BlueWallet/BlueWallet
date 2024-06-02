import React, { createContext, useEffect, useMemo, useRef, useState, useContext, Dispatch, SetStateAction } from 'react';
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

export enum WalletTransactionsStatus {
  NONE = 'NONE',
  ALL = 'ALL',
}

export const getTransactions = BlueApp.getTransactions;
export const fetchWalletBalances = BlueApp.fetchWalletBalances;
export const fetchWalletTransactions = BlueApp.fetchWalletTransactions;
export const getBalance = BlueApp.getBalance;
export const isStorageEncrypted = BlueApp.storageIsEncrypted;
export const encryptStorage = BlueApp.encryptStorage;
export const sleep = BlueApp.sleep;
export const createFakeStorage = BlueApp.createFakeStorage;
export const decryptStorage = BlueApp.decryptStorage;
export const isPasswordInUse = BlueApp.isPasswordInUse;
export const cachedPassword = BlueApp.cachedPassword;
export const getItem = BlueApp.getItem;
export const setItem = BlueApp.setItem;

export const saveToDisk = async (
  force: boolean = false,
  setWallets: Dispatch<SetStateAction<TWallet[]>>,
  txMetadata: React.MutableRefObject<TTXMetadata>,
  counterpartyMetadata: React.MutableRefObject<TCounterpartyMetadata>
) => {
  return new Promise<void>((resolve) => {
    InteractionManager.runAfterInteractions(async () => {
      if (BlueApp.getWallets().length === 0 && !force) {
        console.debug('not saving empty wallets array');
        resolve();
        return;
      }
      BlueApp.tx_metadata = txMetadata.current;
      BlueApp.counterparty_metadata = counterpartyMetadata.current;
      await BlueApp.saveToDisk();
      setWallets([...BlueApp.getWallets()]);
      txMetadata.current = BlueApp.tx_metadata;
      counterpartyMetadata.current = BlueApp.counterparty_metadata;
      resolve();
    });
  });
};

export const resetWallets = (setWallets: Dispatch<SetStateAction<TWallet[]>>) => {
  setWallets(BlueApp.getWallets());
};

export const setWalletsWithNewOrder = async (
  wlts: TWallet[],
  setWallets: Dispatch<SetStateAction<TWallet[]>>,
  txMetadata: React.MutableRefObject<TTXMetadata>,
  counterpartyMetadata: React.MutableRefObject<TCounterpartyMetadata>
) => {
  BlueApp.wallets = wlts;
  await saveToDisk(false, setWallets, txMetadata, counterpartyMetadata);
};

export const refreshAllWalletTransactions = async (
  lastSnappedTo: number | undefined,
  showUpdateStatusIndicator: boolean,
  setWalletTransactionUpdateStatus: Dispatch<SetStateAction<WalletTransactionsStatus | string>>,
  setWallets: Dispatch<SetStateAction<TWallet[]>>,
  txMetadata: React.MutableRefObject<TTXMetadata>,
  counterpartyMetadata: React.MutableRefObject<TCounterpartyMetadata>
) => {
  return new Promise<void>((resolve) => {
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
        const balanceStart = +new Date();
        await fetchWalletBalances(lastSnappedTo);
        const balanceEnd = +new Date();
        console.debug('fetch balance took', (balanceEnd - balanceStart) / 1000, 'sec');
        const start = +new Date();
        await fetchWalletTransactions(lastSnappedTo);
        const end = +new Date();
        console.debug('fetch tx took', (end - start) / 1000, 'sec');
      } catch (err) {
        noErr = false;
        console.warn(err);
      } finally {
        setWalletTransactionUpdateStatus(WalletTransactionsStatus.NONE);
      }
      if (noErr) await saveToDisk(false, setWallets, txMetadata, counterpartyMetadata);
      resolve();
    });
  });
};

export const fetchAndSaveWalletTransactions = async (
  walletID: string,
  setWalletTransactionUpdateStatus: Dispatch<SetStateAction<WalletTransactionsStatus | string>>,
  setWallets: Dispatch<SetStateAction<TWallet[]>>,
  txMetadata: React.MutableRefObject<TTXMetadata>,
  counterpartyMetadata: React.MutableRefObject<TCounterpartyMetadata>,
  wallets: TWallet[]
) => {
  return new Promise<void>((resolve) => {
    InteractionManager.runAfterInteractions(async () => {
      const index = wallets.findIndex(wallet => wallet.getID() === walletID);
      let noErr = true;
      try {
        if (+new Date() - _lastTimeTriedToRefetchWallet[walletID] < 5000) {
          console.debug('re-fetch wallet happens too fast; NOP');
          resolve();
          return;
        }
        _lastTimeTriedToRefetchWallet[walletID] = +new Date();

        await BlueElectrum.waitTillConnected();
        setWalletTransactionUpdateStatus(walletID);
        const balanceStart = +new Date();
        await fetchWalletBalances(index);
        const balanceEnd = +new Date();
        console.debug('fetch balance took', (balanceEnd - balanceStart) / 1000, 'sec');
        const start = +new Date();
        await fetchWalletTransactions(index);
        const end = +new Date();
        console.debug('fetch tx took', (end - start) / 1000, 'sec');
      } catch (err) {
        noErr = false;
        console.warn(err);
      } finally {
        setWalletTransactionUpdateStatus(WalletTransactionsStatus.NONE);
      }
      if (noErr) await saveToDisk(false, setWallets, txMetadata, counterpartyMetadata);
      resolve();
    });
  });
};

interface StorageContextType {
  wallets: TWallet[];
  setWallets: Dispatch<SetStateAction<TWallet[]>>;
  setWalletsWithNewOrder: (wallets: TWallet[]) => void;
  txMetadata: React.MutableRefObject<TTXMetadata>;
  counterpartyMetadata: React.MutableRefObject<TCounterpartyMetadata>;
  saveToDisk: (force?: boolean) => Promise<void>;
  selectedWalletID: string | undefined;
  setSelectedWalletID: (walletID: string | undefined) => void;
  addWallet: (wallet: TWallet) => void;
  deleteWallet: (wallet: TWallet) => void;
  currentSharedCosigner: string;
  setSharedCosigner: (cosigner: string) => void;
  addAndSaveWallet: (wallet: TWallet) => Promise<void>;
  walletsInitialized: boolean;
  setWalletsInitialized: (initialized: boolean) => void;
  resetWallets: () => void;
  walletTransactionUpdateStatus: WalletTransactionsStatus | string;
  setWalletTransactionUpdateStatus: Dispatch<SetStateAction<WalletTransactionsStatus | string>>;
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

const defaultValues: StorageContextType = {
  wallets: [],
  setWallets: () => {},
  setWalletsWithNewOrder: () => {},
  txMetadata: { current: {} as TTXMetadata } as React.MutableRefObject<TTXMetadata>,
  counterpartyMetadata: { current: {} as TCounterpartyMetadata } as React.MutableRefObject<TCounterpartyMetadata>,
  saveToDisk: async () => {},
  selectedWalletID: undefined,
  setSelectedWalletID: () => {},
  addWallet: () => {},
  deleteWallet: () => {},
  currentSharedCosigner: '',
  setSharedCosigner: () => {},
  addAndSaveWallet: async () => {},
  walletsInitialized: false,
  setWalletsInitialized: () => {},
  resetWallets: () => {},
  walletTransactionUpdateStatus: WalletTransactionsStatus.NONE,
  setWalletTransactionUpdateStatus: () => {},
  isElectrumDisabled: true,
  setIsElectrumDisabled: () => {},
  reloadTransactionsMenuActionFunction: () => {},
  setReloadTransactionsMenuActionFunction: () => {},
  getTransactions,
  fetchWalletBalances,
  fetchWalletTransactions,
  getBalance,
  isStorageEncrypted,
  startAndDecrypt,
  encryptStorage,
  sleep,
  createFakeStorage,
  decryptStorage,
  isPasswordInUse,
  cachedPassword,
  getItem,
  setItem,
};

export const StorageContext = createContext<StorageContextType>(defaultValues);

export const StorageProvider = ({ children }: { children: React.ReactNode }) => {
  const [wallets, setWallets] = useState<TWallet[]>([]);
  const [selectedWalletID, setSelectedWalletID] = useState<undefined | string>();
  const [walletTransactionUpdateStatus, setWalletTransactionUpdateStatus] = useState<WalletTransactionsStatus | string>(
    WalletTransactionsStatus.NONE,
  );
  const [walletsInitialized, setWalletsInitialized] = useState<boolean>(false);
  const [isElectrumDisabled, setIsElectrumDisabled] = useState<boolean>(true);
  const [currentSharedCosigner, setCurrentSharedCosigner] = useState<string>('');
  const [reloadTransactionsMenuActionFunction, setReloadTransactionsMenuActionFunction] = useState<() => void>(() => {});

  const txMetadata = useRef<TTXMetadata>(BlueApp.tx_metadata);
  const counterpartyMetadata = useRef<TCounterpartyMetadata>(BlueApp.counterparty_metadata || {});

  useEffect(() => {
    BlueElectrum.isDisabled().then(setIsElectrumDisabled);
    if (walletsInitialized) {
      txMetadata.current = BlueApp.tx_metadata;
      counterpartyMetadata.current = BlueApp.counterparty_metadata;
      setWallets(BlueApp.getWallets());
      BlueElectrum.connectMain();
    }
  }, [walletsInitialized]);

  const value: StorageContextType = useMemo(
    () => ({
      wallets,
      setWallets,
      setWalletsWithNewOrder: (wallets: TWallet[]) => setWalletsWithNewOrder(wallets, setWallets, txMetadata, counterpartyMetadata),
      txMetadata,
      counterpartyMetadata,
      saveToDisk: (force?: boolean) => saveToDisk(force, setWallets, txMetadata, counterpartyMetadata),
      getTransactions,
      selectedWalletID,
      setSelectedWalletID,
      addWallet: (wallet: TWallet) => {
        BlueApp.wallets.push(wallet);
        setWallets([...BlueApp.getWallets()]);
      },
      deleteWallet: (wallet: TWallet) => {
        BlueApp.deleteWallet(wallet);
        setWallets([...BlueApp.getWallets()]);
      },
      currentSharedCosigner,
      setSharedCosigner: setCurrentSharedCosigner,
      addAndSaveWallet: async (wallet: TWallet) => {
        if (wallets.some(i => i.getID() === wallet.getID())) {
          triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
          presentAlert({ message: 'This wallet has been previously imported.' });
          return;
        }
        const emptyWalletLabel = new LegacyWallet().getLabel();
        triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
        if (wallet.getLabel() === emptyWalletLabel) wallet.setLabel(loc.wallets.import_imported + ' ' + wallet.typeReadable);
        wallet.setUserHasSavedExport(true);
        BlueApp.wallets.push(wallet);
        await saveToDisk(false, setWallets, txMetadata, counterpartyMetadata);
        A(A.ENUM.CREATED_WALLET);
        presentAlert({
          hapticFeedback: HapticFeedbackTypes.ImpactHeavy,
          message: wallet.type === WatchOnlyWallet.type ? loc.wallets.import_success_watchonly : loc.wallets.import_success,
        });
        Notifications.majorTomToGroundControl(wallet.getAllExternalAddresses(), [], []);
        await wallet.fetchBalance();
        setWallets([...BlueApp.getWallets()]);
      },
      walletsInitialized,
      setWalletsInitialized,
      resetWallets: () => resetWallets(setWallets),
      walletTransactionUpdateStatus,
      setWalletTransactionUpdateStatus,
      isElectrumDisabled,
      setIsElectrumDisabled,
      reloadTransactionsMenuActionFunction,
      setReloadTransactionsMenuActionFunction,
      fetchWalletBalances,
      fetchWalletTransactions,
      getBalance,
      isStorageEncrypted,
      startAndDecrypt,
      encryptStorage,
      sleep,
      createFakeStorage,
      decryptStorage,
      isPasswordInUse,
      cachedPassword,
      getItem,
      setItem,
    }),
    [
      wallets,
      selectedWalletID,
      walletTransactionUpdateStatus,
      walletsInitialized,
      isElectrumDisabled,
      currentSharedCosigner,
      reloadTransactionsMenuActionFunction,
    ],
  );

  return <StorageContext.Provider value={value}>{children}</StorageContext.Provider>;
};
