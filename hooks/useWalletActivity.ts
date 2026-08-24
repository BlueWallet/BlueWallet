import { useAppDataQuery } from '../blue_modules/realm/AppDataRealmProvider';
import {
  activityRowToTransaction,
  filterWalletActivity,
  filterWalletActivityForWallets,
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
  const normalizedSearch = search.trim().toLowerCase();
  const walletId = wallet.getID();
  const rows = useAppDataQuery<WalletActivityRow>(
    {
      type: 'WalletActivity',
      query: collection => filterWalletActivity(collection, walletId, { search: normalizedSearch, limit }),
    },
    [limit, normalizedSearch, walletId],
  );
  const allRows = useAppDataQuery<WalletActivityRow>(
    {
      type: 'WalletActivity',
      query: collection => filterWalletActivity(collection, walletId, { search: normalizedSearch }),
    },
    [normalizedSearch, walletId],
  );
  const transactions: WalletActivityTransaction[] = [];
  for (const row of rows) {
    const transaction = toTransaction(row, wallet);
    if (transaction) transactions.push(transaction);
  }
  return { transactions, hasMore: allRows.length > rows.length };
}

/** Looks up one transaction by its canonical ID entirely in Realm. */
export function useWalletTransaction(wallet: TWallet | undefined, transactionId: string | undefined) {
  const walletId = wallet?.getID() ?? '';
  const rows = useAppDataQuery<WalletActivityRow>(
    {
      type: 'WalletActivity',
      query: collection => filterWalletActivity(collection, walletId, { transactionId }),
    },
    [transactionId, walletId],
  );
  return wallet && rows.length > 0 ? toTransaction(rows[0], wallet) : undefined;
}

/** Reads the latest row and pending existence through selective live Realm queries. */
export function useWalletActivitySummary(wallet: TWallet) {
  const walletId = wallet.getID();
  const latestRows = useAppDataQuery<WalletActivityRow>(
    { type: 'WalletActivity', query: collection => filterWalletActivity(collection, walletId, { limit: 1 }) },
    [walletId],
  );
  const pendingRows = useAppDataQuery<WalletActivityRow>(
    { type: 'WalletActivity', query: collection => filterWalletActivity(collection, walletId, { pending: true, limit: 1 }) },
    [walletId],
  );
  return {
    latestTransaction: latestRows.length > 0 ? toTransaction(latestRows[0], wallet) : undefined,
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
  const walletById = new Map(visibleWallets.map(wallet => [wallet.getID(), wallet]));
  const transactions: WalletActivityTransaction[] = [];
  for (const row of rows) {
    const wallet = walletById.get(row.walletId);
    if (!wallet) continue;
    const transaction = toTransaction(row, wallet);
    if (transaction) transactions.push(transaction);
  }
  return transactions;
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
