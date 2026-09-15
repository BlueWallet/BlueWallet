import { useEffect } from 'react';
import { Platform } from 'react-native';
import NativeSpotlight, { beginSpotlightWalletIndexing } from '../blue_modules/NativeSpotlight';
import { satoshiToLocalCurrency } from '../blue_modules/currency';
import { formatBalanceWithoutSuffix } from '../loc';
import { BitcoinUnit } from '../models/bitcoinUnits';
import { useSettings } from './context/useSettings';
import { useStorage } from './context/useStorage';

type SpotlightItem = {
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

let spotlightOperationQueue: Promise<void> = Promise.resolve();

const enqueueSpotlightOperation = <T>(operation: () => Promise<T>): Promise<T> => {
  const result = spotlightOperationQueue.then(operation);
  spotlightOperationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
};

const useSpotlightIndex = (): void => {
  const { wallets, walletsInitialized, txMetadata, counterpartyMetadata, storageRevision, isStorageEncrypted } = useStorage();
  const { isSpotlightEnabled, isSpotlightAddressesEnabled, preferredFiatCurrency } = useSettings();

  useEffect(() => {
    if (Platform.OS !== 'ios' || !NativeSpotlight) return;
    const spotlight = NativeSpotlight;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const updateIndex = async (): Promise<void> => {
      const storageIsEncrypted = await isStorageEncrypted();
      if (cancelled) return;

      if (!isSpotlightEnabled || storageIsEncrypted) {
        console.debug('[Spotlight] Queueing index removal', {
          storageIsEncrypted,
        });
        enqueueSpotlightOperation(() => spotlight.deleteIndex())
          .then(() => console.debug('[Spotlight] Index removed'))
          .catch(error => console.warn('[Spotlight] Unable to clear index:', error));
        return;
      }

      if (!walletsInitialized) return;

      console.debug('[Spotlight] Scheduling index refresh', {
        storageRevision,
        walletCount: wallets.length,
        includesAddresses: isSpotlightAddressesEnabled,
      });

      timer = setTimeout(() => {
        const items: SpotlightItem[] = [];
        const indexedWallets = wallets.filter(wallet => !wallet.getHideTransactionsInWalletsList());
        const finishIndexing = beginSpotlightWalletIndexing(indexedWallets.map(wallet => wallet.getID()));
        let transactionCount = 0;
        let contactCount = 0;

        console.debug('[Spotlight] Preparing index', {
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
              const addresses = isSpotlightAddressesEnabled
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
            console.warn('[Spotlight] Unable to prepare transactions for one wallet:', error);
          }
        }

        for (const [paymentCode, metadata] of Object.entries(counterpartyMetadata ?? {})) {
          if (metadata.hidden || !metadata.label?.trim()) continue;
          items.push({
            identifier: `contact:${paymentCode}`,
            domain: 'contacts',
            title: metadata.label.trim(),
            description: 'BlueWallet contact',
            keywords: unique(['BlueWallet contact', metadata.label.trim(), ...(isSpotlightAddressesEnabled ? [paymentCode] : [])]),
            rankingHint: 65,
            userCurated: true,
          });
          contactCount += 1;
        }

        console.debug('[Spotlight] Queueing prepared index', {
          walletCount: indexedWallets.length,
          transactionCount,
          contactCount,
          totalItemCount: items.length,
        });

        enqueueSpotlightOperation(() => spotlight.replaceIndex(JSON.stringify(items)))
          .then(indexedItemCount =>
            console.debug('[Spotlight] Index refresh completed', {
              indexedItemCount,
            }),
          )
          .catch(error => console.warn('[Spotlight] Unable to update index:', error))
          .finally(() => {
            finishIndexing();
            console.debug('[Spotlight] Wallet indexing activity finished');
          });
      }, 750);
    };

    updateIndex().catch(error => {
      console.warn('[Spotlight] Unable to determine storage encryption state; clearing index:', error);
      enqueueSpotlightOperation(() => spotlight.deleteIndex()).catch(deleteError =>
        console.warn('[Spotlight] Unable to clear index after encryption-state failure:', deleteError),
      );
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [
    counterpartyMetadata,
    isSpotlightAddressesEnabled,
    isSpotlightEnabled,
    isStorageEncrypted,
    preferredFiatCurrency,
    storageRevision,
    txMetadata,
    wallets,
    walletsInitialized,
  ]);
};

export default useSpotlightIndex;
