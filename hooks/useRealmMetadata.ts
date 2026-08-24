import { useCallback } from 'react';

import { useAppDataObject, useAppDataQuery, useAppDataRealm } from '../blue_modules/realm/AppDataRealmProvider';
import {
  setCounterpartyMetadata as writeCounterpartyMetadata,
  setTransactionMemo as writeTransactionMemo,
  type CounterpartyMetadataRow,
  type TransactionMetadataRow,
} from '../blue_modules/realm/appDataRepository';
import type { TCounterpartyMetadata, TTXMetadata } from '../class/blue-app';

export function useTransactionMetadata() {
  const realm = useAppDataRealm();
  const rows = useAppDataQuery<TransactionMetadataRow>({ type: 'TransactionMetadata' });
  const metadata: TTXMetadata = {};
  for (const row of rows) metadata[row.txid] = row.memo === null ? {} : { memo: row.memo };

  const setMemo = useCallback(
    async (txid: string, memo: string) => {
      writeTransactionMemo(realm, txid, memo);
    },
    [realm],
  );

  return { metadata, setMemo };
}

export function useTransactionMemo(txid: string | undefined): string {
  const row = useAppDataObject<TransactionMetadataRow>('TransactionMetadata', txid ?? '');
  return row?.memo ?? '';
}

export function useCounterpartyMetadata() {
  const realm = useAppDataRealm();
  const rows = useAppDataQuery<CounterpartyMetadataRow>({ type: 'CounterpartyMetadata' });
  const metadata: TCounterpartyMetadata = {};
  for (const row of rows) {
    metadata[row.counterparty] = {
      label: row.label,
      ...(row.hidden ? { hidden: true } : {}),
    };
  }

  const setCounterparty = useCallback(
    async (counterparty: string, value: TCounterpartyMetadata[string]) => {
      writeCounterpartyMetadata(realm, counterparty, value);
    },
    [realm],
  );

  return { metadata, setCounterparty };
}

export function useCounterpartyMetadataEntry(counterparty: string | undefined): TCounterpartyMetadata[string] | undefined {
  const row = useAppDataObject<CounterpartyMetadataRow>('CounterpartyMetadata', counterparty ?? '');
  return row ? { label: row.label, ...(row.hidden ? { hidden: true } : {}) } : undefined;
}
