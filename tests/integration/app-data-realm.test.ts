import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Realm from 'realm';

import {
  APP_DATA_SCHEMA_VERSION,
  AppDataSchemas,
  queryWalletActivity,
  queryWalletUtxos,
  readMetadata,
  replaceCanonicalData,
  setWalletOutpointsFrozen,
  utxoRowToUtxo,
} from '../../blue_modules/realm/appDataRepository';
import type { TWallet } from '../../class/wallets/types';

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
        { txid: 'newer', hash: 'newer', timestamp: 20, confirmations: 0 },
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
    const utxo = utxoRowToUtxo(queryWalletUtxos(realm, 'wallet-1', { frozen: true })[0]);
    assert.strictEqual(utxo.memo, 'Cold storage');
    assert.strictEqual(Object.prototype.hasOwnProperty.call(utxo, 'wif'), false);
    setWalletOutpointsFrozen(realm, 'wallet-1', ['utxo:0'], false);
    assert.strictEqual(queryWalletUtxos(realm, 'wallet-1', { frozen: false }).sum('value'), 42);
    assert.strictEqual(readMetadata(realm).counterpartyMetadata.alice.label, 'Alice');
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
});
