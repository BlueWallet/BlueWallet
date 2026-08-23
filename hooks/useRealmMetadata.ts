import { useCallback, useEffect, useState } from 'react';
import type Realm from 'realm';

import {
  queryCounterpartyMetadata,
  queryTransactionMetadata,
  setCounterpartyMetadata as writeCounterpartyMetadata,
  setTransactionMemo as writeTransactionMemo,
  type CounterpartyMetadataRow,
  type TransactionMetadataRow,
} from '../blue_modules/realm/appDataRepository';
import { BlueApp as BlueAppClass, type TCounterpartyMetadata, type TTXMetadata } from '../class/blue-app';

const BlueApp = BlueAppClass.getInstance();

export function useTransactionMetadata() {
  const [metadata, setMetadata] = useState<TTXMetadata>({});
  const realmIdentity = BlueApp.getAppDataRealmIdentity();

  useEffect(() => {
    let active = true;
    let results: Realm.Results<TransactionMetadataRow> | undefined;
    let listener: Parameters<Realm.Results<TransactionMetadataRow>['addListener']>[0] | undefined;
    setMetadata({});

    BlueApp.getRealmForTransactions()
      .then(realm => {
        if (!active) return;
        results = queryTransactionMetadata(realm);
        listener = collection => {
          if (!active || realm.isClosed) return;
          const next: TTXMetadata = {};
          for (const row of collection) next[row.txid] = row.memo === null ? {} : { memo: row.memo };
          setMetadata(next);
        };
        results.addListener(listener);
      })
      .catch(error => console.warn('[useTransactionMetadata] Failed to open app data Realm:', error));

    return () => {
      active = false;
      if (results?.isValid() && listener) results.removeListener(listener);
    };
  }, [realmIdentity]);

  const setMemo = useCallback(async (txid: string, memo: string) => {
    const realm = await BlueApp.getRealmForTransactions();
    writeTransactionMemo(realm, txid, memo);
  }, []);

  return { metadata, setMemo };
}

export function useCounterpartyMetadata() {
  const [metadata, setMetadata] = useState<TCounterpartyMetadata>({});
  const realmIdentity = BlueApp.getAppDataRealmIdentity();

  useEffect(() => {
    let active = true;
    let results: Realm.Results<CounterpartyMetadataRow> | undefined;
    let listener: Parameters<Realm.Results<CounterpartyMetadataRow>['addListener']>[0] | undefined;
    setMetadata({});

    BlueApp.getRealmForTransactions()
      .then(realm => {
        if (!active) return;
        results = queryCounterpartyMetadata(realm);
        listener = collection => {
          if (!active || realm.isClosed) return;
          const next: TCounterpartyMetadata = {};
          for (const row of collection) {
            next[row.counterparty] = {
              label: row.label,
              ...(row.hidden ? { hidden: true } : {}),
            };
          }
          setMetadata(next);
        };
        results.addListener(listener);
      })
      .catch(error => console.warn('[useCounterpartyMetadata] Failed to open app data Realm:', error));

    return () => {
      active = false;
      if (results?.isValid() && listener) results.removeListener(listener);
    };
  }, [realmIdentity]);

  const setCounterparty = useCallback(async (counterparty: string, value: TCounterpartyMetadata[string]) => {
    const realm = await BlueApp.getRealmForTransactions();
    writeCounterpartyMetadata(realm, counterparty, value);
  }, []);

  return { metadata, setCounterparty };
}
