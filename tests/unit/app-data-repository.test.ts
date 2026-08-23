import assert from 'assert';
import Realm from 'realm';

import {
  AppDataSchemas,
  activityRowToTransaction,
  isAppDataInitialized,
  isUtxoDataInitialized,
  queryWalletActivity,
  queryWalletActivityForWallets,
  queryWalletUtxos,
  readMetadata,
  replaceCanonicalData,
  replaceCanonicalWalletData,
  setCounterpartyMetadata,
  setTransactionMemo,
  setWalletUtxoMetadata,
  scrubWalletUtxoSecrets,
  utxoRowToUtxo,
  type WalletActivityRow,
  utxoToCreateTransactionInput,
} from '../../blue_modules/realm/appDataRepository';
import type { TWallet } from '../../class/wallets/types';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import { BlueApp } from '../../class/blue-app';

const RealmMock = Realm as typeof Realm & {
  open: jest.Mock;
  __mockRealmHelpers: { reset: () => void };
};

const wallet = (
  transactions: Array<Record<string, unknown>>,
  utxos: Array<Record<string, unknown>> = [],
  utxoMetadata: Record<string, { memo?: string; frozen?: boolean }> = {},
  walletId = 'wallet-1',
): TWallet =>
  ({
    type: 'testWallet',
    _txs_by_external_index: { 0: transactions },
    _txs_by_internal_index: {},
    getID: () => walletId,
    getTransactions: () => transactions,
    getUtxo: () => utxos,
    getUTXOMetadata: (txid: string, vout: number) => utxoMetadata[`${txid}:${vout}`] ?? {},
    getPreferredBalanceUnit: () => BitcoinUnit.SATS,
  }) as unknown as TWallet;

beforeEach(() => RealmMock.__mockRealmHelpers.reset());

it('shares one Realm open operation between concurrent consumers', async () => {
  RealmMock.open.mockClear();
  const storage = new BlueApp();

  const [first, second] = await Promise.all([storage.getRealmForTransactions(), storage.getRealmForTransactions()]);

  assert.strictEqual(first, second);
  assert.strictEqual(RealmMock.open.mock.calls.length, 1);
});

it('stores transactions and metadata as canonical Realm data', async () => {
  const realm = await Realm.open({
    path: 'app-data-test.realm',
    schema: AppDataSchemas,
  });
  const testWallet = wallet([
    {
      txid: 'new-tx',
      hash: 'new-tx',
      timestamp: 20,
      value: -25,
      confirmations: 0,
    },
    {
      txid: 'old-tx',
      hash: 'old-tx',
      timestamp: 10,
      value: 50,
      confirmations: 2,
    },
  ]);

  replaceCanonicalData(realm, [testWallet], { 'new-tx': { memo: 'Coffee beans' } }, { contact: { label: 'Alice', hidden: true } });

  assert.strictEqual(isAppDataInitialized(realm), true);
  const metadata = readMetadata(realm);
  assert.strictEqual(metadata.txMetadata['new-tx'].memo, 'Coffee beans');
  assert.deepStrictEqual(metadata.counterpartyMetadata.contact, {
    label: 'Alice',
    hidden: true,
  });

  const page = queryWalletActivity(realm, 'wallet-1').slice(0, 1);
  assert.strictEqual(page.length, 1);
  assert.strictEqual(activityRowToTransaction(page[0]).txid, 'new-tx');

  const search = queryWalletActivity(realm, 'wallet-1', { search: 'coffee' });
  assert.strictEqual(search.length, 1);
  assert.strictEqual(search.slice(0, 1)[0].transactionId, 'new-tx');
  assert.strictEqual(queryWalletActivity(realm, 'wallet-1', { transactionId: 'old-tx' }).length, 1);
  assert.strictEqual(queryWalletActivity(realm, 'wallet-1', { pending: true }).slice(0, 1)[0].transactionId, 'new-tx');
  assert.strictEqual(queryWalletActivity(realm, 'wallet-1', { confirmed: true }).slice(0, 1)[0].transactionId, 'old-tx');

  setTransactionMemo(realm, 'old-tx', 'Updated note');
  setCounterpartyMetadata(realm, 'contact', { label: 'Bob' });
  assert.strictEqual(queryWalletActivity(realm, 'wallet-1', { search: 'updated note' }).length, 1);
  assert.strictEqual(readMetadata(realm).counterpartyMetadata.contact.label, 'Bob');

  replaceCanonicalWalletData(realm, [testWallet], readMetadata(realm).txMetadata);
  assert.strictEqual(readMetadata(realm).txMetadata['old-tx'].memo, 'Updated note');
});

it('maps optional Realm strings to undefined application metadata', async () => {
  const realm = await Realm.open({
    path: 'app-data-null-metadata-test.realm',
    schema: AppDataSchemas,
  });
  replaceCanonicalData(realm, [wallet([])], { unlabeled: {} }, {});

  const metadata = readMetadata(realm);
  assert.deepStrictEqual(metadata.txMetadata.unlabeled, {});
  assert.strictEqual(metadata.txMetadata.unlabeled.memo, undefined);
});

