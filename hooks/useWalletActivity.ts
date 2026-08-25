import { useCallback, useMemo } from 'react';

import { useAppDataQuery, useAppDataRealm } from '../blue_modules/realm/AppDataRealmProvider';
import {
  activityRowToTransaction,
  findWalletTransactionByOutputAddress,
  filterWalletActivity,
  filterWalletActivityByOutputAddress,
  filterWalletActivityForWallets,
  walletAddressHasActivity,
  type WalletActivityQuery,
  type WalletActivityRow,
  type WalletTransactionRow,
} from '../blue_modules/realm/appDataRepository';
import type { ExtendedTransaction, LightningTransaction, TWallet } from '../class/wallets/types';
import { BitcoinUnit } from '../models/bitcoinUnits';

export type WalletActivityTransaction = ExtendedTransaction & LightningTransaction;

const toTransaction = (row: WalletActivityRow, wallet: TWallet): WalletActivityTransaction | undefined => {
  try {
    return {
      ...activityRowToTransaction(row),
      walletID: row.walletId,
      walletPreferredBalanceUnit: wallet.getPreferredBalanceUnit?.() ?? BitcoinUnit.BTC,
    } as WalletActivityTransaction;
  } catch (error) {
    console.warn('[useWalletActivity] Ignoring invalid activity row:', error);
  }
};

const useWalletActivityRows = (walletId: string, options: WalletActivityQuery = {}) => {
  const { search = '', transactionId, pending, confirmed, limit } = options;
  const normalizedSearch = search.trim().toLowerCase();
  return useAppDataQuery<WalletActivityRow>(
    {
      type: 'WalletActivity',
      query: collection =>
        filterWalletActivity(collection, walletId, { search: normalizedSearch, transactionId, pending, confirmed, limit }),
    },
    [confirmed, limit, normalizedSearch, pending, transactionId, walletId],
  );
};

const mapTransactions = (rows: Iterable<WalletActivityRow>, wallets: TWallet[]): WalletActivityTransaction[] => {
  const walletById = new Map(wallets.map(wallet => [wallet.getID(), wallet]));
  const transactions: WalletActivityTransaction[] = [];
  for (const row of rows) {
    const wallet = walletById.get(row.walletId);
    if (!wallet) continue;
    const transaction = toTransaction(row, wallet);
    if (transaction) transactions.push(transaction);
  }
  return transactions;
};

const useTransactionFromRow = (row: WalletActivityRow | undefined, wallet: TWallet | undefined) => {
  const walletId = wallet?.getID() ?? '';
  const payloadJson = row?.payloadJson;
  const preferredBalanceUnit = wallet?.getPreferredBalanceUnit?.() ?? BitcoinUnit.BTC;

  // Realm's managed Results may retain their identity while their rows change.
  // Key the parsed view model by the canonical payload instead of returning a
  // fresh object on every React render; consumers can safely use it in effects.
  return useMemo(() => {
    if (!walletId || !payloadJson) return undefined;
    try {
      return {
        ...(JSON.parse(payloadJson) as WalletActivityTransaction),
        walletID: walletId,
        walletPreferredBalanceUnit: preferredBalanceUnit,
      } as WalletActivityTransaction;
    } catch (error) {
      console.warn('[useWalletActivity] Ignoring invalid activity row:', error);
      return undefined;
    }
  }, [payloadJson, preferredBalanceUnit, walletId]);
};

/** Runs one live Realm query and exposes a bounded view for each requested wallet. */
export default function useWalletActivity(
  wallets: TWallet[],
  search = '',
  limit = Infinity,
): ReadonlyMap<string, WalletActivityTransaction[]> {
  const normalizedSearch = search.trim().toLowerCase();
  const walletIds = wallets.map(wallet => wallet.getID());
  const walletKey = walletIds.join('|');
  const rows = useAppDataQuery<WalletActivityRow>(
    {
      type: 'WalletActivity',
      query: collection => filterWalletActivityForWallets(collection, walletIds, normalizedSearch, limit),
    },
    [limit, normalizedSearch, walletKey],
  );
  const walletById = new Map(wallets.map(wallet => [wallet.getID(), wallet]));
  const byWallet = new Map<string, WalletActivityTransaction[]>(walletIds.map(walletId => [walletId, []]));

  for (const row of rows) {
    const wallet = walletById.get(row.walletId);
    const transactions = byWallet.get(row.walletId);
    if (!wallet || !transactions) continue;
    const transaction = toTransaction(row, wallet);
    if (transaction) transactions.push(transaction);
  }
  return byWallet;
}

