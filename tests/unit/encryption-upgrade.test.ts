/**
 * H08 · Moving a store from the CryptoJS format to `nw2:` (argon2id +
 * XChaCha20-Poly1305) with the real store code on the storage double: only
 * the bucket the session opened changes, a failed write changes nothing, and
 * a restart opens a complete copy with the right password.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import * as encryption from '../../blue_modules/encryption';
import { PasswordInUseError, StorageWriteError } from '../../class/storage-errors';
import { NeuraiHDWallet } from '../../class/wallets/neurai-hd-wallet';
import { derivations } from './helpers/wallet-crypto-double';
import { appOn, StorageDouble } from './helpers/storage-double';

const WORDS_A = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const WORDS_B = 'legal winner thank year wave sausage worth useful legal winner thank yellow';

function bucketJson(words: string, label: string): string {
  const wallet = NeuraiHDWallet.forNetwork('mainnet', words);
  wallet.setLabel(label);
  return JSON.stringify({ wallets: [JSON.stringify(wallet)], tx_metadata: {}, counterparty_metadata: {} });
}

const stored = (disk: StorageDouble): string[] => JSON.parse(disk.primary.get('data')!);
const labelsIn = (plaintext: string | false): string[] =>
  plaintext ? JSON.parse(plaintext).wallets.map((record: string) => JSON.parse(record).label) : [];

/** A store written by an earlier version: one CryptoJS bucket per password. */
function legacyStore(...buckets: Array<[string, string, string]>): StorageDouble {
  const data = JSON.stringify(buckets.map(([words, label, password]) => encryption.encrypt(bucketJson(words, label), password)));
  return new StorageDouble().seed({ data, data_encrypted: '1' });
}

beforeEach(async () => {
  jest.restoreAllMocks();
  await AsyncStorage.clear();
  derivations.length = 0;
});

