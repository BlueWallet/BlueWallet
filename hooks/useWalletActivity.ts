import { useEffect, useState } from 'react';
import type Realm from 'realm';

import {
  activityRowToTransaction,
  queryWalletActivity,
  queryWalletActivityForWallets,
  queryWalletTransactions,
  type WalletActivityRow,
  type WalletTransactionRow,
} from '../blue_modules/realm/appDataRepository';
import { BlueApp as BlueAppClass } from '../class/blue-app';
import type { ExtendedTransaction, LightningTransaction, TWallet } from '../class/wallets/types';
import { BitcoinUnit } from '../models/bitcoinUnits';

const BlueApp = BlueAppClass.getInstance();

export type WalletActivityTransaction = ExtendedTransaction & LightningTransaction;
type ActivityListener = Parameters<Realm.Results<WalletActivityRow>['addListener']>[0];
type ActivityQueryState = {
  byWallet: ReadonlyMap<string, WalletActivityTransaction[]>;
  hasMoreByWallet: ReadonlyMap<string, boolean>;
};
type ActivityFilter = {
  transactionId?: string;
  pending?: boolean;
  confirmed?: boolean;
};

function useWalletActivityQueries(
  wallets: TWallet[],
  search = '',
  perWalletLimit = Infinity,
  { transactionId, pending, confirmed }: ActivityFilter = {},
): ActivityQueryState {
  const normalizedSearch = search.trim().toLowerCase();
  const walletKey = wallets.map(wallet => `${wallet.getID()}:${wallet.getPreferredBalanceUnit?.() ?? BitcoinUnit.BTC}`).join('|');
  const realmIdentity = BlueApp.getAppDataRealmIdentity();
  const [state, setState] = useState<ActivityQueryState>({
    byWallet: new Map(),
    hasMoreByWallet: new Map(),
  });

  useEffect(() => {
    let active = true;
    const subscriptions: Array<{
      results: Realm.Results<WalletActivityRow>;
      listener: ActivityListener;
    }> = [];
    setState({ byWallet: new Map(), hasMoreByWallet: new Map() });

    BlueApp.getRealmForTransactions()
      .then(realm => {
        if (!active) return;

        for (const wallet of wallets) {
          const walletId = wallet.getID();
          const preferredUnit = wallet.getPreferredBalanceUnit?.() ?? BitcoinUnit.BTC;
          const results = queryWalletActivity(realm, walletId, {
            search: normalizedSearch,
            transactionId,
            pending,
            confirmed,
          });

          const publish: ActivityListener = collection => {
            if (!active || realm.isClosed) return;
            const transactions = collection.slice(0, perWalletLimit).flatMap(row => {
              try {
                return [
                  {
                    ...activityRowToTransaction(row),
                    walletID: walletId,
                    walletPreferredBalanceUnit: preferredUnit,
                  } as WalletActivityTransaction,
                ];
              } catch (error) {
                console.warn('[useWalletActivity] Ignoring invalid activity row:', error);
                return [];
              }
            });
            setState(previous => ({
              byWallet: new Map(previous.byWallet).set(walletId, transactions),
              hasMoreByWallet: new Map(previous.hasMoreByWallet).set(walletId, collection.length > perWalletLimit),
            }));
          };

          subscriptions.push({ results, listener: publish });
          results.addListener(publish);
        }
      })
      .catch(error => console.warn('[useWalletActivity] Failed to open app data Realm:', error));

    return () => {
      active = false;
      for (const { results, listener } of subscriptions) {
        if (results.isValid()) results.removeListener(listener);
      }
    };
    // walletKey captures query-relevant wallet identity without depending on mutable objects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmed, normalizedSearch, pending, perWalletLimit, realmIdentity, transactionId, walletKey]);

  return state;
}

/** Runs live Realm queries for activity, search, and bounded per-wallet windows. */
export default function useWalletActivity(
  wallets: TWallet[],
  search = '',
  perWalletLimit = Infinity,
): ReadonlyMap<string, WalletActivityTransaction[]> {
  return useWalletActivityQueries(wallets, search, perWalletLimit).byWallet;
}

export function useWalletActivityPage(wallet: TWallet, search = '', limit = 20) {
  const state = useWalletActivityQueries([wallet], search, limit);
  const walletId = wallet.getID();
  return {
    transactions: state.byWallet.get(walletId) ?? [],
    hasMore: state.hasMoreByWallet.get(walletId) ?? false,
  };
}

/** Looks up one transaction by its canonical ID entirely in Realm. */
export function useWalletTransaction(wallet: TWallet | undefined, transactionId: string | undefined) {
  const state = useWalletActivityQueries(wallet && transactionId ? [wallet] : [], '', 1, { transactionId });
  return wallet && transactionId ? state.byWallet.get(wallet.getID())?.[0] : undefined;
}

/** Reads the latest row and pending existence through two selective live Realm queries. */
export function useWalletActivitySummary(wallet: TWallet) {
  const latest = useWalletActivityQueries([wallet], '', 1);
  const pending = useWalletActivityQueries([wallet], '', 1, { pending: true });
  const walletId = wallet.getID();
  return {
    latestTransaction: latest.byWallet.get(walletId)?.[0],
    hasPendingTransaction: (pending.byWallet.get(walletId)?.length ?? 0) > 0,
  };
}

/** Runs one globally ordered Realm query, suitable for the home activity feed. */
export function useWalletActivityFeed(wallets: TWallet[], search = '', limit = 20): WalletActivityTransaction[] {
  const normalizedSearch = search.trim().toLowerCase();
  const walletKey = wallets
    .map(
      wallet => `${wallet.getID()}:${wallet.getPreferredBalanceUnit?.() ?? BitcoinUnit.BTC}:${wallet.getHideTransactionsInWalletsList()}`,
    )
    .join('|');
  const realmIdentity = BlueApp.getAppDataRealmIdentity();
  const [transactions, setTransactions] = useState<WalletActivityTransaction[]>([]);

  useEffect(() => {
    let active = true;
    let results: Realm.Results<WalletActivityRow> | undefined;
    let listener: ActivityListener | undefined;
    setTransactions([]);

    BlueApp.getRealmForTransactions()
      .then(realm => {
        if (!active) return;
        const visibleWallets = wallets.filter(wallet => !wallet.getHideTransactionsInWalletsList());
        const walletById = new Map(visibleWallets.map(wallet => [wallet.getID(), wallet]));
        results = queryWalletActivityForWallets(
          realm,
          visibleWallets.map(wallet => wallet.getID()),
          normalizedSearch,
        );

        listener = collection => {
          if (!active || realm.isClosed) return;
          setTransactions(
            collection.slice(0, limit).flatMap(row => {
              const wallet = walletById.get(row.walletId);
              if (!wallet) return [];
              try {
                return [
                  {
                    ...activityRowToTransaction(row),
                    walletID: row.walletId,
                    walletPreferredBalanceUnit: wallet.getPreferredBalanceUnit?.() ?? BitcoinUnit.BTC,
                  } as WalletActivityTransaction,
                ];
              } catch (error) {
                console.warn('[useWalletActivityFeed] Ignoring invalid activity row:', error);
                return [];
              }
            }),
          );
        };
        results.addListener(listener);
      })
      .catch(error => console.warn('[useWalletActivityFeed] Failed to open app data Realm:', error));

    return () => {
      active = false;
      if (results?.isValid() && listener) results.removeListener(listener);
    };
    // walletKey captures query-relevant wallet identity without depending on mutable objects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, normalizedSearch, realmIdentity, walletKey]);

  return transactions;
}

/** Counts raw address-index transactions from one live Realm query. */
export function useWalletAddressTransactionCounts(walletId: string): ReadonlyMap<string, number> {
  const realmIdentity = BlueApp.getAppDataRealmIdentity();
  const [counts, setCounts] = useState<ReadonlyMap<string, number>>(new Map());

  useEffect(() => {
    let active = true;
    let results: Realm.Results<WalletTransactionRow> | undefined;
    let listener: Parameters<Realm.Results<WalletTransactionRow>['addListener']>[0] | undefined;
    setCounts(new Map());

    BlueApp.getRealmForTransactions()
      .then(realm => {
        if (!active) return;
        results = queryWalletTransactions(realm, walletId);
        listener = collection => {
          if (!active || realm.isClosed) return;
          const next = new Map<string, number>();
          for (const row of collection) {
            if ((row.collection !== 'external' && row.collection !== 'internal') || row.index === null) continue;
            const key = `${row.collection}:${row.index}`;
            next.set(key, (next.get(key) ?? 0) + 1);
          }
          setCounts(next);
        };
        results.addListener(listener);
      })
      .catch(error => console.warn('[useWalletAddressTransactionCounts] Failed to open app data Realm:', error));

    return () => {
      active = false;
      if (results?.isValid() && listener) results.removeListener(listener);
    };
  }, [realmIdentity, walletId]);

  return counts;
}
