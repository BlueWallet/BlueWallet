import { useCallback } from 'react';

import { useAppDataObject, useAppDataQuery, useAppDataRealm } from '../blue_modules/realm/AppDataRealmProvider';
import {
  setCounterpartyMetadata as writeCounterpartyMetadata,
  setTransactionMemo as writeTransactionMemo,
  type CounterpartyMetadataRow,
  type TransactionMetadataRow,
} from '../blue_modules/realm/appDataRepository';
import type { TCounterpartyMetadata, TTXMetadata } from '../class/blue-app';

/** Returns a stable Realm-backed memo writer without subscribing to every metadata row. */
export function useSetTransactionMemo() {
  const realm = useAppDataRealm();
  return useCallback(
    async (txid: string, memo: string) => {
      writeTransactionMemo(realm, txid, memo);
    },
    [realm],
  );
}

export function useTransactionMetadata() {
  const rows = useAppDataQuery<TransactionMetadataRow>({ type: 'TransactionMetadata' });
  const metadata: TTXMetadata = {};
  for (const row of rows) metadata[row.txid] = row.memo === null ? {} : { memo: row.memo };
  return metadata;
}

export function useTransactionMemo(txid: string | undefined): string {
  const row = useAppDataObject<TransactionMetadataRow>('TransactionMetadata', txid ?? '');
  return row?.memo ?? '';
}

export function useCounterpartyMetadata() {
  const rows = useAppDataQuery<CounterpartyMetadataRow>({ type: 'CounterpartyMetadata' });
  const metadata: TCounterpartyMetadata = {};
  for (const row of rows) {
    metadata[row.counterparty] = {
      label: row.label,
      ...(row.hidden ? { hidden: true } : {}),
    };
  }

  return metadata;
}

export function useSetCounterpartyMetadata() {
  const realm = useAppDataRealm();
  return useCallback(
    async (counterparty: string, value: TCounterpartyMetadata[string]) => {
      writeCounterpartyMetadata(realm, counterparty, value);
    },
    [realm],
  );
}

export function useCounterpartyMetadataEntry(counterparty: string | undefined): TCounterpartyMetadata[string] | undefined {
  const row = useAppDataObject<CounterpartyMetadataRow>('CounterpartyMetadata', counterparty ?? '');
  return row ? { label: row.label, ...(row.hidden ? { hidden: true } : {}) } : undefined;
}
