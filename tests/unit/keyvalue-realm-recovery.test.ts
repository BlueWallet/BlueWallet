import assert from 'assert';
import presentAlert from '../../components/Alert';
import { BlueApp } from '../../class/blue-app';
import { LegacyWallet } from '../../class/wallets/legacy-wallet';
import { BitcoinUnit } from '../../models/bitcoinUnits';

// Jest hoists this above the imports above.
jest.mock('../../components/Alert', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const Realm = require('realm');
const Keychain = require('react-native-keychain');

const KEYVALUE_PATH = '/mock/Caches/keyvalue.realm';
const presentAlertMock = presentAlert as unknown as jest.Mock;

function decryptionError(): Error {
  return new Error(
    "Failed to open Realm file at path '/mock/Caches/keyvalue.realm': Realm file decryption failed (Decryption failed: page 0 in file of size 401408 failed the HMAC check. Either the encryption key is incorrect or data is corrupted)",
  );
}

describe('keyvalue realm backup recovery', () => {
  const originalOpen = Realm.open.getMockImplementation();

  beforeEach(() => {
    Keychain.__mockKeychainHelpers.reset();
    Realm.__mockRealmHelpers.reset();
    Realm.open.mockReset();
    Realm.open.mockImplementation(originalOpen);
    Realm.deleteFile.mockClear();
    presentAlertMock.mockClear();
  });

  it('deletes the cache file and rewrites the backup when the encryption key does not match', async () => {
    const storage = new BlueApp();
    storage.wallets = [];
    await storage.saveToDisk();

    assert.strictEqual(presentAlertMock.mock.calls.length, 0);
    Realm.deleteFile.mockClear();

    let keyValueOpens = 0;
    Realm.open.mockImplementation(async (config: { path?: string }) => {
      if (config?.path === KEYVALUE_PATH) {
        keyValueOpens += 1;
        if (keyValueOpens === 1) throw decryptionError();
      }
      return originalOpen(config);
    });

    await storage.saveToDisk();

    assert.strictEqual(presentAlertMock.mock.calls.length, 0, 'a recovered backup must not alert');
    assert.strictEqual(keyValueOpens, 2, 'open is retried after the stale file is removed');
    const deletedPaths = Realm.deleteFile.mock.calls.map((call: [{ path?: string }]) => call[0]?.path);
    assert.ok(deletedPaths.includes(KEYVALUE_PATH), `expected delete of ${KEYVALUE_PATH}, got ${deletedPaths.join(', ')}`);
    assert.ok(!deletedPaths.includes('keyvalue.realm'), 'relative path would delete Documents/keyvalue.realm, not the cache file');

    const realm = Realm.__mockRealmHelpers.store.get(KEYVALUE_PATH);
    const saved = [...realm.objects('KeyValue')].find((row: { key: string; value: string }) => row.key === 'data');
    assert.ok(saved?.value, 'backup was written to the recreated file');
    assert.ok(saved.value.includes('wallets'));
  });

  it('alerts but resolves when the backup fails after primary storage was committed', async () => {
    const storage = new BlueApp();
    storage.wallets = [];

    Realm.open.mockImplementation(async (config: { path?: string }) => {
      if (config?.path === KEYVALUE_PATH) throw new Error('disk full');
      return originalOpen(config);
    });

    await storage.saveToDisk();

    assert.strictEqual(Realm.deleteFile.mock.calls.length, 0);
    assert.strictEqual(presentAlertMock.mock.calls.length, 1);
    assert.ok(String(presentAlertMock.mock.calls[0][0].message).includes('disk full'));
  });

  it('rejects when primary storage fails so callers cannot treat the save as successful', async () => {
    const storage = new BlueApp();
    storage.wallets = [];
    storage.setItem = jest.fn().mockRejectedValue(new Error('secure store unavailable'));

    await assert.rejects(() => storage.saveToDisk(), /secure store unavailable/);

    assert.strictEqual(presentAlertMock.mock.calls.length, 1);
    assert.strictEqual(Realm.open.mock.calls.filter(([config]: [{ path?: string }]) => config?.path === KEYVALUE_PATH).length, 0);
  });

  it('applies only order and balance visibility from a wallet edit draft', async () => {
    const storage = new BlueApp();
    const first = new LegacyWallet();
    const second = new LegacyWallet();
    first.setSecret('first-wallet');
    second.setSecret('second-wallet');
    first.balance = 100;
    second.balance = 200;
    storage.wallets = [first, second];

    const firstEdit = Object.assign(Object.create(Object.getPrototypeOf(first)), first);
    const secondEdit = Object.assign(Object.create(Object.getPrototypeOf(second)), second);
    firstEdit.balance = 1;
    secondEdit.balance = 2;
    secondEdit.hideBalance = true;
    secondEdit.setPreferredBalanceUnit(BitcoinUnit.SATS);

    await storage.saveToDisk([secondEdit, firstEdit]);

    assert.strictEqual(storage.wallets[0], second, 'the current live wallet instance is reordered, not replaced by its draft');
    assert.strictEqual(storage.wallets[1], first);
    assert.strictEqual(second.balance, 200, 'live wallet data updated after the draft was created is preserved');
    assert.strictEqual(first.balance, 100);
    assert.strictEqual(second.hideBalance, true);
    assert.strictEqual(second.getPreferredBalanceUnit(), BitcoinUnit.SATS);
  });

  it('rolls back wallet order, balance visibility, and display units when an edit save fails', async () => {
    const storage = new BlueApp();
    const first = new LegacyWallet();
    const second = new LegacyWallet();
    first.setSecret('rollback-first-wallet');
    second.setSecret('rollback-second-wallet');
    storage.wallets = [first, second];
    storage.setItem = jest.fn().mockRejectedValue(new Error('edit save failed'));

    const firstEdit = Object.assign(Object.create(Object.getPrototypeOf(first)), first);
    const secondEdit = Object.assign(Object.create(Object.getPrototypeOf(second)), second);
    secondEdit.hideBalance = true;
    secondEdit.setPreferredBalanceUnit(BitcoinUnit.SATS);

    await assert.rejects(() => storage.saveToDisk([secondEdit, firstEdit]), /edit save failed/);

    assert.deepStrictEqual(storage.wallets, [first, second]);
    assert.strictEqual(first.hideBalance, false);
    assert.strictEqual(second.hideBalance, false);
    assert.strictEqual(second.getPreferredBalanceUnit(), BitcoinUnit.BTC);
  });

  it('closes the backup Realm when a write throws', async () => {
    const storage = new BlueApp();
    storage.wallets = [];
    let isClosed = false;
    const close = jest.fn(() => {
      isClosed = true;
    });
    const brokenRealm = {
      get isClosed() {
        return isClosed;
      },
      write: jest.fn(() => {
        throw new Error('backup write failed');
      }),
      close,
    };

    Realm.open.mockImplementation(async (config: { path?: string }) => {
      if (config?.path === KEYVALUE_PATH) return brokenRealm;
      return originalOpen(config);
    });

    await storage.saveToDisk();

    assert.strictEqual(close.mock.calls.length, 1);
    assert.strictEqual(presentAlertMock.mock.calls.length, 1);
    assert.ok(String(presentAlertMock.mock.calls[0][0].message).includes('backup write failed'));
  });
});
