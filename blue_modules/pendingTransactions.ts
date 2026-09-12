import * as bitcoin from 'bitcoinjs-lib';
import { sha256 } from '@noble/hashes/sha256';

import { Chain } from '../models/bitcoinUnits';
import type { Transaction, TWallet } from '../class/wallets/types';
import { uint8ArrayToHex } from './uint8array-extras';

export type PendingTransactionDirection = 'receiving' | 'sending' | 'mixed' | 'unknown';

export type PendingOnchainSummary = {
  pendingTransactionCount: number;
  totalPendingSats: number;
  direction: PendingTransactionDirection;
};

export type PendingTransactionsWatchConfiguration = {
  version: 1;
  isEnabled: boolean;
  scriptHashes: string[];
};

export type PendingTransactionsSharedSnapshot = {
  pendingTransactionCount: number;
  totalPendingSats: number;
  direction: PendingTransactionDirection;
  updatedAt: string;
};

type AddressProvidingWallet = TWallet & {
  gap_limit?: number;
  next_free_address_index?: number;
  next_free_change_address_index?: number;
  _getExternalAddressByIndex?: (index: number) => string;
  _getInternalAddressByIndex?: (index: number) => string;
};

/**
 * Summarizes unconfirmed on-chain transactions across the visible wallets.
 *
 * A transaction can belong to more than one wallet, so values are combined by
 * txid before calculating the portfolio impact. This keeps both the count and
 * amount from being duplicated for transfers involving multiple local wallets.
 */
export const calculatePendingOnchainTransactions = (wallets: TWallet[]): PendingOnchainSummary => {
  const pendingValueByTxid = new Map<string, number>();

  for (const wallet of wallets) {
    if (wallet.chain !== Chain.ONCHAIN || wallet.hideBalance) continue;

    const seenTxids = new Set<string>();
    let transactions: Transaction[];
    try {
      transactions = wallet.getTransactions();
    } catch {
      continue;
    }

    for (const transaction of transactions) {
      if ((transaction.confirmations ?? 0) > 0) continue;

      const txid = transaction.txid || transaction.hash;
      if (!txid || seenTxids.has(txid)) continue;
      seenTxids.add(txid);

      const value = Number.isFinite(transaction.value) ? (transaction.value ?? 0) : 0;
      pendingValueByTxid.set(txid, (pendingValueByTxid.get(txid) ?? 0) + value);
    }
  }

  const pendingValues = Array.from(pendingValueByTxid.values());
  const totalPendingSats = pendingValues.reduce((total, value) => total + Math.abs(value), 0);
  const hasIncoming = pendingValues.some(value => value > 0);
  const hasOutgoing = pendingValues.some(value => value < 0);
  const direction: PendingTransactionDirection = hasIncoming ? (hasOutgoing ? 'mixed' : 'receiving') : hasOutgoing ? 'sending' : 'unknown';

  return {
    pendingTransactionCount: pendingValueByTxid.size,
    totalPendingSats: Math.round(totalPendingSats),
    direction,
  };
};

const addAddress = (addresses: Set<string>, address: unknown): void => {
  if (typeof address === 'string' && address.length > 0) addresses.add(address);
};

const addDerivedAddresses = (addresses: Set<string>, derive: ((index: number) => string) | undefined, count: number): void => {
  if (!derive || !Number.isSafeInteger(count) || count <= 0) return;

  for (let index = 0; index < count; index++) {
    try {
      addAddress(addresses, derive(index));
    } catch {
      // A partially initialized wallet can fail to derive some addresses. The
      // cached transaction snapshot remains available as a native fallback.
    }
  }
};

const collectWalletAddresses = (wallet: TWallet): string[] => {
  const addresses = new Set<string>();
  const watchableWallet = wallet as AddressProvidingWallet;

  try {
    for (const address of wallet.getAllExternalAddresses()) addAddress(addresses, address);
  } catch {
    // Fall through to direct address/derivation access below.
  }

  try {
    addAddress(addresses, wallet.getAddress());
  } catch {
    // Some wallet types don't expose a synchronous current address.
  }

  const gapLimit = Math.max(0, watchableWallet.gap_limit ?? 0);
  addDerivedAddresses(
    addresses,
    watchableWallet._getExternalAddressByIndex?.bind(wallet),
    Math.max(0, watchableWallet.next_free_address_index ?? 0) + gapLimit,
  );
  addDerivedAddresses(
    addresses,
    watchableWallet._getInternalAddressByIndex?.bind(wallet),
    Math.max(0, watchableWallet.next_free_change_address_index ?? 0) + gapLimit,
  );

  return [...addresses];
};

const addressToElectrumScriptHash = (address: string): string | undefined => {
  try {
    const script = bitcoin.address.toOutputScript(address);
    return uint8ArrayToHex(new Uint8Array(sha256(script)).reverse());
  } catch {
    return undefined;
  }
};

/**
 * Exports only public script hashes, never addresses, xpubs, or private wallet
 * material. Native iOS code uses this watch list to query Electrum without
 * starting the React Native runtime.
 */
export const createPendingTransactionsWatchConfiguration = (
  wallets: TWallet[],
  isEnabled = true,
): PendingTransactionsWatchConfiguration => {
  if (!isEnabled) return { version: 1, isEnabled: false, scriptHashes: [] };

  const scriptHashes = new Set<string>();
  for (const wallet of wallets) {
    if (wallet.chain !== Chain.ONCHAIN || wallet.hideBalance) continue;

    for (const address of collectWalletAddresses(wallet)) {
      const scriptHash = addressToElectrumScriptHash(address);
      if (scriptHash) scriptHashes.add(scriptHash);
    }
  }

  return {
    version: 1,
    isEnabled: true,
    scriptHashes: [...scriptHashes].sort(),
  };
};

export const createPendingTransactionsSharedSnapshot = (
  summary: PendingOnchainSummary,
  now = new Date(),
): PendingTransactionsSharedSnapshot => ({
  ...summary,
  updatedAt: now.toISOString(),
});
