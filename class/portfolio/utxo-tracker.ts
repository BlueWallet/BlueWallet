import { TWallet } from '../wallets/types';
import { Utxo } from '../wallets/types';
import { Chain } from '../../models/bitcoinUnits';

/**
 * Tracks when UTXOs were first seen by wallets
 * Handles send-to-self edge cases by preserving original first-seen timestamp
 */
export class UtxoTracker {
  /**
   * Updates first-seen timestamps for UTXOs in a wallet
   * Only sets timestamp if it doesn't already exist (preserves original timestamp for send-to-self)
   * Uses the transaction timestamp, not the current time
   *
   * @param wallet - The wallet to track UTXOs for
   */
  static trackUtxos(wallet: TWallet): void {
    const utxos = wallet.getUtxo(true); // Get all UTXOs including frozen ones
    const transactions = wallet.getTransactions();
    const transactionsByTxid: Record<string, typeof transactions[0]> = {};

    // Build transaction lookup map
    for (const tx of transactions) {
      transactionsByTxid[tx.txid] = tx;
    }

    for (const utxo of utxos) {
      const existingMetadata = wallet.getUTXOMetadata(utxo.txid, utxo.vout);

      // Only set firstSeenTimestamp if it doesn't exist
      // This preserves the original timestamp for send-to-self transactions
      if (!existingMetadata.firstSeenTimestamp) {
        // Get the transaction timestamp for this UTXO
        const tx = transactionsByTxid[utxo.txid];
        let firstSeenTimestamp: number;
        
        if (tx) {
          // Transaction timestamp is in seconds, convert to milliseconds
          firstSeenTimestamp = (tx.timestamp || tx.time || tx.blocktime || Date.now() / 1000) * 1000;
        } else {
          // Last resort: use current time (shouldn't happen normally)
          firstSeenTimestamp = Date.now();
        }

        wallet.setUTXOMetadata(utxo.txid, utxo.vout, {
          ...existingMetadata,
          firstSeenTimestamp,
        });
      }
    }
  }

  /**
   * Gets UTXOs with their first-seen timestamps
   * For UTXOs without a timestamp, uses transaction timestamp as fallback
   *
   * @param wallet - The wallet to get UTXOs from
   * @returns Array of UTXOs with firstSeenTimestamp property
   */
  static getUtxosWithFirstSeen(wallet: TWallet): Array<Utxo & { firstSeenTimestamp: number }> {
    const utxos = wallet.getUtxo(true);
    const transactions = wallet.getTransactions();
    const transactionsByTxid: Record<string, typeof transactions[0]> = {};

    // Build transaction lookup map
    for (const tx of transactions) {
      transactionsByTxid[tx.txid] = tx;
    }

    return utxos.map(utxo => {
      const metadata = wallet.getUTXOMetadata(utxo.txid, utxo.vout);
      let firstSeenTimestamp = metadata.firstSeenTimestamp;

      // Fallback: use transaction timestamp if firstSeenTimestamp not set
      // Convert from seconds to milliseconds if needed
      if (!firstSeenTimestamp) {
        const tx = transactionsByTxid[utxo.txid];
        if (tx) {
          // Transaction timestamp is in seconds, convert to milliseconds
          firstSeenTimestamp = (tx.timestamp || tx.time || Date.now() / 1000) * 1000;
        } else {
          // Last resort: use current time
          firstSeenTimestamp = Date.now();
        }
      }

      return {
        ...utxo,
        firstSeenTimestamp,
      };
    });
  }

  /**
   * Tracks UTXOs for all wallets
   * Useful for batch processing when wallets are refreshed
   *
   * @param wallets - Array of wallets to track
   */
  static trackAllWallets(wallets: TWallet[]): void {
    for (const wallet of wallets) {
      // Only track on-chain wallets
      if (wallet.chain === 'ONCHAIN' || wallet.chain === Chain.ONCHAIN) {
        this.trackUtxos(wallet);
      }
    }
  }

  /**
   * Cleans up UTXO metadata for a deleted wallet
   * Removes all firstSeenTimestamp entries for the wallet's UTXOs
   *
   * @param wallet - The wallet being deleted
   */
  static cleanupWallet(wallet: TWallet): void {
    const utxos = wallet.getUtxo(true);
    for (const utxo of utxos) {
      const metadata = wallet.getUTXOMetadata(utxo.txid, utxo.vout);
      // Remove firstSeenTimestamp but keep other metadata (frozen, memo)
      if (metadata.firstSeenTimestamp !== undefined) {
        const { firstSeenTimestamp, ...rest } = metadata;
        wallet.setUTXOMetadata(utxo.txid, utxo.vout, rest);
      }
    }
  }
}

