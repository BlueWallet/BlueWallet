import { useEffect } from 'react';
import NativeSpotlight from '../blue_modules/NativeSpotlight';
import { beginSpotlightWalletIndexing } from '../blue_modules/spotlight-index-status';
import { useSettings } from './context/useSettings';
import { useStorage } from './context/useStorage';

type SpotlightItem = {
  identifier: string;
  domain: string;
  title: string;
  description?: string;
  keywords: string[];
  url: string;
  relatedIdentifier?: string;
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
  const { wallets, walletsInitialized, txMetadata, counterpartyMetadata, storageRevision } = useStorage();
  const { isSpotlightEnabled, isSpotlightAddressesEnabled } = useSettings();

  useEffect(() => {
    if (!walletsInitialized || !NativeSpotlight) return;
    const spotlight = NativeSpotlight;

    if (!isSpotlightEnabled) {
      console.debug('[Spotlight] Queueing index removal');
      enqueueSpotlightOperation(() => spotlight.deleteIndex())
        .then(() => console.debug('[Spotlight] Index removed'))
        .catch(error => console.warn('[Spotlight] Unable to clear index:', error));
      return;
    }

    console.debug('[Spotlight] Scheduling index refresh', {
      storageRevision,
      walletCount: wallets.length,
      includesAddresses: isSpotlightAddressesEnabled,
    });

    const timer = setTimeout(() => {
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
        const walletURL = `bluewallet://wallet/${encodeURIComponent(walletID)}`;
        items.push({
          identifier: `wallet:${walletID}`,
          domain: 'wallets',
          title: walletLabel,
          description: wallet.typeReadable,
          keywords: unique(['BlueWallet', 'Bitcoin', walletLabel, wallet.typeReadable]),
          url: walletURL,
        });

        try {
          for (const transaction of wallet.getTransactions()) {
            const txid = transaction.hash || transaction.txid;
            if (!txid) continue;
            const transactionMemo = 'memo' in transaction && typeof transaction.memo === 'string' ? transaction.memo.trim() : '';
            const memo = txMetadata[txid]?.memo?.trim() || transactionMemo;
            const addresses = isSpotlightAddressesEnabled
              ? unique([
                  ...(transaction.inputs || []).flatMap(input => input.addresses || (input.address ? [input.address] : [])),
                  ...(transaction.outputs || []).flatMap(output => output.scriptPubKey?.addresses || []),
                ])
              : [];
            items.push({
              identifier: `transaction:${walletID}:${txid}`,
              domain: 'transactions',
              title: memo || `Transaction ${txid.slice(0, 8)}`,
              description: `${walletLabel} · ${txid}`,
              keywords: unique(['Bitcoin transaction', walletLabel, memo, txid, ...addresses]),
              url: `bluewallet://transaction?walletID=${encodeURIComponent(walletID)}&txid=${encodeURIComponent(txid)}`,
              relatedIdentifier: `wallet:${walletID}`,
            });
            transactionCount += 1;
          }
        } catch (error) {
          console.warn('[Spotlight] Unable to prepare transactions for one wallet:', error);
        }
      }

      for (const [paymentCode, metadata] of Object.entries(counterpartyMetadata)) {
        if (metadata.hidden || !metadata.label?.trim()) continue;
        items.push({
          identifier: `contact:${paymentCode}`,
          domain: 'contacts',
          title: metadata.label.trim(),
          description: 'BlueWallet contact',
          keywords: unique(['BlueWallet contact', metadata.label.trim(), ...(isSpotlightAddressesEnabled ? [paymentCode] : [])]),
          url: `bluewallet://contact?paymentCode=${encodeURIComponent(paymentCode)}`,
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
        .then(indexedItemCount => console.debug('[Spotlight] Index refresh completed', { indexedItemCount }))
        .catch(error => console.warn('[Spotlight] Unable to update index:', error))
        .finally(() => {
          finishIndexing();
          console.debug('[Spotlight] Wallet indexing activity finished');
        });
    }, 750);

    return () => clearTimeout(timer);
  }, [counterpartyMetadata, isSpotlightAddressesEnabled, isSpotlightEnabled, storageRevision, txMetadata, wallets, walletsInitialized]);
};

export default useSpotlightIndex;
