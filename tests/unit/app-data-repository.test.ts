import assert from 'assert';
import Realm from 'realm';

import {
  AppDataSchemas,
  activityRowToTransaction,
  findWalletTransactionByOutputAddress,
  isAppDataInitialized,
  isUtxoDataInitialized,
  pruneCanonicalWalletData,
  queryWalletActivity,
  queryWalletActivityByOutputAddress,
  queryWalletActivityForWallets,
  queryWalletOrder,
  queryWalletUtxos,
  readMetadata,
  replaceCanonicalData,
  replaceCanonicalWalletTransactions,
  replaceCanonicalWalletUtxos,
  setCounterpartyMetadata,
  setTransactionMemo,
  setWalletOutpointsFrozen,
  setWalletOrder,
  setWalletUtxoMetadata,
  scrubWalletUtxoSecrets,
  syncWalletOrder,
  utxoRowToUtxo,
  walletAddressHasActivity,
  type WalletActivityRow,
  utxoToCreateTransactionInput,
} from '../../blue_modules/realm/appDataRepository';
import type { TWallet } from '../../class/wallets/types';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import { BlueApp } from '../../class/blue-app';

const RealmMock = Realm as typeof Realm & {
  open: jest.Mock;
  deleteFile: jest.Mock;
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

it('stores and updates wallet order in Realm', async () => {
  const realm = await Realm.open({ path: 'wallet-order-test.realm', schema: AppDataSchemas });
  const first = wallet([], [], {}, 'wallet-1');
  const second = wallet([], [], {}, 'wallet-2');
  replaceCanonicalData(realm, [first, second], {}, {});

  setWalletOrder(realm, ['wallet-2', 'wallet-1']);
  assert.deepStrictEqual(
    Array.from(queryWalletOrder(realm, ['wallet-1', 'wallet-2']), row => row.walletId),
    ['wallet-2', 'wallet-1'],
  );

  syncWalletOrder(realm, ['wallet-2', 'wallet-3']);
  assert.deepStrictEqual(
    Array.from(queryWalletOrder(realm, ['wallet-2', 'wallet-3']), row => row.walletId),
    ['wallet-2', 'wallet-3'],
  );
});

it('shares one Realm open operation between concurrent consumers', async () => {
  RealmMock.open.mockClear();
  const storage = new BlueApp();

  const [first, second] = await Promise.all([storage.getRealmForTransactions(), storage.getRealmForTransactions()]);

  assert.strictEqual(first, second);
  assert.strictEqual(RealmMock.open.mock.calls.length, 1);
});

it('publishes the shared Realm when the active encryption bucket changes', async () => {
  const storage = new BlueApp();
  const published: Array<Realm | undefined> = [];
  const unsubscribe = storage.subscribeToAppDataRealm(realm => published.push(realm));

  const defaultRealm = await storage.getRealmForTransactions();
  storage.cachedPassword = 'encrypted-bucket';
  const encryptedRealm = await storage.getRealmForTransactions();
  unsubscribe();

  assert.deepStrictEqual(published, [undefined, defaultRealm, encryptedRealm]);
  storage.releaseAppDataRealm(defaultRealm);
  assert.strictEqual(defaultRealm.isClosed, true);
  assert.strictEqual(encryptedRealm.isClosed, false);
});

it('does not report encryption success while a known-key Realm file remains', async () => {
  const storage = new BlueApp();
  await storage.setItem('data', JSON.stringify({ wallets: [] }));
  const defaultRealm = await storage.getRealmForTransactions();
  replaceCanonicalData(defaultRealm, [wallet([{ txid: 'private-history', timestamp: 1 }])], {}, {});
  const defaultRealmPath = defaultRealm.path;
  RealmMock.deleteFile.mockImplementationOnce(() => {
    throw new Error('disk busy');
  });

  await assert.rejects(storage.encryptStorage('encrypted-bucket'), /Failed to clear and delete/);
  assert.strictEqual(Realm.exists({ path: defaultRealmPath }), true);
  assert.strictEqual(defaultRealm.objects('WalletActivity').length, 0, 'known-key Realm must be empty after deletion failure');
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
  assert.deepStrictEqual(
    Array.from(queryWalletActivity(realm, 'wallet-1', { limit: 1 }), row => row.transactionId),
    ['new-tx'],
  );
  assert.strictEqual(queryWalletActivity(realm, 'wallet-1', { pending: true }).slice(0, 1)[0].transactionId, 'new-tx');
  assert.strictEqual(queryWalletActivity(realm, 'wallet-1', { confirmed: true }).slice(0, 1)[0].transactionId, 'old-tx');

  setTransactionMemo(realm, 'old-tx', 'Updated note');
  setCounterpartyMetadata(realm, 'contact', { label: 'Bob' });
  assert.strictEqual(queryWalletActivity(realm, 'wallet-1', { search: 'updated note' }).length, 1);
  assert.strictEqual(readMetadata(realm).counterpartyMetadata.contact.label, 'Bob');

  replaceCanonicalWalletTransactions(realm, [testWallet], readMetadata(realm).txMetadata);
  replaceCanonicalWalletUtxos(realm, [testWallet]);
  assert.strictEqual(readMetadata(realm).txMetadata['old-tx'].memo, 'Updated note');
});

it('finds notification payments by output address through Realm', async () => {
  const realm = await Realm.open({ path: 'app-data-output-address-test.realm', schema: AppDataSchemas });
  const address = 'bc1qnotificationaddress';
  replaceCanonicalData(
    realm,
    [
      wallet([
        {
          txid: 'notification',
          timestamp: 2,
          outputs: [{ scriptPubKey: { addresses: [address] } }],
        },
        {
          txid: 'payload-false-positive',
          timestamp: 1,
          description: address,
          outputs: [],
        },
      ]),
    ],
    {},
    {},
  );

  assert.strictEqual(realm.objects<WalletActivityRow>('WalletActivity').slice(0, 1)[0].outputAddresses, `\n${address}\n`);
  assert.strictEqual(queryWalletActivityByOutputAddress(realm, 'wallet-1', address).length, 1);
  assert.strictEqual(findWalletTransactionByOutputAddress(realm, 'wallet-1', address)?.txid, 'notification');
  assert.strictEqual(findWalletTransactionByOutputAddress(realm, 'wallet-1', 'bc1qmissing'), undefined);
  assert.strictEqual(walletAddressHasActivity(realm, 'wallet-1', address), true);
  assert.strictEqual(walletAddressHasActivity(realm, 'wallet-1', 'bc1qunused'), false);
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

it('updates and prunes wallet rows without rebuilding unrelated Realm data', async () => {
  const realm = await Realm.open({
    path: 'app-data-scoped-writes-test.realm',
    schema: AppDataSchemas,
  });
  const first = wallet([{ txid: 'first', timestamp: 10 }], [{ txid: 'first-utxo', vout: 0, value: 1 }], {}, 'wallet-1');
  const second = wallet([{ txid: 'second', timestamp: 20 }], [{ txid: 'second-utxo', vout: 1, value: 2 }], {}, 'wallet-2');
  replaceCanonicalData(realm, [first, second], {}, {});

  const refreshedFirst = wallet([{ txid: 'refreshed', timestamp: 30 }], [], {}, 'wallet-1');
  replaceCanonicalWalletTransactions(realm, [refreshedFirst], {});
  replaceCanonicalWalletUtxos(realm, [refreshedFirst]);

  assert.strictEqual(queryWalletActivity(realm, 'wallet-1', { transactionId: 'first' }).length, 0);
  assert.strictEqual(queryWalletActivity(realm, 'wallet-1', { transactionId: 'refreshed' }).length, 1);
  assert.strictEqual(queryWalletActivity(realm, 'wallet-2', { transactionId: 'second' }).length, 1);
  assert.strictEqual(queryWalletUtxos(realm, 'wallet-2').length, 1);

  pruneCanonicalWalletData(realm, new Set(['wallet-1']));
  assert.strictEqual(queryWalletActivity(realm, 'wallet-2').length, 0);
  assert.strictEqual(queryWalletUtxos(realm, 'wallet-2').length, 0);
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
  replaceCanonicalWalletUtxos(realm, [testWallet]);
  const refreshed = Array.from(queryWalletUtxos(realm, 'wallet-1', { txid: 'large', vout: 1 }), utxoRowToUtxo);
  assert.strictEqual(refreshed[0].memo, 'Updated output', 'wallet refresh must preserve canonical Realm metadata');
  assert.strictEqual(refreshed[0].frozen, true, 'wallet refresh must not restore stale wallet metadata');
  setWalletOutpointsFrozen(realm, 'wallet-1', ['small:0'], false);
  assert.strictEqual(queryWalletUtxos(realm, 'wallet-1', { outpoints: ['small:0'] }).slice(0, 1)[0].frozen, false);
  assert.strictEqual(queryWalletUtxos(realm, 'wallet-1', { outpoints: ['large:1'] }).slice(0, 1)[0].frozen, true);
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
