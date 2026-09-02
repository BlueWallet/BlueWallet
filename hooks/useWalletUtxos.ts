import { useCallback, useMemo } from 'react';

import { useWalletDataQuery, useWalletDataRealm } from '../blue_modules/realm/WalletDataRealmProvider';
import {
  queryWalletUtxos,
  setWalletOutpointsFrozen,
  setWalletUtxoMetadata,
  type RealmUtxo,
  type WalletUtxoRow,
  utxoRowToUtxo,
} from '../blue_modules/realm/appDataRepository';
export type WalletUtxoQuery = {
  sortType?: 'ordinal' | 'height' | 'label' | 'value' | 'frozen';
  sortDirection?: 'asc' | 'desc';
  frozen?: boolean;
  txid?: string;
  vout?: number;
  outpoints?: string[];
};

const useWalletUtxoRows = (walletId: string, query: WalletUtxoQuery = {}) => {
  const { sortType = 'height', sortDirection = 'asc', frozen, txid, vout, outpoints } = query;
  const outpointsKey = outpoints?.join('|') ?? '';
  return useWalletDataQuery<WalletUtxoRow>(
    {
      type: 'WalletUtxo',
      query: collection => queryWalletUtxos(collection, walletId, { sortType, sortDirection, frozen, txid, vout, outpoints }),
    },
    [frozen, outpointsKey, sortDirection, sortType, txid, vout, walletId],
  );
};

const rowsToUtxos = (rows: Iterable<WalletUtxoRow>): RealmUtxo[] => {
  const utxos: RealmUtxo[] = [];
  for (const row of rows) {
    try {
      utxos.push(utxoRowToUtxo(row));
    } catch (error) {
      console.warn('[useWalletUtxos] Ignoring invalid UTXO row:', error);
    }
  }
  return utxos;
};

export const useWalletUtxoQuery = (walletId: string, query: WalletUtxoQuery = {}) => {
  const rows = useWalletUtxoRows(walletId, query);
  return useMemo(() => ({ utxos: rowsToUtxos(rows), totalValue: rows.sum('value'), count: rows.length }), [rows]);
};

export default function useWalletUtxos(walletId: string, query: WalletUtxoQuery = {}): RealmUtxo[] {
  return useWalletUtxoQuery(walletId, query).utxos;
}

export const useWalletUtxo = (walletId: string, txid: string, vout: number): RealmUtxo | undefined =>
  useWalletUtxos(walletId, { txid, vout })[0];

/** Reads the current Realm snapshot inside an async action without exposing Realm to the component. */
export const useGetWalletUtxos = (walletId: string) => {
  const realm = useWalletDataRealm();
  return useCallback((query: WalletUtxoQuery = {}) => rowsToUtxos(queryWalletUtxos(realm, walletId, query)), [realm, walletId]);
};

export const useWalletUtxoSelection = (walletId: string, outpoints: string[]) => {
  const selection = useWalletUtxoQuery(walletId, { outpoints, sortType: 'ordinal' });
  const unfrozen = useWalletUtxoQuery(walletId, { outpoints, frozen: false, sortType: 'ordinal' });
  return {
    ...selection,
    allFrozen: selection.count > 0 && unfrozen.count === 0,
  };
};

/** Writes canonical UTXO metadata directly to Realm, its sole source of truth. */
export const useWalletUtxoMutations = (walletId: string) => {
  const realm = useWalletDataRealm();
  const setMetadata = useCallback(
    async (txid: string, vout: number, metadata: { memo?: string; frozen?: boolean }) => {
      setWalletUtxoMetadata(realm, walletId, txid, vout, metadata);
    },
    [realm, walletId],
  );

  const setOutpointsFrozen = useCallback(
    async (outpoints: string[], frozen: boolean) => {
      setWalletOutpointsFrozen(realm, walletId, outpoints, frozen);
    },
    [realm, walletId],
  );

  return { setMetadata, setOutpointsFrozen };
};
