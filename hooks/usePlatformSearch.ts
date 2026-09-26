import { useEffect } from 'react';
import { Platform } from 'react-native';
import NativePlatformSearch, { beginPlatformSearchWalletIndexing } from '../blue_modules/NativePlatformSearch';
import { satoshiToLocalCurrency } from '../blue_modules/currency';
import { formatBalanceWithoutSuffix } from '../loc';
import { BitcoinUnit } from '../models/bitcoinUnits';
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

const usePlatformSearch = (): void => {
  const { wallets, walletsInitialized, txMetadata, counterpartyMetadata, storageRevision, isStorageEncrypted } = useStorage();
  const { isPlatformSearchEnabled, isPlatformSearchAddressesEnabled, preferredFiatCurrency } = useSettings();

  useEffect(() => {
    const supportsSystemSearch = Platform.OS === 'ios' || (Platform.OS === 'android' && Number(Platform.Version) >= 31);
    if (!supportsSystemSearch || !NativePlatformSearch) return;
    const platformSearch = NativePlatformSearch;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const updateIndex = async (): Promise<void> => {
      // Disabled search still clears old entries, but must not initialize storage.
      // Wait for wallet loading before adding another encryption-state reader.
      if (isPlatformSearchEnabled && !walletsInitialized) return;
      const storageIsEncrypted = isPlatformSearchEnabled ? await isStorageEncrypted() : false;
      if (cancelled) return;

      if (!isPlatformSearchEnabled || storageIsEncrypted) {
        console.debug('[PlatformSearch] Queueing index removal', {
          storageIsEncrypted,
        });
        enqueuePlatformSearchOperation(() => platformSearch.deleteIndex())
          .then(() => console.debug('[PlatformSearch] Index removed'))
          .catch(error => console.warn('[PlatformSearch] Unable to clear index:', error));
        return;
      }

      if (!walletsInitialized) return;

      console.debug('[PlatformSearch] Scheduling index refresh', {
        storageRevision,
        walletCount: wallets.length,
        includesAddresses: isPlatformSearchAddressesEnabled,
      });

      timer = setTimeout(() => {
        const items: PlatformSearchItem[] = [];
        const indexedWallets = wallets.filter(wallet => !wallet.getHideTransactionsInWalletsList());
        const finishIndexing = beginPlatformSearchWalletIndexing(indexedWallets.map(wallet => wallet.getID()));
        let transactionCount = 0;
        let contactCount = 0;

        console.debug('[PlatformSearch] Preparing index', {
          indexedWalletCount: indexedWallets.length,
          hiddenWalletCount: wallets.length - indexedWallets.length,
        });

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
              transactionCount += 1;
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
          contactCount += 1;
        }

        console.debug('[PlatformSearch] Queueing prepared index', {
          walletCount: indexedWallets.length,
          transactionCount,
          contactCount,
          totalItemCount: items.length,
        });

        enqueuePlatformSearchOperation(() => platformSearch.replaceIndex(JSON.stringify(items)))
          .then(indexedItemCount =>
            console.debug('[PlatformSearch] Index refresh completed', {
              indexedItemCount,
            }),
          )
          .catch(error => console.warn('[PlatformSearch] Unable to update index:', error))
          .finally(() => {
            finishIndexing();
            console.debug('[PlatformSearch] Wallet indexing activity finished');
          });
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
    isPlatformSearchAddressesEnabled,
    isPlatformSearchEnabled,
    isStorageEncrypted,
    preferredFiatCurrency,
    storageRevision,
    txMetadata,
    wallets,
    walletsInitialized,
  ]);
};

export default usePlatformSearch;
