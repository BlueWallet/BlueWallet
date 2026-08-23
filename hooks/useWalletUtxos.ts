import { useCallback, useEffect, useState } from 'react';
import type Realm from 'realm';

import {
  queryWalletUtxos,
  setWalletFrozenOutpoints,
  setWalletUtxoMetadata,
  type RealmUtxo,
  type WalletUtxoRow,
  utxoRowToUtxo,
} from '../blue_modules/realm/appDataRepository';
import { BlueApp as BlueAppClass } from '../class/blue-app';

const BlueApp = BlueAppClass.getInstance();
type UtxoListener = Parameters<Realm.Results<WalletUtxoRow>['addListener']>[0];
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
  const outpointsKey = outpoints?.join('|');
  const [utxos, setUtxos] = useState<RealmUtxo[]>([]);
  const realmIdentity = BlueApp.getAppDataRealmIdentity();

  useEffect(() => {
    let active = true;
    let results: Realm.Results<WalletUtxoRow> | undefined;
    let listener: UtxoListener | undefined;
    setUtxos([]);

    BlueApp.getRealmForTransactions()
      .then(realm => {
        if (!active) return;
        results = queryWalletUtxos(realm, walletId, {
          sortType,
          sortDirection,
          frozen,
          txid,
          vout,
          outpoints,
        });

        listener = collection => {
          if (!active || realm.isClosed) return;
          setUtxos(
            collection.flatMap(row => {
              try {
                return [utxoRowToUtxo(row)];
              } catch (error) {
                console.warn('[useWalletUtxos] Ignoring invalid UTXO row:', error);
                return [];
              }
            }),
          );
        };
        results.addListener(listener);
      })
      .catch(error => console.warn('[useWalletUtxos] Failed to open app data Realm:', error));

    return () => {
      active = false;
      if (results?.isValid() && listener) results.removeListener(listener);
    };
    // outpointsKey captures the value query without depending on caller array identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frozen, outpointsKey, realmIdentity, sortDirection, sortType, txid, vout, walletId]);

  return utxos;
}

export const useWalletUtxo = (walletId: string, txid: string, vout: number): RealmUtxo | undefined =>
  useWalletUtxos(walletId, { txid, vout })[0];

/** Writes canonical UTXO metadata in Realm and mirrors it into the wallet engine until wallet internals are Realm-native. */
export const useWalletUtxoMutations = (walletId: string) => {
  const setMetadata = useCallback(
    async (txid: string, vout: number, metadata: { memo?: string; frozen?: boolean }) => {
      const realm = await BlueApp.getRealmForTransactions();
      setWalletUtxoMetadata(realm, walletId, txid, vout, metadata);
      BlueApp.getWallets()
        .find(wallet => wallet.getID() === walletId)
        ?.setUTXOMetadata(txid, vout, metadata);
    },
    [walletId],
  );

  const setFrozenOutpoints = useCallback(
    async (outpoints: string[]) => {
      const frozen = new Set(outpoints);
      const realm = await BlueApp.getRealmForTransactions();
      setWalletFrozenOutpoints(realm, walletId, frozen);
      const wallet = BlueApp.getWallets().find(candidate => candidate.getID() === walletId);
      for (const row of queryWalletUtxos(realm, walletId)) {
        wallet?.setUTXOMetadata(row.txid, row.vout, { frozen: row.frozen });
      }
    },
    [walletId],
  );

  return { setMetadata, setFrozenOutpoints };
};