it('queries and limits a globally sorted Realm activity feed', async () => {
  const realm = await Realm.open({
    path: 'app-data-feed-test.realm',
    schema: AppDataSchemas,
  });
  replaceCanonicalData(
    realm,
    [
      wallet([{ txid: 'older', hash: 'older', timestamp: 10 }], [], {}, 'wallet-1'),
      wallet([{ txid: 'newer', hash: 'newer', timestamp: 20 }], [], {}, 'wallet-2'),
      wallet(
        [
          {
            txid: 'hidden-from-query',
            hash: 'hidden-from-query',
            timestamp: 30,
          },
        ],
        [],
        {},
        'wallet-3',
      ),
    ],
    {},
    {},
  );

  const page = queryWalletActivityForWallets(realm, ['wallet-1', 'wallet-2']).slice(0, 1);
  assert.strictEqual(page.length, 1);
  assert.strictEqual(page[0].walletId, 'wallet-2');
  assert.strictEqual(page[0].transactionId, 'newer');
});

it('stores and queries UTXOs with their canonical metadata', async () => {
  const realm = await Realm.open({
    path: 'app-data-utxo-test.realm',
    schema: AppDataSchemas,
  });
  const testWallet = wallet(
    [],
    [
      { txid: 'small', vout: 0, height: 20, value: 10, address: 'bc1-small', wif: 'L1-private-key-must-not-persist' },
      { txid: 'large', vout: 1, height: 10, value: 50, address: 'bc1-large' },
    ],
    {
      'small:0': { memo: 'Savings', frozen: true },
      'large:1': { memo: 'Spend', frozen: false },
    },
  );

  replaceCanonicalData(realm, [testWallet], {}, {});

  assert.strictEqual(isUtxoDataInitialized(realm), true);
  const rawSmallPayload = JSON.parse(
    realm.objects<{ txid: string; payloadJson: string }>('WalletUtxo').filtered('txid == $0', 'small').slice(0, 1)[0].payloadJson,
  );
  assert.strictEqual(Object.prototype.hasOwnProperty.call(rawSmallPayload, 'wif'), false);
  const rows = Array.from(
    queryWalletUtxos(realm, 'wallet-1', {
      sortType: 'value',
      sortDirection: 'desc',
    }),
    utxoRowToUtxo,
  );
  assert.deepStrictEqual(
    rows.map(output => [output.txid, output.memo, output.frozen]),
    [
      ['large', 'Spend', false],
      ['small', 'Savings', true],
    ],
  );
  assert.deepStrictEqual(
    Array.from(queryWalletUtxos(realm, 'wallet-1', { frozen: false }), utxoRowToUtxo).map(output => output.txid),
    ['large'],
  );
  assert.deepStrictEqual(
    Array.from(queryWalletUtxos(realm, 'wallet-1', { outpoints: ['small:0'] }), utxoRowToUtxo).map(output => output.txid),
    ['small'],
  );
  setWalletUtxoMetadata(realm, 'wallet-1', 'large', 1, { memo: 'Updated output', frozen: true });
  const updated = Array.from(queryWalletUtxos(realm, 'wallet-1', { txid: 'large', vout: 1 }), utxoRowToUtxo);
  assert.strictEqual(updated[0].memo, 'Updated output');
  assert.strictEqual(updated[0].frozen, true);
});

it('scrubs WIFs from UTXO rows created by older app-data schemas', async () => {
  const realm = await Realm.open({ path: 'app-data-utxo-scrub-test.realm', schema: AppDataSchemas });
  realm.write(() => {
    realm.create('WalletUtxo', {
      walletId: 'wallet-1',
      txid: 'legacy-secret',
      vout: 0,
      outpoint: 'legacy-secret:0',
      height: 1,
      value: 100,
      memo: '',
      frozen: false,
      payloadJson: JSON.stringify({
        txid: 'legacy-secret',
        vout: 0,
        height: 1,
        value: 100,
        address: 'bc1-legacy',
        wif: 'Kx-legacy-private-key',
      }),
    });
  });

  scrubWalletUtxoSecrets(realm);
  const row = realm.objects<{ payloadJson: string }>('WalletUtxo').slice(0, 1)[0];
  assert.strictEqual(Object.prototype.hasOwnProperty.call(JSON.parse(row.payloadJson), 'wif'), false);

  const signingInput = utxoToCreateTransactionInput({ txid: 'legacy-secret', vout: 0, height: 1, value: 100, address: 'bc1-legacy' }, {
    _getWifForAddress: () => 'Kx-derived-only-while-signing',
  } as unknown as TWallet);
  assert.strictEqual(signingInput.wif, 'Kx-derived-only-while-signing');
});

it('atomically replaces stale transaction and metadata rows', async () => {
  const realm = await Realm.open({
    path: 'app-data-replace-test.realm',
    schema: AppDataSchemas,
  });
  replaceCanonicalData(realm, [wallet([{ txid: 'stale', hash: 'stale', timestamp: 1 }])], { stale: { memo: 'old' } }, {});
  replaceCanonicalData(realm, [wallet([{ txid: 'current', hash: 'current', timestamp: 2 }])], { current: { memo: 'new' } }, {});

  const activity = realm.objects<WalletActivityRow>('WalletActivity');
  assert.strictEqual(activity.length, 1);
  assert.strictEqual(activity.slice(0, 1)[0].transactionId, 'current');
  assert.strictEqual(readMetadata(realm).txMetadata.stale, undefined);
});