export function useWalletActivityPage(wallet: TWallet, search = '', limit = 20) {
  const walletId = wallet.getID();
  const rows = useWalletActivityRows(walletId, { search, limit });
  const allRows = useWalletActivityRows(walletId, { search });
  const transactions = mapTransactions(rows, [wallet]);
  return { transactions, hasMore: allRows.length > rows.length };
}

/** Returns one wallet's live, Realm-filtered activity without a per-wallet map. */
export function useWalletTransactions(wallet: TWallet, search = '', limit = Infinity) {
  return mapTransactions(useWalletActivityRows(wallet.getID(), { search, limit }), [wallet]);
}

/** Looks up one transaction by its canonical ID entirely in Realm. */
export function useWalletTransaction(wallet: TWallet | undefined, transactionId: string | undefined) {
  const walletId = wallet?.getID() ?? '';
  const rows = useWalletActivityRows(walletId, { transactionId });
  return useTransactionFromRow(rows.length > 0 ? rows[0] : undefined, wallet);
}

/** Reacts to the newest canonical transaction paying an exact output address. */
export function useWalletTransactionByOutputAddress(wallet: TWallet | undefined, address: string | undefined) {
  const walletId = wallet?.getID() ?? '';
  const outputAddress = address ?? '';
  const rows = useAppDataQuery<WalletActivityRow>(
    {
      type: 'WalletActivity',
      query: collection => filterWalletActivityByOutputAddress(collection, walletId, outputAddress, 1),
    },
    [outputAddress, walletId],
  );
  return useTransactionFromRow(rows.length > 0 ? rows[0] : undefined, wallet);
}

/** Returns an imperative exact-address lookup without exposing Realm to components. */
export function useFindWalletTransactionByOutputAddress(walletId: string) {
  const realm = useAppDataRealm();
  return useCallback((address: string) => findWalletTransactionByOutputAddress(realm, walletId, address), [realm, walletId]);
}

/** Imperatively checks whether an address already appears in canonical wallet activity. */
export function useIsWalletAddressUsed(walletId: string) {
  const realm = useAppDataRealm();
  return useCallback((address: string) => walletAddressHasActivity(realm, walletId, address), [realm, walletId]);
}

/** Reads the latest row and pending existence through selective live Realm queries. */
export function useWalletActivitySummary(wallet: TWallet) {
  const walletId = wallet.getID();
  const latestRows = useWalletActivityRows(walletId, { limit: 1 });
  const pendingRows = useWalletActivityRows(walletId, { pending: true, limit: 1 });
  const latestTransaction = useTransactionFromRow(latestRows.length > 0 ? latestRows[0] : undefined, wallet);
  return {
    latestTransaction,
    hasPendingTransaction: pendingRows.length > 0,
  };
}

/** Runs one globally ordered Realm query, suitable for the home activity feed. */
export function useWalletActivityFeed(wallets: TWallet[], search = '', limit = 20): WalletActivityTransaction[] {
  const normalizedSearch = search.trim().toLowerCase();
  const visibleWallets = wallets.filter(wallet => !wallet.getHideTransactionsInWalletsList());
  const walletIds = visibleWallets.map(wallet => wallet.getID());
  const walletKey = walletIds.join('|');
  const rows = useAppDataQuery<WalletActivityRow>(
    {
      type: 'WalletActivity',
      query: collection => filterWalletActivityForWallets(collection, walletIds, normalizedSearch, limit),
    },
    [limit, normalizedSearch, walletKey],
  );
  return mapTransactions(rows, visibleWallets);
}

/** Counts raw address-index transactions from one live Realm query. */
export function useWalletAddressTransactionCounts(walletId: string): ReadonlyMap<string, number> {
  const rows = useAppDataQuery<WalletTransactionRow>(
    { type: 'WalletTransaction', query: collection => collection.filtered('walletId == $0', walletId) },
    [walletId],
  );
  const counts = new Map<string, number>();
  for (const row of rows) {
    if ((row.collection !== 'external' && row.collection !== 'internal') || row.index === null) continue;
    const key = `${row.collection}:${row.index}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}
