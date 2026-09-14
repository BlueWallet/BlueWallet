import { useEffect } from 'react';
import NativeSpotlight from '../blue_modules/NativeSpotlight';
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

const useSpotlightIndex = (): void => {
  const { wallets, walletsInitialized, txMetadata, counterpartyMetadata } = useStorage();
  const { isSpotlightEnabled, isSpotlightAddressesEnabled } = useSettings();

  useEffect(() => {
    if (!walletsInitialized || !NativeSpotlight) return;
    const spotlight = NativeSpotlight;

    if (!isSpotlightEnabled) {
      spotlight.deleteIndex().catch(error => console.warn('Unable to clear Spotlight index:', error));
      return;
    }

    const timer = setTimeout(() => {
      const items: SpotlightItem[] = [];

      for (const wallet of wallets) {
        if (wallet.getHideTransactionsInWalletsList()) continue;

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
          }
        } catch (error) {
          console.warn(`Unable to prepare Spotlight transactions for ${walletLabel}:`, error);
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
      }

      spotlight.replaceIndex(JSON.stringify(items)).catch(error => console.warn('Unable to update Spotlight index:', error));
    }, 750);

    return () => clearTimeout(timer);
  }, [counterpartyMetadata, isSpotlightAddressesEnabled, isSpotlightEnabled, txMetadata, wallets, walletsInitialized]);
};

export default useSpotlightIndex;
