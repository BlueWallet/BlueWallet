import { useCallback, useEffect, useMemo } from 'react';

import { useWalletDataQuery, useWalletDataRealm } from '../blue_modules/realm/WalletDataRealmProvider';
import { queryWalletOrder, setWalletOrder, syncWalletOrder, type WalletOrderRow } from '../blue_modules/realm/appDataRepository';
import type { TWallet } from '../class/wallets/types';

/** Maps secure wallet objects onto the live order stored in Realm. */
export function useOrderedWallets(wallets: TWallet[]): TWallet[] {
  const realm = useWalletDataRealm();
  const walletIds = useMemo(() => wallets.map(wallet => wallet.getID()), [wallets]);
  const walletIdsKey = walletIds.join('|');
  const rows = useWalletDataQuery<WalletOrderRow>({ type: 'WalletOrder', query: collection => queryWalletOrder(collection, walletIds) }, [
    walletIdsKey,
  ]);

  useEffect(() => syncWalletOrder(realm, walletIds), [realm, walletIds]);

  const walletById = new Map(wallets.map(wallet => [wallet.getID(), wallet]));
  const ordered: TWallet[] = [];
  const included = new Set<string>();
  for (const row of rows) {
    const wallet = walletById.get(row.walletId);
    if (!wallet) continue;
    ordered.push(wallet);
    included.add(row.walletId);
  }
  // New wallets render immediately and are appended to Realm by the effect.
  for (const wallet of wallets) {
    if (!included.has(wallet.getID())) ordered.push(wallet);
  }
  return ordered;
}

export function useSetWalletOrder() {
  const realm = useWalletDataRealm();
  return useCallback((walletIds: string[]) => setWalletOrder(realm, walletIds), [realm]);
}
