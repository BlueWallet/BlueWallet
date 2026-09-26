import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { navigationRef } from '../NavigationService';
import NativePlatformSearch, {
  beginPlatformSearchWalletIndexing,
  usePlatformSearchAvailability,
} from '../blue_modules/NativePlatformSearch';
import { satoshiToLocalCurrency } from '../blue_modules/currency';
import { formatBalanceWithoutSuffix } from '../loc';
import { BitcoinUnit } from '../models/bitcoinUnits';
import { isDesktop } from '../blue_modules/environment';
import { useSettings } from './context/useSettings';
import { useStorage } from './context/useStorage';

type PlatformSearchItem = {
  identifier: string;
  domain: string;
  title: string;
  description?: string;
  keywords: string[];
  relatedIdentifier?: string;
  rankingHint: number;
  lastUsedAt?: number;
  userCreated?: boolean;
  userCurated?: boolean;
};

const unique = (values: Array<string | undefined>): string[] => [...new Set(values.filter((value): value is string => !!value))];

let platformSearchOperationQueue: Promise<void> = Promise.resolve();

const enqueuePlatformSearchOperation = <T>(operation: () => Promise<T>): Promise<T> => {
  const result = platformSearchOperationQueue.then(operation);
  platformSearchOperationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
};

const usePlatformSearch = (): (() => void) => {
  const { wallets, walletsInitialized, txMetadata, counterpartyMetadata, isStorageEncrypted } = useStorage();
  const { isPlatformSearchEnabled, isPlatformSearchAddressesEnabled, preferredFiatCurrency } = useSettings();

  const indexingAvailable = usePlatformSearchAvailability();
  const platformSearchActivityRequest = useRef(0);

  const updatePlatformSearchActivity = useCallback(() => {
    const request = ++platformSearchActivityRequest.current;
    const route = navigationRef.getCurrentRoute();
    const params = route?.params as { walletID?: string; hash?: string } | undefined;
    const wallet = params?.walletID ? wallets.find(candidate => candidate.getID() === params.walletID) : undefined;

    if (indexingAvailable !== true || !isPlatformSearchEnabled || !wallet || wallet.getHideTransactionsInWalletsList()) {
      NativePlatformSearch?.clearActivity?.();
      return;
    }

    isStorageEncrypted()
      .then(storageIsEncrypted => {
        if (request !== platformSearchActivityRequest.current) return;
        if (storageIsEncrypted) {
          NativePlatformSearch?.clearActivity?.();
          return;
        }

        if (route?.name === 'TransactionStatus' && params?.hash) {
          const title = txMetadata[params.hash]?.memo?.trim() || `Transaction ${params.hash.slice(0, 8)}`;
          NativePlatformSearch?.donateActivity?.(`transaction:${wallet.getID()}:${params.hash}`, title);
        } else if (route?.name === 'WalletTransactions' || route?.name === 'WalletDetails') {
          NativePlatformSearch?.donateActivity?.(`wallet:${wallet.getID()}`, wallet.getLabel());
        } else {
          NativePlatformSearch?.clearActivity?.();
        }
      })
      .catch(error => {
        NativePlatformSearch?.clearActivity?.();
        console.warn('[PlatformSearch] Unable to donate navigation activity:', error);
      });
  }, [indexingAvailable, isPlatformSearchEnabled, isStorageEncrypted, txMetadata, wallets]);

  useEffect(() => {
    if (navigationRef.isReady()) updatePlatformSearchActivity();
  }, [updatePlatformSearchActivity]);

  useEffect(() => {
    const supportsSystemSearch = Platform.OS === 'ios' || isDesktop || (Platform.OS === 'android' && Number(Platform.Version) >= 31);
    if (!supportsSystemSearch || !NativePlatformSearch) return;
    const platformSearch = NativePlatformSearch;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const updateIndex = async (): Promise<void> => {
      // Disabled search still clears old entries, but must not initialize storage.
      // Wait for wallet loading before adding another encryption-state reader.
      if (indexingAvailable === null) return;
      const searchEnabled = isPlatformSearchEnabled && indexingAvailable;
      if (searchEnabled && !walletsInitialized) return;
      const storageIsEncrypted = searchEnabled ? await isStorageEncrypted() : false;
      if (cancelled) return;

      if (!searchEnabled || storageIsEncrypted) {
        enqueuePlatformSearchOperation(() => platformSearch.deleteIndex()).catch(error =>
          console.warn('[PlatformSearch] Unable to clear index:', error),
        );
        return;
      }

      timer = setTimeout(() => {
        const items: PlatformSearchItem[] = [];
        const indexedWallets = wallets.filter(wallet => !wallet.getHideTransactionsInWalletsList());
        const finishIndexing = beginPlatformSearchWalletIndexing(indexedWallets.map(wallet => wallet.getID()));

        for (const wallet of indexedWallets) {
          const walletID = wallet.getID();
          const walletLabel = wallet.getLabel();
          const walletDomain = `wallet.${walletID}`;
          items.push({
            identifier: `wallet:${walletID}`,
            domain: walletDomain,
            title: walletLabel,
            description: wallet.typeReadable,
            keywords: unique(['BlueWallet', 'Bitcoin', walletLabel, wallet.typeReadable]),
            rankingHint: 80,
          });

          try {
            for (const transaction of wallet.getTransactions()) {
              const txid = transaction.hash || transaction.txid;
              if (!txid) continue;
              const transactionMemo = 'memo' in transaction && typeof transaction.memo === 'string' ? transaction.memo.trim() : '';
              const memo = txMetadata[txid]?.memo?.trim() || transactionMemo;
              const transactionValue = !wallet.hideBalance && typeof transaction.value === 'number' ? transaction.value : undefined;
              const formattedSats =
                transactionValue === undefined ? undefined : `${formatBalanceWithoutSuffix(transactionValue, BitcoinUnit.SATS, true)} sats`;
              const formattedFiat = transactionValue === undefined ? undefined : satoshiToLocalCurrency(transactionValue);
              const amountDescription = [formattedSats, formattedFiat === '...' ? undefined : formattedFiat].filter(Boolean).join(' · ');
              const addresses = isPlatformSearchAddressesEnabled
                ? unique([
                    ...(transaction.inputs || []).flatMap(input => input.addresses || (input.address ? [input.address] : [])),
                    ...(transaction.outputs || []).flatMap(output => output.scriptPubKey?.addresses || []),
                  ])
                : [];
              items.push({
                identifier: `transaction:${walletID}:${txid}`,
                domain: walletDomain,
                title: memo || `Transaction ${txid.slice(0, 8)}`,
                description: amountDescription ? `${amountDescription} · ${walletLabel}\n${txid}` : `${walletLabel} · ${txid}`,
                keywords: unique(['Bitcoin transaction', walletLabel, memo, txid, formattedSats, formattedFiat, ...addresses]),
                relatedIdentifier: `wallet:${walletID}`,
                rankingHint: memo ? 75 : 50,
                lastUsedAt: typeof transaction.timestamp === 'number' ? transaction.timestamp : undefined,
                userCreated: !!memo,
              });
            }
          } catch (error) {
            console.warn('[PlatformSearch] Unable to prepare transactions for one wallet:', error);
          }
        }

        for (const [paymentCode, metadata] of Object.entries(counterpartyMetadata ?? {})) {
          if (metadata.hidden || !metadata.label?.trim()) continue;
          items.push({
            identifier: `contact:${paymentCode}`,
            domain: 'contacts',
            title: metadata.label.trim(),
            description: 'BlueWallet contact',
            keywords: unique(['BlueWallet contact', metadata.label.trim(), ...(isPlatformSearchAddressesEnabled ? [paymentCode] : [])]),
            rankingHint: 65,
            userCurated: true,
          });
        }

        enqueuePlatformSearchOperation(() => platformSearch.replaceIndex(JSON.stringify(items)))
          .catch(error => console.warn('[PlatformSearch] Unable to update index:', error))
          .finally(finishIndexing);
      }, 750);
    };

    updateIndex().catch(error => {
      console.warn('[PlatformSearch] Unable to determine storage encryption state; clearing index:', error);
      enqueuePlatformSearchOperation(() => platformSearch.deleteIndex()).catch(deleteError =>
        console.warn('[PlatformSearch] Unable to clear index after encryption-state failure:', deleteError),
      );
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [
    counterpartyMetadata,
    indexingAvailable,
    isPlatformSearchAddressesEnabled,
    isPlatformSearchEnabled,
    isStorageEncrypted,
    preferredFiatCurrency,
    txMetadata,
    wallets,
    walletsInitialized,
  ]);
  return updatePlatformSearchActivity;
};

export default usePlatformSearch;
