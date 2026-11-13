import assert from 'assert';

import {
  closeAllArkadeRealms,
  closeArkadeRealm,
  deleteArkadeRealm,
  getArkadeRealm,
  __testing__,
} from '../../blue_modules/arkade-adapters/realm/realmInstance';
import { BoltzSwapSchema } from '../../blue_modules/arkade-adapters/realm/boltzSwapSchema';

const { ARK_REALM_SCHEMA_VERSION } = require('@arkade-os/sdk/repositories/realm');
const Keychain = require('react-native-keychain');
const Realm = require('realm');
const RNFS = require('react-native-fs');

beforeEach(() => {
  Keychain.__mockKeychainHelpers.reset();
  Realm.__mockRealmHelpers.reset();
  RNFS.__mockFsHelpers.reset();
  Keychain.setGenericPassword.mockClear();
  Keychain.getGenericPassword.mockClear();
  Keychain.resetGenericPassword.mockClear();
  Keychain.getSecurityLevel.mockClear();
  Realm.open.mockClear();
  Realm.exists.mockClear();
  Realm.deleteFile.mockClear();
  // Reset adapter's internal cache between tests so each test starts cold.
  closeAllArkadeRealms();
});

describe('arkade realm adapter', () => {
  it('opens distinct Realm files per namespace', async () => {
    const r1 = await getArkadeRealm('ns-one');
    const r2 = await getArkadeRealm('ns-two');

    assert.notStrictEqual(r1, r2);
    assert.notStrictEqual(__testing__.realmPathFor('ns-one'), __testing__.realmPathFor('ns-two'));
    assert.notStrictEqual(__testing__.keychainServiceFor('ns-one'), __testing__.keychainServiceFor('ns-two'));
  });

  it('returns the cached instance on repeat opens for the same namespace', async () => {
    const r1 = await getArkadeRealm('ns');
    const r2 = await getArkadeRealm('ns');

    assert.strictEqual(r1, r2);
    assert.strictEqual(Realm.open.mock.calls.length, 1);
  });

  it('deduplicates concurrent opens for the same namespace', async () => {
    const [r1, r2, r3] = await Promise.all([getArkadeRealm('ns'), getArkadeRealm('ns'), getArkadeRealm('ns')]);

    assert.strictEqual(r1, r2);
    assert.strictEqual(r2, r3);
    assert.strictEqual(Realm.open.mock.calls.length, 1);
  });

  it('opens encrypted Realm with Ark + asset-swap schemas and the kept BoltzSwap table', async () => {
    await getArkadeRealm('ns');

    const config = Realm.open.mock.calls[0][0];
    assert.ok(Array.isArray(config.schema), 'schema is array');
    assert.ok(config.schema.length > 0, 'schema is non-empty');
    for (const name of [
      'ArkadeAssetSwap',
      'ArkadeAssetSwapScannedTxid',
      'ArkadeAssetSwapMarketsCache',
      'ArkadeRfqSwap',
      'ArkadeSwapRecord',
    ]) {
      assert.ok(
        config.schema.some((s: any) => s.name === name),
        `has ${name} schema`,
      );
    }
    assert.deepStrictEqual(
      config.schema.find((s: any) => s.name === 'BoltzSwap'),
      BoltzSwapSchema,
      'BoltzSwap stays registered, in the shape boltz-swap wrote',
    );
    assert.ok(
      config.schema.every((s: any) => s.name !== 'ArkSwapNotificationSuppression'),
      'suppression schema is gone with its subject',
    );
    assert.ok(
      config.schema.some((s: any) => s.name === 'ArkVtxo'),
      'has ArkVtxo schema',
    );
    assert.ok(typeof config.schemaVersion === 'number', 'schemaVersion is a number');
    assert.ok(config.encryptionKey instanceof Uint8Array, 'encryptionKey is Uint8Array');
    assert.strictEqual(config.encryptionKey.length, 64, 'encryption key is 64 bytes');
    assert.strictEqual(config.excludeFromIcloudBackup, true);
    assert.ok(typeof config.onMigration === 'function', 'onMigration is a function');
  });

  it('migration drops the suppression model and keeps BoltzSwap', async () => {
    await getArkadeRealm('ns-migration');

    const config = Realm.open.mock.calls[0][0];
    const deleted: string[] = [];
    config.onMigration(
      {},
      {
        objects: () => [],
        deleteModel: (name: string) => {
          deleted.push(name);
        },
      },
    );
    assert.deepStrictEqual(deleted, ['ArkSwapNotificationSuppression']);
  });

  // A dev build of this branch dropped BoltzSwap at offset 1, so re-registering
  // the model has to advance the version or Realm refuses to reopen the file.
  it('advances the schema version past every build that already wrote a file', async () => {
    await getArkadeRealm('ns-version');

    const config = Realm.open.mock.calls[0][0];
    assert.strictEqual(config.schemaVersion, ARK_REALM_SCHEMA_VERSION + 2);
    // Released master: SDK 0.4.35's ARK_REALM_SCHEMA_VERSION (2) + offset 1.
    assert.ok(config.schemaVersion > 2 + 1, 'ahead of the released master build');
    // This branch's own earlier build: same SDK version, offset 1.
    assert.ok(config.schemaVersion > ARK_REALM_SCHEMA_VERSION + 1, 'ahead of the dev arkade-0.5 build');
  });

  it('migrates a Realm whose BoltzSwap model a dev build already dropped', async () => {
    await getArkadeRealm('ns-dropped');

    const config = Realm.open.mock.calls[0][0];
    // Realm throws from deleteModel when the model is absent.
    assert.doesNotThrow(() =>
      config.onMigration(
        {},
        {
          objects: () => [],
          deleteModel: (name: string) => {
            throw new Error(`model ${name} not found`);
          },
        },
      ),
    );
  });

  it('starts the BoltzSwap table empty and reads back the rows an upgrade carried in', async () => {
    const realm = await getArkadeRealm('ns-upgrade');
    assert.strictEqual(realm.objects('BoltzSwap').length, 0, 'a fresh install has an empty table');

    const stored = { id: 'swap-1', type: 'submarine', status: 'transaction.mempool', createdAt: 1767225600, data: '{"id":"swap-1"}' };
    realm.write(() => realm.create('BoltzSwap', stored));

    assert.deepStrictEqual(Array.from(realm.objects('BoltzSwap')), [stored], 'the registered table is readable');
  });

  it('persists Realm encryption key per namespace and reuses it on reopen', async () => {
    await getArkadeRealm('ns');
    closeArkadeRealm('ns');
    await getArkadeRealm('ns');

    assert.strictEqual(Keychain.setGenericPassword.mock.calls.length, 1, 'set called once');
    assert.ok(Keychain.getGenericPassword.mock.calls.length >= 2, 'get called at least twice');

    const firstSet = Keychain.setGenericPassword.mock.calls[0];
    assert.strictEqual(firstSet[2].accessible, 'AccessibleWhenUnlockedThisDeviceOnly');
    assert.strictEqual(firstSet[2].service, __testing__.keychainServiceFor('ns'));
  });

  it('reopens a fresh instance after closeArkadeRealm', async () => {
    const r1 = await getArkadeRealm('ns');
    closeArkadeRealm('ns');
    assert.strictEqual(r1.isClosed, true);

    const r2 = await getArkadeRealm('ns');
    assert.notStrictEqual(r1, r2);
    assert.strictEqual(r2.isClosed, false);
  });

  it('closeAllArkadeRealms closes every cached instance', async () => {
    const r1 = await getArkadeRealm('ns-a');
    const r2 = await getArkadeRealm('ns-b');

    closeAllArkadeRealms();

    assert.strictEqual(r1.isClosed, true);
    assert.strictEqual(r2.isClosed, true);
  });

  it('deleteArkadeRealm closes Realm, removes Keychain entry, and clears cache', async () => {
    await getArkadeRealm('ns');
    assert.ok(Keychain.__mockKeychainHelpers.store.has(__testing__.keychainServiceFor('ns')));

    await deleteArkadeRealm('ns');

    assert.strictEqual(Realm.deleteFile.mock.calls.length, 1, 'Realm.deleteFile invoked');
    assert.strictEqual(Realm.deleteFile.mock.calls[0][0].path, __testing__.realmPathFor('ns'));
    assert.ok(!Keychain.__mockKeychainHelpers.store.has(__testing__.keychainServiceFor('ns')), 'keychain entry removed');
    assert.strictEqual(Keychain.resetGenericPassword.mock.calls.length, 1);

    // Subsequent open creates a fresh keychain entry (rather than reusing the deleted one).
    Keychain.setGenericPassword.mockClear();
    await getArkadeRealm('ns');
    assert.strictEqual(Keychain.setGenericPassword.mock.calls.length, 1, 'new key generated after delete');
  });

  it('preserves Keychain encryption key when Realm file deletion fails', async () => {
    await getArkadeRealm('ns');
    Realm.deleteFile.mockImplementationOnce(() => {
      throw new Error('disk error');
    });

    await deleteArkadeRealm('ns');

    assert.strictEqual(Keychain.resetGenericPassword.mock.calls.length, 0, 'keychain key preserved');
    assert.ok(Keychain.__mockKeychainHelpers.store.has(__testing__.keychainServiceFor('ns')), 'keychain entry still present');
  });

  it('skips Realm.deleteFile when no realm file exists but still resets keychain', async () => {
    // Simulate a never-opened wallet whose keychain entry leaked. Realm.exists
    // returns false because we never called getArkadeRealm — but a stray
    // setGenericPassword still seeded Keychain.
    Keychain.__mockKeychainHelpers.store.set(__testing__.keychainServiceFor('ns'), {
      username: 'svc',
      password: 'deadbeef',
      service: __testing__.keychainServiceFor('ns'),
    });

    await deleteArkadeRealm('ns');

    assert.strictEqual(Realm.deleteFile.mock.calls.length, 0, 'no file deletion attempted');
    assert.strictEqual(Keychain.resetGenericPassword.mock.calls.length, 1, 'keychain still cleared');
  });

  it('does not leak namespaces across wallets via shared keychain entries', async () => {
    await getArkadeRealm('walletA');
    await getArkadeRealm('walletB');

    const services = Array.from(Keychain.__mockKeychainHelpers.store.keys());
    assert.ok(services.includes(__testing__.keychainServiceFor('walletA')));
    assert.ok(services.includes(__testing__.keychainServiceFor('walletB')));
    assert.notStrictEqual(services[0], services[1]);
  });

  it('opts into SECURE_HARDWARE when getSecurityLevel reports it as supported', async () => {
    Keychain.getSecurityLevel.mockResolvedValueOnce('SECURE_HARDWARE');

    await getArkadeRealm('ns');

    assert.strictEqual(Keychain.setGenericPassword.mock.calls.length, 1);
    assert.strictEqual(Keychain.setGenericPassword.mock.calls[0][2].securityLevel, 'SECURE_HARDWARE');
  });

  it('omits securityLevel option when hardware-backed keystore is not supported', async () => {
    // Android device without TEE/StrongBox: getSecurityLevel returns SECURE_SOFTWARE.
    Keychain.getSecurityLevel.mockResolvedValueOnce('SECURE_SOFTWARE');

    await getArkadeRealm('ns');

    assert.strictEqual(Keychain.setGenericPassword.mock.calls.length, 1);
    assert.strictEqual(
      Keychain.setGenericPassword.mock.calls[0][2].securityLevel,
      undefined,
      'no securityLevel passed → react-native-keychain default',
    );
  });

  it('omits securityLevel option on iOS where getSecurityLevel returns null', async () => {
    Keychain.getSecurityLevel.mockResolvedValueOnce(null);

    await getArkadeRealm('ns');

    assert.strictEqual(Keychain.setGenericPassword.mock.calls.length, 1);
    assert.strictEqual(
      Keychain.setGenericPassword.mock.calls[0][2].securityLevel,
      undefined,
      'null preflight result → no securityLevel passed',
    );
  });

  it('does not silently downgrade when SECURE_HARDWARE setGenericPassword fails for unrelated reasons', async () => {
    Keychain.getSecurityLevel.mockResolvedValueOnce('SECURE_HARDWARE');
    Keychain.setGenericPassword.mockImplementationOnce(async () => {
      throw new Error('keystore write failed');
    });

    await assert.rejects(getArkadeRealm('ns'), /keystore write failed/);

    // Only one attempt — no fallback retry.
    assert.strictEqual(Keychain.setGenericPassword.mock.calls.length, 1);
  });
});
