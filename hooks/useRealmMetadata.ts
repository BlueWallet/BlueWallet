import { useCallback } from 'react';

import { useWalletDataObject, useWalletDataQuery, useWalletDataRealm } from '../blue_modules/realm/WalletDataRealmProvider';
import {
  setCounterpartyMetadata as writeCounterpartyMetadata,
  setTransactionMemo as writeTransactionMemo,
  type CounterpartyMetadataRow,
  type TransactionMetadataRow,
} from '../blue_modules/realm/appDataRepository';
import type { TCounterpartyMetadata, TTXMetadata } from '../class/blue-app';

/** Returns a stable Realm-backed memo writer without subscribing to every metadata row. */
export function useSetTransactionMemo() {
  const realm = useWalletDataRealm();
  return useCallback(
    async (txid: string, memo: string) => {
      writeTransactionMemo(realm, txid, memo);
    },
    [realm],
  );
}

export function useTransactionMetadata() {
  const rows = useWalletDataQuery<TransactionMetadataRow>({ type: 'TransactionMetadata' });
  const metadata: TTXMetadata = {};
  for (const row of rows) metadata[row.txid] = row.memo === null ? {} : { memo: row.memo };
  return metadata;
}

export function useTransactionMemo(txid: string | undefined): string {
  const row = useWalletDataObject<TransactionMetadataRow>('TransactionMetadata', txid ?? '');
  return row?.memo ?? '';
}

export function useCounterpartyMetadata() {
  const rows = useWalletDataQuery<CounterpartyMetadataRow>({ type: 'CounterpartyMetadata' });
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
  const realm = useWalletDataRealm();
  return useCallback(
    async (counterparty: string, value: TCounterpartyMetadata[string]) => {
      writeCounterpartyMetadata(realm, counterparty, value);
    },
    [realm],
  );
}

export function useCounterpartyMetadataEntry(counterparty: string | undefined): TCounterpartyMetadata[string] | undefined {
  const row = useWalletDataObject<CounterpartyMetadataRow>('CounterpartyMetadata', counterparty ?? '');
  return row ? { label: row.label, ...(row.hidden ? { hidden: true } : {}) } : undefined;
}