describe('H08 · upgrading the encryption of a store', () => {
  it('keeping the password: the bucket becomes nw2, the wallets stay, and the next start opens it', async () => {
    const disk = legacyStore([WORDS_A, 'Savings', 'pw-a']);
    const app = appOn(disk);
    expect(await app.loadFromDisk('pw-a')).toBe(true);
    expect(app.canUpgradeEncryption()).toBe(true);

    await app.upgradeEncryption();

    expect(encryption.bucketFormat(stored(disk)[0])).toBe('nw2');
    expect(disk.primary.get('data_encrypted')).toBe('1');
    expect(disk.backup.get('data')).toBe(disk.primary.get('data'));
    expect(app.canUpgradeEncryption()).toBe(false);

    const restarted = appOn(disk);
    expect(await restarted.loadFromDisk('pw-a')).toBe(true);
    expect(restarted.wallets.map(wallet => wallet.getLabel())).toEqual(['Savings']);
    expect(restarted.canUpgradeEncryption()).toBe(false);
    expect(await appOn(disk).loadFromDisk('pw-other')).toBe(false);
  });

  it('with a new password: only the new one opens the store, and it is the session password', async () => {
    const disk = legacyStore([WORDS_A, 'Savings', 'old-password']);
    const app = appOn(disk);
    await app.loadFromDisk('old-password');

    await app.upgradeEncryption('a much longer new password');

    expect(app.cachedPassword).toBe('a much longer new password');
    expect(await appOn(disk).loadFromDisk('old-password')).toBe(false);
    const restarted = appOn(disk);
    expect(await restarted.loadFromDisk('a much longer new password')).toBe(true);
    expect(restarted.wallets.map(wallet => wallet.getLabel())).toEqual(['Savings']);
    // Turning the password off asks for the new one.
    await expect(restarted.decryptStorage('old-password')).rejects.toThrow(/Incorrect password/);
    await restarted.decryptStorage('a much longer new password');
    expect(JSON.parse(disk.primary.get('data')!).wallets).toHaveLength(1);
  });

  it('with two buckets, only the one the session opened changes; the other opens as before', async () => {
    const disk = legacyStore([WORDS_A, 'Real', 'password-a'], [WORDS_B, 'Second', 'password-b']);
    const bucketB = stored(disk)[1];
    const app = appOn(disk);
    await app.loadFromDisk('password-a');

    await app.upgradeEncryption();

    const [a, b] = stored(disk);
    expect(encryption.bucketFormat(a)).toBe('nw2');
    expect(b).toBe(bucketB);
    expect(labelsIn(encryption.decrypt(a, 'password-a'))).toEqual(['Real']);
    expect(labelsIn(encryption.decrypt(b, 'password-b'))).toEqual(['Second']);

    // The other password still opens its own bucket, still in the old format, and may upgrade it too.
    const other = appOn(disk);
    expect(await other.loadFromDisk('password-b')).toBe(true);
    expect(other.wallets.map(wallet => wallet.getLabel())).toEqual(['Second']);
    expect(other.canUpgradeEncryption()).toBe(true);
    await other.upgradeEncryption();
    expect(stored(disk)[0]).toBe(a);
    expect(stored(disk).map(encryption.bucketFormat)).toEqual(['nw2', 'nw2']);
    expect(await appOn(disk).loadFromDisk('password-a')).toBe(true);
  });

  it('refuses a new password that already opens another bucket, and writes nothing', async () => {
    const disk = legacyStore([WORDS_A, 'Real', 'password-a'], [WORDS_B, 'Second', 'password-b']);
    const before = disk.primary.get('data');
    const app = appOn(disk);
    await app.loadFromDisk('password-a');

    await expect(app.upgradeEncryption('password-b')).rejects.toBeInstanceOf(PasswordInUseError);

    expect(disk.primary.get('data')).toBe(before);
    expect(app.cachedPassword).toBe('password-a');
    expect(app.canUpgradeEncryption()).toBe(true);
  });

  it('a write that fails changes nothing: the session and the next start keep the old password', async () => {
    const disk = legacyStore([WORDS_A, 'Savings', 'old-password']);
    const before = disk.primary.get('data');
    const app = appOn(disk);
    await app.loadFromDisk('old-password');

    disk.writeFault.data = new Error('keystore full');
    await expect(app.upgradeEncryption('new password 123')).rejects.toBeInstanceOf(StorageWriteError);
    disk.writeFault.data = undefined;

    expect(disk.primary.get('data')).toBe(before);
    expect(app.cachedPassword).toBe('old-password');
    expect(app.canUpgradeEncryption()).toBe(true);
    // A later ordinary save still writes the old format, with the old password.
    await app.saveToDisk();
    expect(encryption.bucketFormat(stored(disk)[0])).toBe('cryptojs');
    expect(await appOn(disk).loadFromDisk('old-password')).toBe(true);
  });

  it('a backup that fails after the commit: the store opens upgraded, the backup keeps the old copy until the next save', async () => {
    const disk = legacyStore([WORDS_A, 'Savings', 'old-password']);
    const app = appOn(disk);
    await app.loadFromDisk('old-password');
    await app.saveToDisk(); // the backup holds the old-format store
    const oldBackup = disk.backup.get('data')!;

    disk.backupWriteFault = new Error('disk full');
    await app.upgradeEncryption('new password 123');
    expect(app.backupDegraded).toBe(true);
    expect(disk.backup.get('data')).toBe(oldBackup);
    // The backup is a complete copy too: the old password opens it.
    expect(labelsIn(encryption.decrypt(JSON.parse(oldBackup)[0], 'old-password'))).toEqual(['Savings']);

    const restarted = appOn(disk);
    expect(await restarted.loadFromDisk('new password 123')).toBe(true);
    disk.backupWriteFault = null;
    await restarted.saveToDisk();
    expect(restarted.backupDegraded).toBe(false);
    expect(disk.backup.get('data')).toBe(disk.primary.get('data'));
  });

  it('saves after the upgrade keep the format and the salt: one key derivation, not one per save', async () => {
    const disk = legacyStore([WORDS_A, 'Savings', 'pw-a']);
    const app = appOn(disk);
    await app.loadFromDisk('pw-a');
    await app.upgradeEncryption();
    const header = (bucket: string) => JSON.parse(Buffer.from(bucket.slice(4, bucket.indexOf('.')), 'base64url').toString());
    const salt = header(stored(disk)[0]).salt;

    for (const label of ['One', 'Two', 'Three']) {
      app.wallets[0].setLabel(label);
      await app.saveToDisk();
    }
    expect(header(stored(disk)[0]).salt).toBe(salt);
    expect(derivations).toHaveLength(1);
    expect(labelsIn(encryption.decrypt(stored(disk)[0], 'pw-a'))).toEqual(['Three']);
  });

  it('the session holds one key: an unlock derives it once, saves reuse it, a wrong attempt keeps nothing, removing the password drops it', async () => {
    const disk = legacyStore([WORDS_A, 'Savings', 'pw-a']);
    const first = appOn(disk);
    await first.loadFromDisk('pw-a');
    await first.upgradeEncryption();
    const sessionKey = (app: unknown) => (app as { bucketKey: unknown }).bucketKey;

    derivations.length = 0;
    const restarted = appOn(disk);
    expect(await restarted.loadFromDisk('a near miss of pw-a')).toBe(false);
    expect(sessionKey(restarted)).toBeNull();
    expect(await restarted.loadFromDisk('pw-a')).toBe(true);
    expect(sessionKey(restarted)).not.toBeNull();
    for (const label of ['One', 'Two']) {
      restarted.wallets[0].setLabel(label);
      await restarted.saveToDisk();
    }
    expect(derivations).toHaveLength(2); // the wrong attempt and the unlock; no save derived

    await restarted.decryptStorage('pw-a');
    expect(sessionKey(restarted)).toBeNull();
  });

  it('turning the password on writes nw2 directly; a plain store has nothing to upgrade', async () => {
    const disk = new StorageDouble().seed({ data: bucketJson(WORDS_A, 'Savings') });
    const app = appOn(disk);
    await app.loadFromDisk();
    expect(app.canUpgradeEncryption()).toBe(false);
    await expect(app.upgradeEncryption()).rejects.toThrow(/not encrypted/);

    await app.encryptStorage('pw-new-store');

    expect(encryption.bucketFormat(stored(disk)[0])).toBe('nw2');
    expect(app.canUpgradeEncryption()).toBe(false);
    expect(await appOn(disk).loadFromDisk('pw-new-store')).toBe(true);
  });

  it('without the native module (iOS today): nothing is offered, and the password is turned on in the old format', async () => {
    const native = jest.requireMock<{ default: unknown }>('../../codegen/NativeWalletCrypto');
    const real = native.default;
    native.default = null;
    try {
      const legacy = legacyStore([WORDS_A, 'Savings', 'pw-a']);
      const app = appOn(legacy);
      await app.loadFromDisk('pw-a');
      expect(app.canUpgradeEncryption()).toBe(false);
      await expect(app.upgradeEncryption()).rejects.toThrow(/not available/);

      const plain = new StorageDouble().seed({ data: bucketJson(WORDS_A, 'Savings') });
      const fresh = appOn(plain);
      await fresh.loadFromDisk();
      await fresh.encryptStorage('pw-b');
      expect(encryption.bucketFormat(stored(plain)[0])).toBe('cryptojs');
    } finally {
      native.default = real;
    }
  });
});
