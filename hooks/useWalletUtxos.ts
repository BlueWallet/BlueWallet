import { useCallback } from 'react';

import { useAppDataQuery, useAppDataRealm } from '../blue_modules/realm/AppDataRealmProvider';
import {
  filterWalletUtxos,
  queryWalletUtxos,
  setWalletOutpointsFrozen,
  setWalletUtxoMetadata,
  type RealmUtxo,
  type WalletUtxoRow,
  utxoRowToUtxo,
} from '../blue_modules/realm/appDataRepository';
import { BlueApp as BlueAppClass } from '../class/blue-app';

const BlueApp = BlueAppClass.getInstance();
type WalletUtxoQuery = {
  sortType?: 'height' | 'label' | 'value' | 'frozen';
  sortDirection?: 'asc' | 'desc';
  frozen?: boolean;
  txid?: string;
  vout?: number;
  outpoints?: string[];
};

export default function useWalletUtxos(walletId: string, query: WalletUtxoQuery = {}): RealmUtxo[] {
  const { sortType = 'height', sortDirection = 'asc', frozen, txid, vout, outpoints } = query;
  const outpointsKey = outpoints?.join('|') ?? '';
  const rows = useAppDataQuery<WalletUtxoRow>(
    {
      type: 'WalletUtxo',
      query: collection => filterWalletUtxos(collection, walletId, { sortType, sortDirection, frozen, txid, vout, outpoints }),
    },
    [frozen, outpointsKey, sortDirection, sortType, txid, vout, walletId],
  );

  const utxos: RealmUtxo[] = [];
  for (const row of rows) {
    try {
      utxos.push(utxoRowToUtxo(row));
    } catch (error) {
      console.warn('[useWalletUtxos] Ignoring invalid UTXO row:', error);
    }
  }
  return utxos;
}

export const useWalletUtxo = (walletId: string, txid: string, vout: number): RealmUtxo | undefined =>
  useWalletUtxos(walletId, { txid, vout })[0];

export const useWalletUtxoSelection = (walletId: string, outpoints: string[]) => {
  const outpointsKey = outpoints.join('|');
  const rows = useAppDataQuery<WalletUtxoRow>(
    { type: 'WalletUtxo', query: collection => filterWalletUtxos(collection, walletId, { outpoints }) },
    [outpointsKey, walletId],
  );
  const unfrozenRows = useAppDataQuery<WalletUtxoRow>(
    { type: 'WalletUtxo', query: collection => filterWalletUtxos(collection, walletId, { outpoints, frozen: false }) },
    [outpointsKey, walletId],
  );
  const utxos: RealmUtxo[] = [];
  for (const row of rows) utxos.push(utxoRowToUtxo(row));
  return {
    utxos,
    totalValue: rows.sum('value'),
    allFrozen: rows.length > 0 && unfrozenRows.length === 0,
  };
};

/** Writes canonical UTXO metadata in Realm and mirrors it into the wallet engine until wallet internals are Realm-native. */
export const useWalletUtxoMutations = (walletId: string) => {
  const realm = useAppDataRealm();
  const setMetadata = useCallback(
    async (txid: string, vout: number, metadata: { memo?: string; frozen?: boolean }) => {
      setWalletUtxoMetadata(realm, walletId, txid, vout, metadata);
      BlueApp.getWallets()
        .find(wallet => wallet.getID() === walletId)
        ?.setUTXOMetadata(txid, vout, metadata);
    },
    [realm, walletId],
  );

  const setOutpointsFrozen = useCallback(
    async (outpoints: string[], frozen: boolean) => {
      setWalletOutpointsFrozen(realm, walletId, outpoints, frozen);
      const wallet = BlueApp.getWallets().find(candidate => candidate.getID() === walletId);
      for (const row of queryWalletUtxos(realm, walletId, { outpoints })) {
        wallet?.setUTXOMetadata(row.txid, row.vout, { frozen: row.frozen });
      }
    },
    [realm, walletId],
  );

  return { setMetadata, setOutpointsFrozen };
};
