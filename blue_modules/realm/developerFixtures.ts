import Realm from 'realm';

import type { Transaction } from '../../class/wallets/types';

export type DeveloperTransactionState = 'pending' | 'confirmed';

export const REALM_DEVELOPER_TRANSACTION_MARKER = '__realm_developer_transaction__';

type DeveloperTransaction = Transaction & {
  category: 'receive';
  isRealmDeveloperFixture: true;
  memo: string;
};

const createTransactionId = (walletId: string, state: DeveloperTransactionState): string => {
  const unique = `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}${walletId}${state}`;
  return unique
    .replace(/[^a-f\d]/gi, '0')
    .padEnd(64, '0')
    .slice(0, 64)
    .toLowerCase();
};

export function insertDeveloperIncomingTransaction(
  realm: Realm,
  walletId: string,
  state: DeveloperTransactionState,
  outputAddress = '1BitcoinEaterAddressDontSendf59kuE',
): string {
  const transactionId = createTransactionId(walletId, state);
  const timestamp = Math.floor(Date.now() / 1000);
  const confirmations = state === 'pending' ? 0 : 6;
  const value = state === 'pending' ? 25_000 : 75_000;
  const memo = state === 'pending' ? '[Developer] Incoming pending transaction' : '[Developer] Incoming confirmed transaction';
  const transaction: DeveloperTransaction = {
    txid: transactionId,
    hash: transactionId,
    version: 2,
    size: 141,
    vsize: 110,
    weight: 440,
    locktime: 0,
    inputs: [],
    outputs: [
      {
        value: value / 100_000_000,
        n: 0,
        scriptPubKey: {
          asm: '',
          hex: '',
          reqSigs: 1,
          type: 'witness_v0_keyhash',
          addresses: [outputAddress],
        },
      },
    ],
    confirmations,
    timestamp,
    time: timestamp,
    value,
    category: 'receive',
    isRealmDeveloperFixture: true,
    memo,
  };

  realm.write(() => {
    realm.create('WalletActivity', {
      walletId,
      transactionId,
      paymentRequest: '',
      outputAddresses: `\n${outputAddress}\n`,
      timestamp,
      confirmations,
      pending: state === 'pending',
      searchText: `${REALM_DEVELOPER_TRANSACTION_MARKER}\n${state}\n${memo}\n${transactionId}\n${outputAddress}`.toLowerCase(),
      payloadJson: JSON.stringify(transaction),
    });
    realm.create('TransactionMetadata', { txid: transactionId, memo }, Realm.UpdateMode.Modified);
  });

  return transactionId;
}

export function removeDeveloperTransactions(realm: Realm): number {
  const rows = realm
    .objects<{ transactionId: string }>('WalletActivity')
    .filtered('searchText CONTAINS $0', REALM_DEVELOPER_TRANSACTION_MARKER);
  const transactionIds = Array.from(rows, row => row.transactionId);

  realm.write(() => {
    realm.delete(rows);
    for (const transactionId of transactionIds) {
      const metadata = realm.objectForPrimaryKey('TransactionMetadata', transactionId);
      if (metadata) realm.delete(metadata);
    }
  });

  return transactionIds.length;
}
