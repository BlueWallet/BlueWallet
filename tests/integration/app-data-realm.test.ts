import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Realm from 'realm';

import {
  APP_DATA_SCHEMA_VERSION,
  AppDataSchemas,
  findWalletTransactionByOutputAddress,
  queryWalletActivity,
  queryWalletOrder,
  queryWalletUtxos,
  readMetadata,
  replaceCanonicalData,
  setWalletOutpointsFrozen,
  setWalletOrder,
  utxoRowToUtxo,
  walletAddressHasActivity,
} from '../../blue_modules/realm/appDataRepository';
import type { TWallet } from '../../class/wallets/types';
import { insertDeveloperIncomingTransaction, removeDeveloperTransactions } from '../../blue_modules/realm/developerFixtures';

jest.unmock('realm');

describe('canonical app-data Realm', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bluewallet-app-data-'));
  const realmPath = path.join(directory, 'canonical.realm');
  const encryptionKey = new Uint8Array(64).fill(7);

  afterAll(() => {
    if (Realm.exists({ path: realmPath })) Realm.deleteFile({ path: realmPath });
    fs.rmSync(directory, { recursive: true, force: true });
    Realm.shutdown();
  });

  it('persists encrypted rows and executes native Realm filtering and sorting', async () => {
    const wallet = {
      type: 'integration-wallet',
      _txs_by_external_index: {},
      _txs_by_internal_index: {},
      getID: () => 'wallet-1',
      getTransactions: () => [
        { txid: 'older', hash: 'older', timestamp: 10, confirmations: 2 },
        {
          txid: 'newer',
          hash: 'newer',
          timestamp: 20,
          confirmations: 0,
          outputs: [{ scriptPubKey: { addresses: ['bc1qnotification'] } }],
        },
      ],
      getUtxo: () => [{ txid: 'utxo', vout: 0, height: 1, value: 42, address: 'bc1-public', wif: 'private-wif' }],
      getUTXOMetadata: () => ({ memo: 'Cold storage', frozen: true }),
    } as unknown as TWallet;

    let realm = await Realm.open({ path: realmPath, schema: AppDataSchemas, schemaVersion: APP_DATA_SCHEMA_VERSION, encryptionKey });
    replaceCanonicalData(realm, [wallet], { newer: { memo: 'Coffee' } }, { alice: { label: 'Alice' } });
    realm.close();

    realm = await Realm.open({ path: realmPath, schema: AppDataSchemas, schemaVersion: APP_DATA_SCHEMA_VERSION, encryptionKey });
    assert.deepStrictEqual(
      Array.from(queryWalletActivity(realm, 'wallet-1', { search: 'coffee' }), row => row.transactionId),
      ['newer'],
    );
    assert.deepStrictEqual(
      Array.from(queryWalletActivity(realm, 'wallet-1'), row => row.transactionId),
      ['newer', 'older'],
    );
    assert.deepStrictEqual(
      Array.from(queryWalletActivity(realm, 'wallet-1', { limit: 1 }), row => row.transactionId),
      ['newer'],
      'Realm applies pagination before rows reach JavaScript',
    );
    assert.strictEqual(findWalletTransactionByOutputAddress(realm, 'wallet-1', 'bc1qnotification')?.txid, 'newer');
    assert.strictEqual(walletAddressHasActivity(realm, 'wallet-1', 'bc1qnotification'), true);
    assert.strictEqual(walletAddressHasActivity(realm, 'wallet-1', 'bc1qunused'), false);
    const utxo = utxoRowToUtxo(queryWalletUtxos(realm, 'wallet-1', { frozen: true })[0]);
    assert.strictEqual(utxo.memo, 'Cold storage');
    assert.strictEqual(Object.prototype.hasOwnProperty.call(utxo, 'wif'), false);
    setWalletOutpointsFrozen(realm, 'wallet-1', ['utxo:0'], false);
    assert.strictEqual(queryWalletUtxos(realm, 'wallet-1', { frozen: false }).sum('value'), 42);
    assert.strictEqual(readMetadata(realm).counterpartyMetadata.alice.label, 'Alice');
    setWalletOrder(realm, ['wallet-1']);
    assert.strictEqual(queryWalletOrder(realm, ['wallet-1'])[0].walletId, 'wallet-1');

    const pendingFixture = insertDeveloperIncomingTransaction(realm, 'wallet-1', 'pending');
    const confirmedFixture = insertDeveloperIncomingTransaction(realm, 'wallet-1', 'confirmed');
    assert.strictEqual(queryWalletActivity(realm, 'wallet-1', { transactionId: pendingFixture })[0].pending, true);
    assert.strictEqual(queryWalletActivity(realm, 'wallet-1', { transactionId: confirmedFixture })[0].confirmations, 6);
    assert.strictEqual(removeDeveloperTransactions(realm), 2);
    realm.close();

    await assert.rejects(
      Realm.open({
        path: realmPath,
        schema: AppDataSchemas,
        schemaVersion: APP_DATA_SCHEMA_VERSION,
        encryptionKey: new Uint8Array(64).fill(8),
      }),
    );
  });

  it('migrates legacy address-index rows without retaining duplicate transaction JSON', async () => {
    const migrationPath = path.join(directory, 'canonical-v9.realm');
    const legacySchemas = AppDataSchemas.map(schema =>
      schema.name === 'WalletTransaction' ? { ...schema, properties: { ...schema.properties, payloadJson: 'string' } } : schema,
    );
    let realm = await Realm.open({ path: migrationPath, schema: legacySchemas, schemaVersion: 9, encryptionKey });
    realm.write(() => {
      realm.create('WalletTransaction', {
        walletId: 'wallet-1',
        collection: 'external',
        index: 0,
        ordinal: 0,
        payloadJson: JSON.stringify({ txid: 'duplicated' }),
      });
    });
    realm.close();

    realm = await Realm.open({ path: migrationPath, schema: AppDataSchemas, schemaVersion: APP_DATA_SCHEMA_VERSION, encryptionKey });
    const row = realm.objects<Record<string, unknown>>('WalletTransaction')[0];
    assert.strictEqual(row.walletId, 'wallet-1');
    assert.strictEqual('payloadJson' in row, false);
    realm.close();
    Realm.deleteFile({ path: migrationPath });
  });
});
