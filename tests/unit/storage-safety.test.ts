/**
 * Safety of the wallet store (class/blue-app.ts) against the audit findings:
 * a failed read never opens a session that can overwrite the store (H04),
 * checking a password never moves the session to another bucket (H05), a
 * failed save is reported (H03), removing the password never erases another
 * bucket (H06), backup and reset stay consistent (H07), unreadable records
 * survive a save (H29) and the Realm file migration keeps the copy in use
 * (H32). Wallets are test-only; nothing touches a network.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';

import * as encryption from '../../blue_modules/encryption';
import { BlueApp, openEncryptedBucket, parseStoredData } from '../../class/blue-app';
import {
  OtherEncryptedBucketsError,
  StorageCorruptError,
  StorageNotLoadedError,
  StorageReadableAgainError,
  StorageRecoverableError,
  StorageUnavailableError,
  StorageWriteError,
  type RestoreChoice,
} from '../../class/storage-errors';
import { NeuraiHDWallet } from '../../class/wallets/neurai-hd-wallet';
import { appOn, StorageDouble } from './helpers/storage-double';

const WORDS_A = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const WORDS_B = 'legal winner thank year wave sausage worth useful legal winner thank yellow';

function walletRecord(words: string, label: string, network: 'mainnet' | 'testnet' = 'mainnet'): string {
  const wallet = NeuraiHDWallet.forNetwork(network, words);
  wallet.setLabel(label);
  return JSON.stringify(wallet);
}

function bucketJson(records: string[], extra: Record<string, unknown> = {}): string {
  return JSON.stringify({ wallets: records, tx_metadata: {}, counterparty_metadata: {}, ...extra });
}

/** Store with two encrypted buckets, as a legacy decoy setup left it. */
function twoBuckets(): StorageDouble {
  const data = JSON.stringify([
    encryption.encrypt(bucketJson([walletRecord(WORDS_A, 'Real')]), 'password-a'),
    encryption.encrypt(bucketJson([walletRecord(WORDS_B, 'Decoy')]), 'password-b'),
  ]);
  return new StorageDouble().seed({ data, data_encrypted: '1' });
}

/** The copies a recoverable store offers (the load must fail with `StorageRecoverableError`). */
async function restoreChoices(app: BlueApp, password?: string): Promise<RestoreChoice[]> {
  const error = await app.loadFromDisk(password).then(
    () => null,
    (e: unknown) => e,
  );
  if (!(error instanceof StorageRecoverableError)) throw new Error(`expected a recoverable store, got ${String(error)}`);
  return error.choices;
}

function labelsIn(plaintext: string): string[] {
  return JSON.parse(plaintext).wallets.map((record: string) => JSON.parse(record).label);
}

beforeEach(async () => {
  jest.restoreAllMocks();
  await AsyncStorage.clear();
});

describe('stored data shape', () => {
  it('classifies absent, plain and encrypted data and rejects anything else', () => {
    expect(parseStoredData(null)).toEqual({ kind: 'absent' });
    expect(() => parseStoredData('')).toThrow(StorageCorruptError); // a value, not an absence
    expect(parseStoredData(bucketJson([])).kind).toBe('plain');
    expect(parseStoredData(JSON.stringify(['U2FsdGVkX1+abc'])).kind).toBe('encrypted');
    for (const bad of ['{', '[]', '[1]', '{"wallets":"x"}', '42']) expect(() => parseStoredData(bad)).toThrow(StorageCorruptError);
  });
});

describe('H04 · an uncertain start never writes over the store', () => {
  it('stays locked when the secure store fails and the backup cannot be opened', async () => {
    const disk = twoBuckets();
    const before = disk.snapshot();
    disk.readFault = { data: 'locked', data_encrypted: 'locked' };
    disk.backupOpenFault = new Error('Realm file decryption failed');
    const app = appOn(disk);

    await expect(app.storageIsEncrypted()).rejects.toThrow(StorageUnavailableError);
    await expect(app.loadFromDisk('password-a')).rejects.toThrow(StorageUnavailableError);
    expect(app.isSessionLoaded()).toBe(false);

    // What the UI could do next: add or re-import a wallet, or a push-driven save.
    app.wallets.push(NeuraiHDWallet.forNetwork('mainnet', WORDS_B));
    await expect(app.saveToDisk()).rejects.toThrow(StorageNotLoadedError);
    await expect(app.saveToDisk()).rejects.toThrow(StorageNotLoadedError);
    expect(disk.snapshot()).toEqual(before);
    expect(disk.log).toEqual([]);

    // Once the store reads again, both buckets open with their own password.
    disk.readFault = {};
    disk.backupOpenFault = null;
    for (const [password, label] of [
      ['password-a', 'Real'],
      ['password-b', 'Decoy'],
    ]) {
      const restarted = appOn(disk);
      expect(await restarted.loadFromDisk(password)).toBe(true);
      expect(restarted.wallets.map(wallet => wallet.getLabel())).toEqual([label]);
    }
  });

  it('decides "encrypted" from the data, not from a flag an interrupted write left empty', async () => {
    const disk = twoBuckets();
    disk.primary.set('data_encrypted', '');
    disk.backup.set('data_encrypted', '');
    const before = disk.snapshot();
    const app = appOn(disk);

    expect(await app.storageIsEncrypted()).toBe(true);
    expect(await app.loadFromDisk()).toBe(false);
    expect(app.isSessionLoaded()).toBe(false);
    await expect(app.saveToDisk()).rejects.toThrow(StorageNotLoadedError);
    expect(disk.snapshot()).toEqual(before);
  });

  it('does not open an older backup on its own when the secure store fails; the user restores it', async () => {
    // The backup is a revision behind: the last backup write had failed.
    const disk = new StorageDouble().seed({ data: bucketJson([walletRecord(WORDS_A, 'Rev 1')]), data_encrypted: '' });
    disk.primary.set('data', bucketJson([walletRecord(WORDS_A, 'Rev 1'), walletRecord(WORDS_B, 'Added in rev 2')]));
    disk.readFault = { data: 'locked' };
    const app = appOn(disk);

    await expect(app.storageIsEncrypted()).rejects.toThrow(StorageRecoverableError);
    await expect(app.loadFromDisk()).rejects.toThrow(StorageRecoverableError);
    expect(app.isSessionLoaded()).toBe(false);
    await expect(app.saveToDisk()).rejects.toThrow(StorageNotLoadedError);

    // The read recovers: the newer revision opens, the old backup never replaced it.
    disk.readFault = {};
    const restarted = appOn(disk);
    expect(await restarted.loadFromDisk()).toBe(true);
    expect(restarted.wallets.map(wallet => wallet.getLabel())).toEqual(['Rev 1', 'Added in rev 2']);
  });

  it('restores the backup only on request, and writes it over the unreadable secure store first', async () => {
    const disk = new StorageDouble().seed({ data: bucketJson([walletRecord(WORDS_A, 'Kept')]), data_encrypted: '' });
    disk.readFault = { data: 'locked', data_encrypted: 'locked' };
    const app = appOn(disk);
    const [only] = await restoreChoices(app);

    disk.writeFault = { data: new Error('keystore still broken') };
    await expect(app.loadFromDisk(undefined, { fromBackup: only.id })).rejects.toThrow(StorageWriteError);
    expect(app.isSessionLoaded()).toBe(false); // a restore that did not reach the store opens nothing

    disk.writeFault = {};
    expect(await app.loadFromDisk(undefined, { fromBackup: only.id })).toBe(true);
    expect(app.wallets.map(wallet => wallet.getLabel())).toEqual(['Kept']);
    expect(labelsIn(disk.primary.get('data')!)).toEqual(['Kept']);
  });

  it('restores an encrypted backup with its password and keeps the other buckets', async () => {
    const disk = twoBuckets();
    const backupData = disk.backup.get('data')!;
    disk.primary.set('data', '{garbage');
    const app = appOn(disk);
    const [copy] = await restoreChoices(app, 'password-b');
    expect(await app.backupIsEncrypted(copy.id)).toBe(true);
    expect(await app.loadFromDisk('wrong', { fromBackup: copy.id })).toBe(false);
    expect(await app.loadFromDisk('password-b', { fromBackup: copy.id })).toBe(true);
    const stored = JSON.parse(disk.primary.get('data')!);
    expect(stored[0]).toBe(JSON.parse(backupData)[0]);
    expect(labelsIn(encryption.decrypt(stored[1], 'password-b') as string)).toEqual(['Decoy']);
  });

  it('opens the backup on its own only when the secure store has no data key at all', async () => {
    const disk = twoBuckets();
    disk.primary.delete('data');
    disk.readFault = { data: 'missing' };
    const app = appOn(disk);
    expect(await app.loadFromDisk('password-a')).toBe(true);
    expect(app.wallets.map(wallet => wallet.getLabel())).toEqual(['Real']);

    // Nothing newer exists: the first save writes the full set of buckets back.
    disk.readFault = {};
    await app.saveToDisk();
    const stored = JSON.parse(disk.primary.get('data')!);
    expect(stored).toHaveLength(2);
    expect(labelsIn(encryption.decrypt(stored[1], 'password-b') as string)).toEqual(['Decoy']);
  });

  it('treats an empty string as a damaged value, not as a new install', async () => {
    const valid = bucketJson([walletRecord(WORDS_A, 'Valid backup')]);
    const disk = new StorageDouble().seed({ data: valid });
    disk.primary.set('data', '');
    const before = disk.snapshot();
    const app = appOn(disk);
    await expect(app.loadFromDisk()).rejects.toThrow(StorageRecoverableError);
    await expect(app.saveToDisk()).rejects.toThrow(StorageNotLoadedError);
    expect(disk.snapshot()).toEqual(before);

    const noBackup = new StorageDouble();
    noBackup.primary.set('data', '');
    await expect(appOn(noBackup).loadFromDisk()).rejects.toThrow(StorageCorruptError);
  });

  it('never creates the backup database while probing a store without one', async () => {
    const disk = new StorageDouble();
    disk.readFault = { data: 'missing' };
    const app = appOn(disk);
    const migrate = app.moveRealmFilesToCacheDirectory as jest.Mock;
    expect(await app.storageIsEncrypted()).toBe(false);
    expect(await app.loadFromDisk()).toBe(true);
    expect(disk.backupOpens).toBe(0);
    expect(disk.backupFile).toBe(false);
    expect(migrate).toHaveBeenCalledTimes(1); // Documents files move before anything opens Realm
  });

  it('treats a locked read with an empty backup as unavailable, not as a new install', async () => {
    const disk = new StorageDouble();
    disk.readFault = { data: 'locked' };
    const app = appOn(disk);

    await expect(app.loadFromDisk()).rejects.toThrow(StorageUnavailableError);
    expect(app.isSessionLoaded()).toBe(false);
  });

  it('opens a verified empty install and lets it save its first wallet', async () => {
    const disk = new StorageDouble();
    disk.readFault = { data: 'missing', data_encrypted: 'missing' }; // Android/iOS reject a missing key with "404"
    const app = appOn(disk);

    expect(await app.storageIsEncrypted()).toBe(false);
    expect(await app.loadFromDisk()).toBe(true);
    expect(app.wallets).toEqual([]);

    disk.readFault = {};
    const first = NeuraiHDWallet.forNetwork('mainnet', WORDS_A);
    first.setLabel('First');
    app.wallets.push(first);
    await app.saveToDisk();
    expect(labelsIn(disk.primary.get('data')!)).toEqual(['First']);
    expect(disk.backup.get('data')).toBe(disk.primary.get('data'));
  });

  it('keeps a damaged record instead of opening a partial list that the next save would shorten', async () => {
    const damaged = '{"type":"NeuraiHD","secret":';
    const disk = new StorageDouble().seed({ data: bucketJson([walletRecord(WORDS_A, 'First'), damaged]), data_encrypted: '' });
    const app = appOn(disk);

    expect(await app.loadFromDisk()).toBe(true);
    expect(app.wallets.map(wallet => wallet.getLabel())).toEqual(['First']);
    expect(app.getPreservedRecords()).toEqual([{ raw: damaged, reason: 'unreadable' }]);

    app.wallets[0].setLabel('Renamed');
    await app.saveToDisk();
    const saved = JSON.parse(disk.primary.get('data')!).wallets;
    expect(saved).toHaveLength(2);
    expect(saved[1]).toBe(damaged);
  });

  it('publishes nothing when the bucket itself is not readable', async () => {
    const disk = new StorageDouble().seed({ data: JSON.stringify([encryption.encrypt('not json at all', 'pw-pw-pw-pw')]) });
    const app = appOn(disk);

    await expect(app.loadFromDisk('pw-pw-pw-pw')).rejects.toThrow(StorageCorruptError);
    expect(app.isSessionLoaded()).toBe(false);
    expect(app.wallets).toEqual([]);
  });
});

describe('H05 · checking a password does not change the bucket a save replaces', () => {
  it('trying another password is pure, and a save of A leaves B byte for byte', async () => {
    const disk = twoBuckets();
    const bucketB = JSON.parse(disk.primary.get('data')!)[1];
    const app = appOn(disk);
    expect(await app.loadFromDisk('password-a')).toBe(true);

    const buckets = JSON.parse(disk.primary.get('data')!);
    expect(openEncryptedBucket(buckets, 'password-b')?.index).toBe(1);

    app.wallets[0].setLabel('Real, renamed');
    await Promise.all([app.saveToDisk(), app.saveToDisk()]);

    const stored = JSON.parse(disk.primary.get('data')!);
    expect(stored).toHaveLength(2);
    expect(stored[1]).toBe(bucketB);
    expect(labelsIn(encryption.decrypt(stored[0], 'password-a') as string)).toEqual(['Real, renamed']);
    expect(labelsIn(encryption.decrypt(stored[1], 'password-b') as string)).toEqual(['Decoy']);
  });

  it('a session opened with B saves into B only', async () => {
    const disk = twoBuckets();
    const bucketA = JSON.parse(disk.primary.get('data')!)[0];
    const app = appOn(disk);
    expect(await app.loadFromDisk('password-b')).toBe(true);
    openEncryptedBucket(JSON.parse(disk.primary.get('data')!), 'password-a');

    app.wallets[0].setLabel('Decoy, renamed');
    await app.saveToDisk();

    const stored = JSON.parse(disk.primary.get('data')!);
    expect(stored[0]).toBe(bucketA);
    expect(labelsIn(encryption.decrypt(stored[1], 'password-b') as string)).toEqual(['Decoy, renamed']);
  });

  it('refuses to write when the bucket of this session no longer opens with its password', async () => {
    const disk = twoBuckets();
    const app = appOn(disk);
    expect(await app.loadFromDisk('password-a')).toBe(true);
    // Another writer replaced the bucket at our index.
    const stored = JSON.parse(disk.primary.get('data')!);
    stored[0] = encryption.encrypt(bucketJson([]), 'someone-else');
    disk.primary.set('data', JSON.stringify(stored));
    const before = disk.snapshot();

    await expect(app.saveToDisk()).rejects.toThrow(StorageWriteError);
    expect(disk.snapshot()).toEqual(before);
  });
});

describe('H03 · a failed save is reported', () => {
  async function loadedPlain(disk: StorageDouble): Promise<BlueApp> {
    disk.seed({ data: bucketJson([walletRecord(WORDS_A, 'Before')]), data_encrypted: '' });
    const app = appOn(disk);
    await app.loadFromDisk();
    app.wallets[0].setLabel('After');
    return app;
  }

  it('rejects when the secure store refuses the data, and the next save completes', async () => {
    const disk = new StorageDouble();
    const app = await loadedPlain(disk);
    disk.writeFault = { data: new Error('keystore full') };

    await expect(app.saveToDisk()).rejects.toThrow(StorageWriteError);
    expect(labelsIn(disk.primary.get('data')!)).toEqual(['Before']);
    expect(labelsIn(disk.backup.get('data')!)).toEqual(['Before']);

    disk.writeFault = {};
    await app.saveToDisk();
    expect(labelsIn(disk.primary.get('data')!)).toEqual(['After']);
    expect(labelsIn(disk.backup.get('data')!)).toEqual(['After']);
  });

  it('treats the data write as the commit: a failed legacy flag is retried, not reported as a lost save', async () => {
    const disk = new StorageDouble();
    const app = await loadedPlain(disk);
    disk.writeFault = { data_encrypted: new Error('keystore full') };
    await app.saveToDisk();
    expect(labelsIn(disk.primary.get('data')!)).toEqual(['After']);
    expect(app.flagStale).toBe(true);
    disk.writeFault = {};
    await app.saveToDisk();
    expect(app.flagStale).toBe(false);
  });

  it('resolves with a degraded backup when only Realm fails, and the next save repairs it', async () => {
    const disk = new StorageDouble();
    const app = await loadedPlain(disk);
    disk.backupWriteFault = new Error('disk I/O error');

    await app.saveToDisk();
    expect(app.backupDegraded).toBe(true);
    expect(labelsIn(disk.primary.get('data')!)).toEqual(['After']);
    expect(labelsIn(disk.backup.get('data')!)).toEqual(['Before']);

    disk.backupWriteFault = null;
    await app.saveToDisk();
    expect(app.backupDegraded).toBe(false);
    expect(disk.backup.get('data')).toBe(disk.primary.get('data'));
  });

  it('sets aside a backup whose file no longer decrypts, and writes a new one (fourth review)', async () => {
    const disk = new StorageDouble();
    const app = await loadedPlain(disk);
    disk.backup.set('data', bucketJson([walletRecord(WORDS_B, 'Only in the backup')]));
    disk.openFaultAt = { cache: new Error('Realm file decryption failed') };
    await app.saveToDisk();
    expect(app.backupDegraded).toBe(false);
    expect(disk.backup.get('data')).toBe(disk.primary.get('data'));
    // The file that did not open is kept, and a recovery offers it once it opens.
    expect(disk.keptData().map(labelsIn)).toEqual([['Only in the backup']]);
    disk.readFault = { data: 'locked' };
    expect(await restoreChoices(appOn(disk))).toHaveLength(2);
  });

  it('keeps a backup that neither decrypts nor can be set aside, and retries on the next save', async () => {
    const disk = new StorageDouble();
    const app = await loadedPlain(disk);
    disk.backup.set('data', bucketJson([walletRecord(WORDS_B, 'Only in the backup')]));
    disk.openFaultAt = { cache: new Error('Realm file decryption failed') };
    disk.setAsideFault = new Error('EBUSY');
    await app.saveToDisk(); // the secure store holds the save: it resolves
    expect(app.backupDegraded).toBe(true);
    expect(labelsIn(disk.backup.get('data')!)).toEqual(['Only in the backup']);

    disk.setAsideFault = null;
    await app.saveToDisk();
    expect(app.backupDegraded).toBe(false);
    expect(disk.keptData().map(labelsIn)).toEqual([['Only in the backup']]);
  });

  it('wakes every waiting caller with the failure', async () => {
    const disk = new StorageDouble();
    const app = await loadedPlain(disk);
    disk.writeFault = { data: new Error('keystore full') };
    const results = await Promise.allSettled([app.saveToDisk(), app.saveToDisk(), app.saveToDisk()]);
    expect(results.map(result => result.status)).toEqual(['rejected', 'rejected', 'rejected']);
  });
});

describe('H06/H07 · password transitions and reset', () => {
  it('refuses to remove the password while another encrypted bucket exists', async () => {
    const disk = twoBuckets();
    const before = disk.snapshot();
    const app = appOn(disk);
    await app.loadFromDisk('password-a');

    await expect(app.decryptStorage('password-a')).rejects.toThrow(OtherEncryptedBucketsError);
    expect(disk.snapshot()).toEqual(before);
    expect(await app.storageIsEncrypted()).toBe(true);
  });

  it('removes the password of a single bucket and writes data, flag and backup together', async () => {
    const data = JSON.stringify([encryption.encrypt(bucketJson([walletRecord(WORDS_A, 'Only')]), 'password-a')]);
    const disk = new StorageDouble().seed({ data, data_encrypted: '1' });
    const app = appOn(disk);
    await app.loadFromDisk('password-a');

    await expect(app.decryptStorage('wrong')).rejects.toThrow('Incorrect password');
    expect(await app.decryptStorage('password-a')).toBe(true);
    expect(parseStoredData(disk.primary.get('data')).kind).toBe('plain');
    expect(disk.primary.get('data_encrypted')).toBe('');
    expect(disk.backup.get('data')).toBe(disk.primary.get('data'));
    expect(disk.backup.get('data_encrypted')).toBe('');
    expect(await app.storageIsEncrypted()).toBe(false);
    expect(labelsIn(disk.primary.get('data')!)).toEqual(['Only']);
  });

  it('turns the password on through the queued writer, and a failed write leaves the session plain', async () => {
    const disk = new StorageDouble().seed({ data: bucketJson([walletRecord(WORDS_A, 'Mine')]), data_encrypted: '' });
    const app = appOn(disk);
    await app.loadFromDisk();

    disk.writeFault = { data: new Error('keystore full') };
    await expect(app.encryptStorage('new-password')).rejects.toThrow(StorageWriteError);
    expect(await app.storageIsEncrypted()).toBe(false);
    expect(parseStoredData(disk.primary.get('data')).kind).toBe('plain');

    disk.writeFault = {};
    await app.encryptStorage('new-password');
    const stored = parseStoredData(disk.primary.get('data'));
    expect(stored.kind).toBe('encrypted');
    expect(disk.primary.get('data_encrypted')).toBe('1');
    expect(disk.backup.get('data')).toBe(disk.primary.get('data'));
    expect(disk.primary.get('data')).not.toContain(WORDS_A.split(' ')[0] + ' ' + WORDS_A.split(' ')[1]);

    const restarted = appOn(disk);
    expect(await restarted.loadFromDisk('new-password')).toBe(true);
    expect(restarted.wallets.map(wallet => wallet.getLabel())).toEqual(['Mine']);
    await expect(restarted.encryptStorage('again')).rejects.toThrow('already encrypted');
  });

  it('keeps a password that reached the store even when the flag write fails', async () => {
    const disk = new StorageDouble().seed({ data: bucketJson([walletRecord(WORDS_A, 'Mine')]), data_encrypted: '' });
    const app = appOn(disk);
    await app.loadFromDisk();
    disk.writeFault = { data_encrypted: new Error('keystore full') };
    await app.encryptStorage('new-password');
    expect(await app.storageIsEncrypted()).toBe(true);

    disk.writeFault = {};
    app.wallets[0].setLabel('Mine, renamed');
    await app.saveToDisk(); // must stay encrypted
    expect(parseStoredData(disk.primary.get('data')).kind).toBe('encrypted');
    expect(disk.primary.get('data')).not.toContain('Mine, renamed');
    const restarted = appOn(disk);
    expect(await restarted.loadFromDisk('new-password')).toBe(true);
    expect(restarted.wallets.map(wallet => wallet.getLabel())).toEqual(['Mine, renamed']);
  });

  it('writes data and flag of the backup in one transaction', async () => {
    const disk = new StorageDouble().seed({ data: bucketJson([walletRecord(WORDS_A, 'Before')]), data_encrypted: '' });
    const app = appOn(disk);
    await app.loadFromDisk();
    app.wallets[0].setLabel('After');
    await app.saveToDisk();
    const commit = disk.log.slice(-2);
    expect(commit.sort()).toEqual(['backup:data', 'backup:data_encrypted']);
  });

  it('a reset empties the backup too, so a later failed read cannot bring wallets back', async () => {
    const disk = twoBuckets();
    const app = appOn(disk);
    await app.loadFromDisk('password-a');
    const pending = app.saveToDisk().catch(error => error); // a write queued when the user resets

    await app.resetStorage();
    const queued = await pending;
    // A save of the discarded session either ran before the reset or is refused; it never lands after it.
    expect(queued === undefined || queued instanceof StorageNotLoadedError).toBe(true);
    expect(app.wallets).toEqual([]);
    expect(await app.storageIsEncrypted()).toBe(false);
    for (const place of [disk.primary, disk.backup]) {
      expect(JSON.parse(place.get('data')!).wallets).toEqual([]);
      expect(place.get('data_encrypted')).toBe('');
    }

    disk.readFault = { data: 'locked', data_encrypted: 'locked' };
    const restarted = appOn(disk);
    const [emptied] = await restoreChoices(restarted);
    expect(await restarted.loadFromDisk(undefined, { fromBackup: emptied.id })).toBe(true);
    expect(restarted.wallets).toEqual([]); // the backup was reset too: the old wallets cannot come back
  });

  it('a reset that does not reach the secure store keeps the app locked and the old store intact', async () => {
    const disk = twoBuckets();
    const before = disk.snapshot();
    const app = appOn(disk);
    await app.loadFromDisk('password-a');
    disk.writeFault = { data: new Error('keystore full') };

    await expect(app.resetStorage()).rejects.toThrow(StorageWriteError);
    expect(app.isSessionLoaded()).toBe(false);
    await expect(app.saveToDisk()).rejects.toThrow(StorageNotLoadedError);
    // Not committed: the copies renamed aside went back; everything is as before.
    expect(disk.snapshot()).toEqual(before);
    expect(disk.resetStash.size).toBe(0);
    const restarted = appOn(disk);
    expect(await restarted.loadFromDisk('password-a')).toBe(true);
    expect(restarted.wallets.map(wallet => wallet.getLabel())).toEqual(['Real']);

    disk.writeFault = {};
    await app.resetStorage(); // a retry completes it
    expect(app.isSessionLoaded()).toBe(true);
    expect(JSON.parse(disk.primary.get('data')!).wallets).toEqual([]);
  });

  it('a reset whose copies cannot be set aside is reported as failed and changes nothing', async () => {
    const disk = twoBuckets();
    const app = appOn(disk);
    const before = disk.snapshot();
    disk.resetFault = { setAside: new Error('EACCES') };
    await expect(app.resetStorage()).rejects.toThrow('EACCES');
    expect(app.isSessionLoaded()).toBe(false);
    expect(disk.snapshot()).toEqual(before);
  });

  it('a reset whose new backup cannot be written is done, and the next save writes the backup', async () => {
    const disk = twoBuckets();
    const app = appOn(disk);
    disk.backupOpenFault = new Error('cannot open');
    await app.resetStorage();
    expect(app.isSessionLoaded()).toBe(true);
    expect(app.backupDegraded).toBe(true);
    expect(disk.backup.size).toBe(0); // the old backup was renamed aside and deleted, not left behind
    disk.backupOpenFault = null;
    await app.saveToDisk();
    expect(JSON.parse(disk.backup.get('data')!).wallets).toEqual([]);
  });
});

describe('H29 · records this version cannot open survive a save', () => {
  it('keeps unknown types, duplicates and unknown bucket fields byte for byte', async () => {
    const future = JSON.stringify({ type: 'NeuraiSomethingNew', secret: 'opaque', label: 'Future' });
    const bitcoin = JSON.stringify({ type: 'HDsegwitBech32', secret: 'xprv-like', label: 'Pre-fork' });
    const first = walletRecord(WORDS_A, 'Known');
    const duplicate = walletRecord(WORDS_A, 'Same words, same network');
    const disk = new StorageDouble().seed({
      data: bucketJson([future, first, bitcoin, duplicate], { futureField: { v: 2 } }),
      data_encrypted: '',
    });
    const app = appOn(disk);

    await app.loadFromDisk();
    expect(app.wallets.map(wallet => wallet.getLabel())).toEqual(['Known']);
    expect(app.getPreservedRecords().map(record => record.reason)).toEqual(['unknown-type', 'unknown-type', 'duplicate']);

    await app.saveToDisk();
    const saved = JSON.parse(disk.primary.get('data')!);
    expect(saved.futureField).toEqual({ v: 2 });
    expect(saved.wallets.slice(1)).toEqual([future, bitcoin, duplicate]);
  });

  it('deleting a wallet also removes its stored duplicate, and undo restores both', async () => {
    const disk = new StorageDouble().seed({
      data: bucketJson([walletRecord(WORDS_A, 'Visible'), walletRecord(WORDS_A, 'Hidden copy')]),
      data_encrypted: '',
    });
    const app = appOn(disk);
    await app.loadFromDisk();
    const removal = app.deleteWallet(app.wallets[0]);
    expect(app.wallets).toEqual([]);
    expect(app.getPreservedRecords()).toEqual([]);

    removal.undo();
    expect(app.wallets).toHaveLength(1);
    expect(app.getPreservedRecords()).toHaveLength(1);
  });
});

describe('H32 · Realm files', () => {
  const fs = RNFS as unknown as Record<string, any>;

  beforeEach(() => {
    fs.DocumentDirectoryPath = '/docs';
    fs.CachesDirectoryPath = '/cache';
    fs.exists.mockReset();
    fs.readDir.mockReset();
    fs.moveFile.mockReset();
    fs.unlink.mockReset();
    fs.stat.mockReset();
  });

  it('moves a Documents file only where Caches has none, and never deletes or sets one aside', async () => {
    const present = new Set(['/docs', '/docs/keyvalue.realm', '/cache/keyvalue.realm', '/docs/old-wallettransactions.realm']);
    fs.exists.mockImplementation(async (path: string) => present.has(path));
    fs.readDir.mockResolvedValue([{ name: 'keyvalue.realm' }, { name: 'old-wallettransactions.realm' }, { name: 'notes.txt' }]);

    await new BlueApp().moveRealmFilesToCacheDirectory();

    expect(fs.unlink).not.toHaveBeenCalled();
    // keyvalue.realm exists in both places: both stay; the recovery compares them by content.
    expect(fs.moveFile.mock.calls).toEqual([['/docs/old-wallettransactions.realm', '/cache/old-wallettransactions.realm']]);
  });

  it('sets a superseded Documents backup aside without deleting an earlier one', async () => {
    const present = new Set(['/docs/keyvalue.realm', '/docs/keyvalue.realm.superseded']);
    fs.exists.mockImplementation(async (path: string) => present.has(path));
    jest.spyOn(Date, 'now').mockReturnValue(1234);
    await new BlueApp().retireLegacyBackup();
    expect(fs.unlink).not.toHaveBeenCalled();
    expect(fs.moveFile.mock.calls).toEqual([['/docs/keyvalue.realm', '/docs/keyvalue.realm.superseded-1234']]);
  });

  it('lists the copies a restore set aside, in both places, and sets one aside by renaming it', async () => {
    const tree: Record<string, string[]> = {
      '/docs': ['keyvalue.realm.kept-5', 'keyvalue.realm.kept-5.lock'],
      '/cache': ['keyvalue.realm', 'keyvalue.realm.kept-9', 'keyvalue.realm.kept-9.management', 'keyvalue.realm.kept-x'],
    };
    fs.exists.mockImplementation(async (path: string) => path in tree);
    fs.readDir.mockImplementation(async (dir: string) => tree[dir].map(name => ({ name })));
    expect(await new BlueApp().listKeptBackups()).toEqual(['/cache/keyvalue.realm.kept-9', '/docs/keyvalue.realm.kept-5']);

    jest.spyOn(Date, 'now').mockReturnValue(77);
    fs.exists.mockImplementation(async () => false);
    fs.moveFile.mockResolvedValue(undefined);
    await new BlueApp().setAsideBackup('/cache/keyvalue.realm');
    expect(fs.moveFile.mock.calls).toEqual([['/cache/keyvalue.realm', '/cache/keyvalue.realm.kept-77']]);

    // A rename that leaves the file where it was is a failure, not a success.
    fs.exists.mockImplementation(async (path: string) => path === '/cache/keyvalue.realm');
    await expect(new BlueApp().setAsideBackup('/cache/keyvalue.realm')).rejects.toThrow(StorageWriteError);
  });

  it('uses one absolute path for the backup in use', async () => {
    expect(BlueApp.realmKeyValuePath()).toBe('/cache/keyvalue.realm');
    expect(BlueApp.legacyRealmKeyValuePath()).toBe('/docs/keyvalue.realm');
  });

  /** A file system of two directories, as RNFS sees it; `fail` refuses a move or delete of that path. */
  const fakeFs = (tree: Record<string, Set<string>>, fail: { move?: string; unlink?: string } = {}) => {
    const split = (path: string) => [path.slice(0, path.lastIndexOf('/')), path.slice(path.lastIndexOf('/') + 1)];
    fs.exists.mockImplementation(async (path: string) => path in tree || !!tree[split(path)[0]]?.has(split(path)[1]));
    fs.readDir.mockImplementation(async (dir: string) => [...tree[dir]].map(name => ({ name })));
    fs.moveFile.mockImplementation(async (from: string, to: string) => {
      if (from === fail.move) throw new Error('EACCES');
      tree[split(from)[0]].delete(split(from)[1]);
      tree[split(to)[0]].add(split(to)[1]);
    });
    fs.unlink.mockImplementation(async (path: string) => {
      if (path === fail.unlink) throw new Error('EBUSY');
      tree[split(path)[0]].delete(split(path)[1]);
    });
    return (dir: string) => [...tree[dir]].sort();
  };
  const FOREIGN = [
    'notes.txt',
    'other.reset-123',
    'photos.reset-5',
    'keyvalue.realm.foo',
    'keyvalue.realmx.reset-9',
    'wallettransactions.realm',
  ];

  it('a reset sets aside exactly the backup files it owns, with their Realm side files, and nothing foreign', async () => {
    const tree = {
      '/docs': new Set(['keyvalue.realm', 'keyvalue.realm.lock', 'keyvalue.realm.superseded-17', 'keyvalue.realm.kept-3', ...FOREIGN]),
      '/cache': new Set([
        'keyvalue.realm',
        'keyvalue.realm.lock',
        'keyvalue.realm.note',
        'keyvalue.realm.management',
        'keyvalue.realm.stale-x',
        'images.cache',
      ]),
    };
    const ls = fakeFs(tree);
    const app = new BlueApp();

    await app.setAsideForReset('42');
    expect(ls('/docs')).toEqual(
      [
        ...FOREIGN,
        'keyvalue.realm.kept-3.reset-42',
        'keyvalue.realm.lock.reset-42',
        'keyvalue.realm.reset-42',
        'keyvalue.realm.superseded-17.reset-42',
      ].sort(),
    );
    expect(ls('/cache')).toEqual([
      'images.cache',
      'keyvalue.realm.lock.reset-42',
      'keyvalue.realm.management.reset-42',
      'keyvalue.realm.note.reset-42',
      'keyvalue.realm.reset-42',
      'keyvalue.realm.stale-x.reset-42',
    ]);
    // A foreign name with a reset-like suffix is not a reset (fifth review).
    expect(await app.listResetTokens()).toEqual(['42']);

    // A copy made after the reset (a backup set aside by a later save).
    tree['/cache'].add('keyvalue.realm.kept-77');

    // Commit: the files of that reset go; a later copy and foreign files stay, whatever their suffix.
    await app.deleteResetFiles('42');
    expect(ls('/docs')).toEqual([...FOREIGN].sort());
    expect(ls('/cache')).toEqual(['images.cache', 'keyvalue.realm.kept-77']);
    expect(await app.listResetTokens()).toEqual([]);
    await app.undoReset('123');
    expect(ls('/docs')).toEqual([...FOREIGN].sort());
  });

  it('undoing a reset gives each file back, never over a file, and leaves foreign files alone', async () => {
    // Meanwhile a new backup (with its lock file) was written in Caches.
    const ls = fakeFs({
      '/docs': new Set(['keyvalue.realm.reset-42', 'other.reset-42']),
      '/cache': new Set([
        'keyvalue.realm',
        'keyvalue.realm.lock',
        'keyvalue.realm.reset-42',
        'keyvalue.realm.lock.reset-42',
        'keyvalue.realm.kept-3.reset-42',
        'keyvalue.realm.stale-x.reset-42',
      ]),
    });
    jest.spyOn(Date, 'now').mockReturnValue(99);
    await new BlueApp().undoReset('42');
    expect(ls('/cache')).toEqual([
      'keyvalue.realm', // the new backup, untouched
      'keyvalue.realm.kept-3',
      'keyvalue.realm.kept-99', // the old backup, under a name of its own
      'keyvalue.realm.lock', // the old lock file only accompanied it: deleted, not renamed over
      'keyvalue.realm.stale-x',
    ]);
    expect(ls('/docs')).toEqual(['keyvalue.realm', 'other.reset-42']);
  });

  it('undoing a reset whose store was lost brings the backups back as copies set aside', async () => {
    const ls = fakeFs({
      '/docs': new Set(['keyvalue.realm.reset-42', 'keyvalue.realm.superseded.reset-42']),
      '/cache': new Set(['keyvalue.realm.reset-42', 'keyvalue.realm.note.reset-42', 'keyvalue.realm.kept-3.reset-42']),
    });
    let now = 500;
    jest.spyOn(Date, 'now').mockImplementation(() => now++);
    await new BlueApp().undoReset('42', 'kept');
    // Offered by a recovery as copies set aside, never opened on their own; the known-older one keeps its name.
    expect(ls('/docs')).toEqual(['keyvalue.realm.kept-500', 'keyvalue.realm.superseded']);
    expect(ls('/cache')).toEqual(['keyvalue.realm.kept-501', 'keyvalue.realm.kept-502']);
  });

  it('a rename that fails during the reset puts the others back and fails', async () => {
    const ls = fakeFs(
      { '/docs': new Set(['keyvalue.realm']), '/cache': new Set(['keyvalue.realm', 'keyvalue.realm.kept-1']) },
      { move: '/cache/keyvalue.realm.kept-1' },
    );
    await expect(new BlueApp().setAsideForReset('5')).rejects.toThrow(StorageWriteError);
    expect(ls('/docs')).toEqual(['keyvalue.realm']);
    expect(ls('/cache')).toEqual(['keyvalue.realm', 'keyvalue.realm.kept-1']);
  });

  it('a deletion that fails keeps that reset on the list, so the next start finishes it', async () => {
    fakeFs(
      { '/docs': new Set(['keyvalue.realm.reset-8']), '/cache': new Set(['keyvalue.realm.reset-8', 'keyvalue.realm.management.reset-8']) },
      { unlink: '/cache/keyvalue.realm.management.reset-8' },
    );
    const app = new BlueApp();
    await expect(app.deleteResetFiles('8')).rejects.toThrow(StorageWriteError);
    expect(await app.listResetTokens()).toEqual(['8']); // only a side file is left, and it still counts
  });
});

describe('H24 · native work per load and save', () => {
  it('opens no Realm on a normal load and exactly one (the backup) per save', async () => {
    const disk = new StorageDouble().seed({ data: bucketJson([walletRecord(WORDS_A, 'One')]), data_encrypted: '' });
    const app = appOn(disk);
    const opens = jest.spyOn(app, 'openRealmKeyValue');
    await app.loadFromDisk();
    expect(opens).toHaveBeenCalledTimes(0); // the old code opened the transactions Realm on every load
    await app.saveToDisk();
    expect(opens).toHaveBeenCalledTimes(1); // the old code opened two: transactions + key-value
  });
});

describe('second review · backup copies in two places', () => {
  const plain = (label: string) => bucketJson([walletRecord(WORDS_A, label)]);

  it('a failed Realm move does not hide the only copy, still in Documents, and is retried', async () => {
    const disk = new StorageDouble();
    disk.readFault = { data: 'missing' };
    disk.legacy.set('data', plain('Only in Documents'));
    disk.legacyFile = true;
    const app = appOn(disk);
    const move = app.moveRealmFilesToCacheDirectory as jest.Mock;
    move.mockRejectedValueOnce(new Error('EBUSY'));

    expect(await app.loadFromDisk()).toBe(true);
    expect(app.wallets.map(wallet => wallet.getLabel())).toEqual(['Only in Documents']);
    expect(disk.primary.has('data')).toBe(false); // nothing written by the load

    // The process restarts before any save and the move fails again: same copy, still nothing written.
    const restarted = appOn(disk);
    (restarted.moveRealmFilesToCacheDirectory as jest.Mock).mockRejectedValueOnce(new Error('EBUSY'));
    expect(await restarted.loadFromDisk()).toBe(true);
    expect(restarted.wallets.map(wallet => wallet.getLabel())).toEqual(['Only in Documents']);
    expect(disk.primary.has('data')).toBe(false);

    await app.saveToDisk(); // writes the store and the Caches backup, then the move is tried again
    expect(move.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(labelsIn(disk.primary.get('data')!)).toEqual(['Only in Documents']);
  });

  it('an empty Caches database does not shadow a valid Documents copy, whatever their dates', async () => {
    const disk = new StorageDouble();
    disk.readFault = { data: 'missing' };
    disk.backupFile = true; // exists, holds no data
    disk.legacy.set('data', plain('Older but real'));
    disk.legacyFile = true;
    const app = appOn(disk);
    expect(await app.loadFromDisk()).toBe(true);
    expect(app.wallets.map(wallet => wallet.getLabel())).toEqual(['Older but real']);
  });

  it('two different valid copies are offered for an explicit choice, and the other one is kept', async () => {
    const disk = new StorageDouble();
    disk.readFault = { data: 'missing' };
    disk.backup.set('data', plain('Caches copy'));
    disk.backupFile = true;
    disk.legacy.set('data', plain('Documents copy'));
    disk.legacyFile = true;
    const app = appOn(disk);

    const choices = await restoreChoices(app);
    expect(choices.map(choice => choice.savedAt)).toEqual([2000, 1000]);
    expect(new Set(choices.map(choice => choice.id)).size).toBe(2);
    expect(app.isSessionLoaded()).toBe(false);

    disk.readFault = {};
    expect(await app.loadFromDisk(undefined, { fromBackup: choices[1].id })).toBe(true);
    expect(app.wallets.map(wallet => wallet.getLabel())).toEqual(['Documents copy']);
    expect(labelsIn(disk.primary.get('data')!)).toEqual(['Documents copy']);
    expect(labelsIn(disk.backup.get('data')!)).toEqual(['Documents copy']);
    // The copy not chosen (Caches) was set aside before the backup was written over (third review).
    expect(disk.keptData().map(labelsIn)).toEqual([['Caches copy']]);
  });

  it('a bucket that opens but is damaged offers a different backup copy', async () => {
    const damaged = JSON.stringify([encryption.encrypt(JSON.stringify({ no: 'wallet list here' }), 'pw-pw-pw-pw')]);
    const good = JSON.stringify([encryption.encrypt(bucketJson([walletRecord(WORDS_A, 'From backup')]), 'pw-pw-pw-pw')]);
    const disk = new StorageDouble().seed({ data: good, data_encrypted: '1' });
    disk.primary.set('data', damaged);
    const app = appOn(disk);

    expect(await app.loadFromDisk('wrong-password')).toBe(false); // a wrong password is still just that
    const [copy] = await restoreChoices(app, 'pw-pw-pw-pw');
    expect(disk.primary.get('data')).toBe(damaged); // nothing written yet
    expect(await app.loadFromDisk('pw-pw-pw-pw', { fromBackup: copy.id })).toBe(true);
    expect(app.wallets.map(wallet => wallet.getLabel())).toEqual(['From backup']);
  });

  it('after a save the Documents copy is set aside and no longer offered for recovery', async () => {
    const disk = new StorageDouble().seed({ data: plain('Current'), data_encrypted: '' });
    disk.legacy.set('data', plain('Years old'));
    disk.legacyFile = true;
    const app = appOn(disk);
    await app.loadFromDisk();
    await app.saveToDisk();
    expect(disk.legacyFile).toBe(false);
    expect(labelsIn(disk.superseded.get('data')!)).toEqual(['Years old']);

    disk.readFault = { data: 'locked' };
    const error = await appOn(disk)
      .loadFromDisk()
      .catch(e => e);
    expect((error as StorageRecoverableError).choices).toHaveLength(1); // only the current Caches copy
  });

  it('"Start fresh" removes the older copies too; one that cannot be deleted yet goes on the next start', async () => {
    const disk = new StorageDouble().seed({ data: plain('Old'), data_encrypted: '' });
    disk.legacy.set('data', plain('Older'));
    disk.legacyFile = true;
    const app = appOn(disk);
    await app.loadFromDisk();

    // The deletion comes after the commit (fourth review): the reset is done and says what is left.
    disk.resetFault = { delete: new Error('EACCES') };
    expect(await app.resetStorage()).toEqual({ cleanupPending: true });
    expect(app.isSessionLoaded()).toBe(true);
    expect(app.wallets).toEqual([]);
    expect(disk.legacyFile).toBe(false); // renamed aside, never offered
    expect(disk.resetStash.size).toBe(1);
    expect(disk.log.indexOf('reset:set-aside')).toBeLessThan(disk.log.lastIndexOf('primary:data'));

    // The next start finishes it, before anything is read.
    disk.resetFault = {};
    const fresh = appOn(disk);
    expect(await fresh.loadFromDisk()).toBe(true);
    expect(fresh.wallets).toEqual([]);
    expect(disk.resetStash.size).toBe(0);
    expect(disk.legacy.size).toBe(0);
  });
});

describe('third review · the copy not chosen, a copy not read, the copy authorized', () => {
  const plain = (label: string) => bucketJson([walletRecord(WORDS_A, label)]);
  /** No secure store, and a different copy in each place. */
  const twoCopies = () => {
    const disk = new StorageDouble();
    disk.readFault = { data: 'missing' };
    disk.backup.set('data', plain('Only in Caches'));
    disk.backupFile = true;
    disk.legacy.set('data', plain('Only in Documents'));
    disk.legacyFile = true;
    return disk;
  };

  it.each([
    ['Caches', 0, 'Only in Caches', 'Only in Documents'],
    ['Documents', 1, 'Only in Documents', 'Only in Caches'],
  ] as const)('restoring the %s copy keeps the other one, also after a restart', async (_place, pick, chosen, other) => {
    const disk = twoCopies();
    const app = appOn(disk);
    const choices = await restoreChoices(app);
    disk.readFault = {};

    expect(await app.loadFromDisk(undefined, { fromBackup: choices[pick].id })).toBe(true);
    expect(labelsIn(disk.primary.get('data')!)).toEqual([chosen]);
    expect(labelsIn(disk.backup.get('data')!)).toEqual([chosen]);
    expect(disk.keptData().map(labelsIn)).toEqual([[other]]);

    // After a restart, if the store is ever unreadable again, both are offered.
    disk.readFault = { data: 'locked' };
    const restarted = appOn(disk);
    const offered = await restoreChoices(restarted);
    const contents = await Promise.all(offered.map(choice => restarted.readBackupForRestore(choice.id)));
    expect(contents.map(data => labelsIn((data as { json: string }).json)).sort()).toEqual([[chosen], [other]].sort());
  });

  it('a copy that cannot be set aside stops the restore before anything is written', async () => {
    const disk = twoCopies();
    const app = appOn(disk);
    const choices = await restoreChoices(app);
    disk.readFault = {};
    disk.setAsideFault = new Error('EROFS');

    await expect(app.loadFromDisk(undefined, { fromBackup: choices[1].id })).rejects.toThrow(StorageWriteError);
    expect(app.isSessionLoaded()).toBe(false);
    expect(disk.primary.has('data')).toBe(false);
    expect(labelsIn(disk.backup.get('data')!)).toEqual(['Only in Caches']);
    expect(labelsIn(disk.legacy.get('data')!)).toEqual(['Only in Documents']);
    expect(disk.log).toEqual([]);
  });

  it.each([
    ['Caches', 'cache', 'legacy', 'Only in Caches', 'Only in Documents'],
    ['Documents', 'legacy', 'cache', 'Only in Documents', 'Only in Caches'],
  ] as const)(
    'a %s copy that cannot be read today keeps the other one from opening on its own',
    async (_place, failing, readable, unreadLabel, readableLabel) => {
      const disk = twoCopies();
      disk.openFaultAt = { [failing]: new Error('Realm file is busy') };
      const app = appOn(disk);

      // Only one copy could be read, but another exists: no automatic open, nothing written.
      const choices = await restoreChoices(app);
      expect(choices).toHaveLength(1);
      expect(disk.log).toEqual([]);

      // The failure passes: the retry sees both and still lets the user choose.
      disk.openFaultAt = {};
      expect(await restoreChoices(appOn(disk))).toHaveLength(2);

      // If the user restores the readable copy while the other still fails, the unread file is set aside, not written over.
      disk.openFaultAt = { [failing]: new Error('Realm file is busy') };
      disk.readFault = {};
      expect(await app.loadFromDisk(undefined, { fromBackup: choices[0].id })).toBe(true);
      expect(labelsIn(disk.primary.get('data')!)).toEqual([readableLabel]);
      expect(disk.setAside).toContain(failing);
      expect(disk.setAside).not.toContain(readable);
      expect(disk.keptData().map(labelsIn)).toContainEqual([unreadLabel]);
    },
  );

  it('the restore opens only the content the user chose, or offers the copies again', async () => {
    const disk = twoCopies();
    const app = appOn(disk);
    const [cachesChoice, documentsChoice] = await restoreChoices(app);
    disk.readFault = {};

    // The chosen Caches file is gone between the choice and the restore: the same
    // position now names the Documents copy, which the user did not choose.
    disk.backup.clear();
    disk.backupFile = false;
    const gone = await app.loadFromDisk(undefined, { fromBackup: cachesChoice.id }).catch(e => e);
    expect(gone).toBeInstanceOf(StorageRecoverableError);
    expect((gone as StorageRecoverableError).choices.map(choice => choice.id)).toEqual([documentsChoice.id]);
    expect(disk.primary.has('data')).toBe(false);

    // The chosen content was replaced by another: refused as well.
    disk.backup.set('data', plain('Written later'));
    disk.backupFile = true;
    await expect(app.loadFromDisk(undefined, { fromBackup: cachesChoice.id })).rejects.toThrow(StorageRecoverableError);
    await expect(app.backupIsEncrypted(cachesChoice.id)).rejects.toThrow(StorageRecoverableError);
    expect(disk.primary.has('data')).toBe(false);
    expect(app.isSessionLoaded()).toBe(false);

    // The same content, wherever its file is now, is what was chosen: it opens.
    expect(await app.loadFromDisk(undefined, { fromBackup: documentsChoice.id })).toBe(true);
    expect(labelsIn(disk.primary.get('data')!)).toEqual(['Only in Documents']);
  });
});

describe('fourth review · a store that reads again, a reset that fails or is cut short', () => {
  const plain = (label: string) => bucketJson([walletRecord(WORDS_A, label)]);
  const sealed = (label: string, password: string) => JSON.stringify([encryption.encrypt(plain(label), password)]);

  it('a secure store that reads again while the user confirms is not replaced, and nothing is moved', async () => {
    const disk = new StorageDouble();
    disk.primary.set('data', plain('Newer, only in the store'));
    disk.backup.set('data', plain('Older backup'));
    disk.backupFile = true;
    disk.readFault = { data: 'locked' };
    const app = appOn(disk);
    const [copy] = await restoreChoices(app);

    disk.readFault = {}; // the keystore answers again before the user confirms
    await expect(app.loadFromDisk(undefined, { fromBackup: copy.id })).rejects.toThrow(StorageReadableAgainError);
    expect(app.isSessionLoaded()).toBe(false);
    expect(labelsIn(disk.primary.get('data')!)).toEqual(['Newer, only in the store']);
    expect(labelsIn(disk.backup.get('data')!)).toEqual(['Older backup']);
    expect(disk.setAside).toEqual([]);
    expect(disk.log).toEqual([]);

    // The ordinary unlock opens the store as it is.
    expect(await app.loadFromDisk()).toBe(true);
    expect(app.wallets.map(wallet => wallet.getLabel())).toEqual(['Newer, only in the store']);
  });

  it.each([
    ['the same password', 'pw-store'],
    ['another password', 'pw-backup'],
  ])('an encrypted store that reads again is not replaced by a backup restored with %s', async (_label, backupPassword) => {
    const disk = new StorageDouble();
    disk.primary.set('data', sealed('Newer, only in the store', 'pw-store'));
    disk.backup.set('data', sealed('Older backup', backupPassword));
    disk.backupFile = true;
    disk.readFault = { data: 'locked' };
    const app = appOn(disk);
    const [copy] = await restoreChoices(app, backupPassword);
    const stored = disk.primary.get('data');

    disk.readFault = {};
    await expect(app.loadFromDisk(backupPassword, { fromBackup: copy.id })).rejects.toThrow(StorageReadableAgainError);
    expect(disk.primary.get('data')).toBe(stored);
    expect(disk.log).toEqual([]);
    expect(await app.loadFromDisk('pw-store')).toBe(true); // its own password, as an ordinary unlock asks
    expect(app.wallets.map(wallet => wallet.getLabel())).toEqual(['Newer, only in the store']);
  });

  it('a store still unreadable at the confirmation is replaced as the user asked', async () => {
    const disk = new StorageDouble();
    disk.primary.set('data', plain('Lost'));
    disk.backup.set('data', plain('Backup'));
    disk.backupFile = true;
    disk.readFault = { data: 'locked' };
    const app = appOn(disk);
    const [copy] = await restoreChoices(app);
    expect(await app.loadFromDisk(undefined, { fromBackup: copy.id })).toBe(true);
    expect(labelsIn(disk.primary.get('data')!)).toEqual(['Backup']);
  });

  /** A secure store in the given state, and a different wallet in each Realm copy. */
  const realmOnlyWallets = (store: 'valid' | 'absent' | 'unreadable') => {
    const disk = new StorageDouble();
    if (store !== 'absent') disk.primary.set('data', plain('In the store'));
    if (store === 'unreadable') disk.readFault = { data: 'locked' };
    disk.backup.set('data', plain('Only in Caches'));
    disk.backupFile = true;
    disk.legacy.set('data', plain('Only in Documents'));
    disk.legacyFile = true;
    return disk;
  };
  /** What a start offers or opens: the wallets of the store, or the copies to choose from. */
  const afterRestart = async (disk: StorageDouble): Promise<string[]> => {
    const app = appOn(disk);
    const loaded = await app.loadFromDisk().then(
      ok => ok,
      (error: unknown) => error,
    );
    if (loaded === true) return app.wallets.map(wallet => wallet.getLabel());
    if (!(loaded instanceof StorageRecoverableError)) throw loaded;
    const copies = await Promise.all(loaded.choices.map(choice => app.readBackupForRestore(choice.id)));
    return copies.flatMap(copy => labelsIn((copy as { json: string }).json)).sort();
  };

  describe.each(['valid', 'absent', 'unreadable'] as const)('secure store %s', store => {
    const before = store === 'valid' ? ['In the store'] : ['Only in Caches', 'Only in Documents'];

    it('a reset whose commit fails is undone: a restart opens or offers what it did before', async () => {
      const disk = realmOnlyWallets(store);
      expect(await afterRestart(disk)).toEqual(before);
      const snapshot = { backup: new Map(disk.backup), legacy: new Map(disk.legacy) };

      disk.writeFault = { data: new Error('keystore full') };
      await expect(appOn(disk).resetStorage()).rejects.toThrow(StorageWriteError);
      expect(disk.resetStash.size).toBe(0);
      expect(disk.backup).toEqual(snapshot.backup);
      expect(disk.legacy).toEqual(snapshot.legacy);
      disk.writeFault = {};
      expect(await afterRestart(disk)).toEqual(before);
    });

    it('a reset cut short before its commit is settled on the next start; until then nothing opens empty', async () => {
      const disk = realmOnlyWallets(store);
      // The process dies after the copies were renamed aside: the commit fails and so does the undo.
      disk.writeFault = { data: new Error('process killed') };
      disk.resetFault = { undo: new Error('process killed') };
      await expect(appOn(disk).resetStorage()).rejects.toThrow(StorageWriteError);
      expect(disk.resetStash.size).toBe(1);
      disk.writeFault = {};

      // Starts while the files cannot be given back (fifth review, finding 1).
      for (let start = 0; start < 2; start++) {
        const app = appOn(disk);
        const loaded = await app.loadFromDisk().then(
          ok => ok,
          (error: unknown) => error,
        );
        if (store === 'valid') {
          expect(loaded).toBe(true); // the store itself is fine and opens
          expect(app.wallets.map(wallet => wallet.getLabel())).toEqual(['In the store']);
        } else {
          // Never an empty session, never a choice among an incomplete set of copies.
          expect(loaded).toBeInstanceOf(StorageUnavailableError);
          expect(loaded).not.toBeInstanceOf(StorageRecoverableError);
          expect(app.isSessionLoaded()).toBe(false);
          await expect(app.saveToDisk()).rejects.toThrow(StorageNotLoadedError);
        }
        expect(disk.primary.get('data') ?? null).toBe(store === 'absent' ? null : plain('In the store'));
      }
      expect(disk.resetStash.size).toBe(1);

      disk.resetFault = {};
      if (store === 'unreadable') {
        // While the store cannot be read, nobody can tell whether the reset happened: nothing is done.
        await expect(appOn(disk).loadFromDisk()).rejects.toThrow(StorageUnavailableError);
        expect(disk.resetStash.size).toBe(1);
        disk.readFault = {};
      }
      expect(await afterRestart(disk)).toEqual(store === 'absent' ? ['Only in Caches', 'Only in Documents'] : ['In the store']);
      expect(disk.resetStash.size).toBe(0);
      if (store === 'absent') {
        // The store is lost and no backup says the reset happened: the copies come back set aside,
        // offered by the recovery (above) and never opened on their own.
        expect(disk.keptData().map(labelsIn).sort()).toEqual([['Only in Caches'], ['Only in Documents']]);
        expect(disk.backupFile).toBe(false);
      } else {
        expect(labelsIn(disk.backup.get('data')!)).toEqual(['Only in Caches']);
        expect(labelsIn(disk.legacy.get('data')!)).toEqual(['Only in Documents']);
      }
    });

    it('a committed reset whose cleanup is cut short is finished on the next start', async () => {
      const disk = realmOnlyWallets(store);
      disk.resetFault = { delete: new Error('process killed') };
      expect(await appOn(disk).resetStorage()).toEqual({ cleanupPending: true });
      // The next start is cut short as well (or, with the keystore still locked, cannot tell yet).
      await appOn(disk)
        .loadFromDisk()
        .catch(() => undefined);
      expect(disk.resetStash.size).toBe(1);

      disk.resetFault = {};
      disk.readFault = {};
      expect(await afterRestart(disk)).toEqual([]);
      expect(disk.resetStash.size).toBe(0);
      // Deleted, not brought back: no old wallet is left in any copy.
      expect(disk.legacy.size).toBe(0);
      expect(disk.keptData()).toEqual([]);
      expect(labelsIn(disk.backup.get('data')!)).toEqual([]);
    });
  });

  it('an encrypted store learns after the unlock that its reset never happened, and gets its copies back', async () => {
    const disk = new StorageDouble().seed({ data: sealed('Sealed', 'pw-pw-pw'), data_encrypted: '1' });
    disk.legacy.set('data', plain('Only in Documents'));
    disk.legacyFile = true;
    disk.writeFault = { data: new Error('process killed') };
    disk.resetFault = { undo: new Error('process killed') };
    await expect(appOn(disk).resetStorage()).rejects.toThrow(StorageWriteError);
    disk.writeFault = {};
    disk.resetFault = {};

    const app = appOn(disk);
    expect(await app.storageIsEncrypted()).toBe(true);
    expect(disk.resetStash.size).toBe(1); // it cannot tell yet
    expect(await app.loadFromDisk('pw-pw-pw')).toBe(true);
    expect(app.wallets.map(wallet => wallet.getLabel())).toEqual(['Sealed']);
    expect(disk.resetStash.size).toBe(0);
    expect(labelsIn(disk.legacy.get('data')!)).toEqual(['Only in Documents']);
  });

  it('a start with no reset in progress renames or deletes nothing', async () => {
    const disk = realmOnlyWallets('valid');
    await appOn(disk).loadFromDisk();
    await appOn(disk).storageIsEncrypted();
    expect(disk.log.filter(entry => entry.startsWith('reset:') || entry.startsWith('history:'))).toEqual([]);
    expect(labelsIn(disk.legacy.get('data')!)).toEqual(['Only in Documents']);
  });
});

describe('fifth review · one decision about an interrupted reset', () => {
  const plain = (label: string) => bucketJson([walletRecord(WORDS_A, label)]);
  const sealed = (label: string, password: string) => JSON.stringify([encryption.encrypt(plain(label), password)]);
  const settle = async () => {
    for (let i = 0; i < 20; i++) await new Promise(resolve => setImmediate(resolve));
  };
  const withOldWallet = () => {
    const disk = new StorageDouble().seed({ data: plain('Before the reset'), data_encrypted: '' });
    disk.legacy.set('data', plain('Old Documents copy'));
    disk.legacyFile = true;
    return disk;
  };

  it('a query of the unlock screen waits for a reset in flight and cannot undo it (finding 2)', async () => {
    const disk = withOldWallet();
    const app = appOn(disk);
    await app.loadFromDisk();
    let release!: () => void;
    disk.writeGate = new Promise(resolve => (release = resolve));

    const reset = app.resetStorage(); // stops before writing the empty store, its files renamed aside
    await settle();
    expect(disk.resetStash.size).toBe(1);
    let answered = false;
    const query = app.storageIsEncrypted().then(value => {
      answered = true;
      return value;
    });
    await settle();
    expect(answered).toBe(false); // it waits for the reset
    expect(disk.resetStash.size).toBe(1); // and has given nothing back

    disk.backupWriteFault = new Error('Realm full'); // the empty backup cannot be written either
    disk.writeGate = null;
    release();
    expect(await reset).toEqual({ cleanupPending: false });
    expect(await query).toBe(false);
    expect(disk.resetStash.size).toBe(0);
    // No copy of the old wallet is left in the backup in use, or anywhere.
    expect(disk.backup.get('data')).toBeUndefined();
    expect(disk.legacy.size + disk.kept.size).toBe(0);
  });

  it('a store lost after a committed reset does not bring the deleted wallets back (finding 3)', async () => {
    const disk = withOldWallet();
    const app = appOn(disk);
    await app.loadFromDisk();
    disk.resetFault = { delete: new Error('EBUSY') };
    expect(await app.resetStorage()).toEqual({ cleanupPending: true });

    disk.primary.delete('data'); // the secure store is lost before the next start
    disk.resetFault = {};
    const restarted = appOn(disk);
    // The backup in use carries the reset's token: the reset happened, its files are deleted.
    expect(await restarted.loadFromDisk()).toBe(true);
    expect(restarted.wallets).toEqual([]);
    expect(disk.resetStash.size).toBe(0);
    expect(disk.legacy.size + disk.kept.size).toBe(0);
  });

  it('a store lost after a commit whose backup was not written keeps the copies, offered and never opened (finding 3)', async () => {
    const disk = withOldWallet();
    const app = appOn(disk);
    await app.loadFromDisk();
    disk.resetFault = { delete: new Error('EBUSY') };
    disk.backupWriteFault = new Error('Realm full');
    expect(await app.resetStorage()).toEqual({ cleanupPending: true });
    disk.primary.delete('data');
    disk.resetFault = {};
    disk.backupWriteFault = null;

    // Nothing on the device tells whether the reset happened: the copies are kept, set aside,
    // and the user decides. They are not opened on their own (documented limit).
    const offered = await restoreChoices(appOn(disk));
    expect(offered).toHaveLength(2);
    expect(disk.resetStash.size).toBe(0);
    expect(disk.keptData().map(labelsIn).sort()).toEqual([['Before the reset'], ['Old Documents copy']]);
  });

  it.each([
    ['without a password', (label: string) => plain(label), undefined],
    ['with another password', (label: string) => sealed(label, 'pw-other'), 'pw-other'],
    ['with the same password', (label: string) => sealed(label, 'pw-store'), 'pw-store'],
  ])('a store whose bucket opens damaged can be replaced by a valid backup %s (finding 4)', async (_label, backupData, backupPassword) => {
    const damaged = JSON.stringify([encryption.encrypt(JSON.stringify({ no: 'wallet list' }), 'pw-store')]);
    const disk = new StorageDouble();
    disk.primary.set('data', damaged);
    disk.backup.set('data', backupData('From backup'));
    disk.backupFile = true;
    const app = appOn(disk);
    const [copy] = await restoreChoices(app, 'pw-store');

    expect(await app.loadFromDisk(backupPassword, { fromBackup: copy.id })).toBe(true);
    expect(app.wallets.map(wallet => wallet.getLabel())).toEqual(['From backup']);
    expect(disk.primary.get('data')).not.toBe(damaged);
  });

  it('but not once the damaged store was replaced by another while the user chose (finding 4 keeps A)', async () => {
    const damaged = JSON.stringify([encryption.encrypt(JSON.stringify({ no: 'wallet list' }), 'pw-store')]);
    const disk = new StorageDouble();
    disk.primary.set('data', damaged);
    disk.backup.set('data', plain('From backup'));
    disk.backupFile = true;
    const app = appOn(disk);
    const [copy] = await restoreChoices(app, 'pw-store');

    disk.primary.set('data', plain('Written meanwhile'));
    await expect(app.loadFromDisk(undefined, { fromBackup: copy.id })).rejects.toThrow(StorageReadableAgainError);
    expect(labelsIn(disk.primary.get('data')!)).toEqual(['Written meanwhile']);
  });

  it('finishing a reset deletes only its own files, not a copy made after it (finding 5)', async () => {
    const disk = withOldWallet();
    const app = appOn(disk);
    await app.loadFromDisk();
    disk.resetFault = { delete: new Error('EBUSY') };
    expect(await app.resetStorage()).toEqual({ cleanupPending: true });

    // A wallet added after the reset; the next save meets a backup that does not open and sets it aside.
    const added = NeuraiHDWallet.forNetwork('mainnet', WORDS_B);
    added.setLabel('After the reset');
    app.wallets.push(added);
    await app.saveToDisk();
    disk.openFaultAt = { cache: new Error('Realm file decryption failed') };
    await app.saveToDisk();
    expect(disk.keptData().map(labelsIn)).toEqual([['After the reset']]);

    disk.resetFault = {};
    const restarted = appOn(disk);
    expect(await restarted.loadFromDisk()).toBe(true);
    expect(disk.resetStash.size).toBe(0); // the reset's own files are gone
    expect(disk.keptData().map(labelsIn)).toEqual([['After the reset']]); // the later copy is not
  });
});

describe('sixth review · a damaged bucket among others, an offer that expires, a token that cannot be read yet', () => {
  const plainOf = (words: string, label: string) => bucketJson([walletRecord(words, label)]);
  const seal = (json: string, password: string) => encryption.encrypt(json, password);
  const DAMAGED = JSON.stringify({ no: 'wallet list' });
  /** A legacy store of two buckets: the first damaged (pw-a), the second healthy (pw-b). */
  const twoBucketsOneDamaged = () => [seal(DAMAGED, 'pw-a'), seal(plainOf(WORDS_B, 'Second storage'), 'pw-b')];

  it.each([
    ['without a password', () => plainOf(WORDS_A, 'From backup'), undefined],
    ['with another password', () => JSON.stringify([seal(plainOf(WORDS_A, 'From backup'), 'pw-other')]), 'pw-other'],
  ])(
    'restoring a damaged bucket %s keeps the other bucket, and the original store (finding 1)',
    async (_label, backupData, backupPassword) => {
      const buckets = twoBucketsOneDamaged();
      const disk = new StorageDouble();
      disk.primary.set('data', JSON.stringify(buckets));
      disk.backup.set('data', backupData());
      disk.backupFile = true;
      const app = appOn(disk);
      const [copy] = await restoreChoices(app, 'pw-a');

      expect(await app.loadFromDisk(backupPassword, { fromBackup: copy.id })).toBe(true);
      expect(app.wallets.map(wallet => wallet.getLabel())).toEqual(['From backup']);
      const stored = JSON.parse(disk.primary.get('data')!);
      expect(stored).toHaveLength(2);
      expect(stored[1]).toBe(buckets[1]); // the healthy bucket, byte for byte

      // After a restart each password opens its own storage: the restored one under pw-a.
      const second = appOn(disk);
      expect(await second.loadFromDisk('pw-b')).toBe(true);
      expect(second.wallets.map(wallet => [wallet.getLabel(), wallet.getSecret()])).toEqual([['Second storage', WORDS_B]]);
      const first = appOn(disk);
      expect(await first.loadFromDisk('pw-a')).toBe(true);
      expect(first.wallets.map(wallet => wallet.getLabel())).toEqual(['From backup']);
      // The store as it was, encryption untouched, is kept aside.
      expect(disk.keptData()).toContain(JSON.stringify(buckets));
    },
  );

  it('a store that cannot be kept first is not replaced at all (finding 1)', async () => {
    const buckets = twoBucketsOneDamaged();
    const disk = new StorageDouble();
    disk.primary.set('data', JSON.stringify(buckets));
    disk.backup.set('data', plainOf(WORDS_A, 'From backup'));
    disk.backupFile = true;
    const app = appOn(disk);
    const [copy] = await restoreChoices(app, 'pw-a');
    disk.keepFault = new Error('Realm full');

    await expect(app.loadFromDisk(undefined, { fromBackup: copy.id })).rejects.toThrow(StorageWriteError);
    expect(app.isSessionLoaded()).toBe(false);
    expect(disk.primary.get('data')).toBe(JSON.stringify(buckets));
    expect(labelsIn(disk.backup.get('data')!)).toEqual(['From backup']);
    expect(disk.log).toEqual([]);
  });

  it('an offer made for a damaged store expires when the store changes, even to one the same password could open (finding 2)', async () => {
    const disk = new StorageDouble();
    disk.primary.set('data', JSON.stringify([seal(DAMAGED, 'pw-a')]));
    disk.backup.set('data', JSON.stringify([seal(plainOf(WORDS_A, 'From backup'), 'pw-backup')]));
    disk.backupFile = true;
    const app = appOn(disk);
    const [copy] = await restoreChoices(app, 'pw-a');

    // Before the confirmation, another store takes its place: a bucket the backup's password
    // opens damaged, next to a healthy one.
    const other = JSON.stringify([seal(DAMAGED, 'pw-backup'), seal(plainOf(WORDS_B, 'Healthy'), 'pw-x')]);
    disk.primary.set('data', other);
    const backupBefore = disk.backup.get('data');

    await expect(app.loadFromDisk('pw-backup', { fromBackup: copy.id })).rejects.toThrow(StorageReadableAgainError);
    expect(disk.primary.get('data')).toBe(other);
    expect(disk.backup.get('data')).toBe(backupBefore);
    expect(disk.setAside).toEqual([]);
    expect(disk.log).toEqual([]);
    // The ordinary unlock evaluates the new store, and offers again if it should.
    await expect(app.loadFromDisk('pw-backup')).rejects.toThrow(StorageRecoverableError);
  });

  /** A committed reset whose cleanup is pending, then the secure store lost. */
  const resetThenLostStore = async (encryptAfterReset?: string) => {
    const disk = new StorageDouble().seed({ data: plainOf(WORDS_A, 'Before the reset'), data_encrypted: '' });
    disk.legacy.set('data', plainOf(WORDS_A, 'Old Documents copy'));
    disk.legacyFile = true;
    const app = appOn(disk);
    await app.loadFromDisk();
    disk.resetFault = { delete: new Error('EBUSY') };
    expect(await app.resetStorage()).toEqual({ cleanupPending: true });
    if (encryptAfterReset) await app.encryptStorage(encryptAfterReset);
    disk.primary.delete('data');
    disk.resetFault = {};
    return disk;
  };
  const oldWalletOffered = async (disk: StorageDouble, error: unknown) => {
    if (!(error instanceof StorageRecoverableError)) return false;
    const app = appOn(disk);
    for (const choice of error.choices) {
      const data = await app.readBackupForRestore(choice.id);
      if (data.kind === 'plain' && /Before the reset|Old Documents copy/.test(JSON.stringify(labelsIn(data.json)))) return true;
    }
    return false;
  };

  it('a marked backup that cannot be read for a moment keeps the deleted wallets out of the selector (finding 3)', async () => {
    const disk = await resetThenLostStore();
    disk.openFaultAt = { cache: new Error('Realm file is busy') };

    for (let start = 0; start < 2; start++) {
      const error = await appOn(disk)
        .loadFromDisk()
        .catch(e => e);
      expect(error).toBeInstanceOf(StorageUnavailableError);
      expect(await oldWalletOffered(disk, error)).toBe(false);
      expect(disk.resetStash.size).toBe(1); // still tied to the reset, not given back
      expect(disk.kept.size).toBe(0);
    }

    disk.openFaultAt = {};
    const app = appOn(disk);
    expect(await app.loadFromDisk()).toBe(true); // the token is read: the reset happened
    expect(app.wallets).toEqual([]);
    expect(disk.resetStash.size + disk.kept.size + disk.legacy.size).toBe(0);
  });

  it('a marked backup that is encrypted is offered alone, and opening it settles the reset (finding 3)', async () => {
    const disk = await resetThenLostStore('pw-new');
    const app = appOn(disk);
    const error = await app.loadFromDisk().catch(e => e);
    expect(error).toBeInstanceOf(StorageRecoverableError);
    expect((error as StorageRecoverableError).choices).toHaveLength(1);
    expect(await app.backupIsEncrypted((error as StorageRecoverableError).choices[0].id)).toBe(true);
    expect(disk.resetStash.size).toBe(1);

    expect(await app.loadFromDisk('pw-new', { fromBackup: (error as StorageRecoverableError).choices[0].id })).toBe(true);
    expect(app.wallets).toEqual([]);
    expect(disk.resetStash.size + disk.kept.size + disk.legacy.size).toBe(0); // deleted, never offered
  });

  it('the correct password recovers a valid backup hidden by a failed reset; a wrong one keeps it locked (finding 4)', async () => {
    const disk = new StorageDouble();
    disk.primary.set('data', JSON.stringify([seal(DAMAGED, 'pw')]));
    disk.backup.set('data', plainOf(WORDS_A, 'Valid backup'));
    disk.backupFile = true;
    expect(await restoreChoices(appOn(disk), 'pw')).toHaveLength(1);

    // "Start fresh" fails, and so does giving the backup back.
    disk.writeFault = { data: new Error('keystore full') };
    disk.resetFault = { undo: new Error('EBUSY') };
    await expect(appOn(disk).resetStorage()).rejects.toThrow(StorageWriteError);
    disk.writeFault = {};
    disk.resetFault = {};
    expect(disk.resetStash.size).toBe(1);

    for (let start = 0; start < 2; start++) {
      const app = appOn(disk);
      expect(await app.storageIsEncrypted()).toBe(true);
      expect(await app.loadFromDisk('wrong')).toBe(false); // a wrong password changes nothing
      const choices = await restoreChoices(app, 'pw');
      const offered = await Promise.all(choices.map(choice => app.readBackupForRestore(choice.id)));
      expect(offered.some(data => data.kind === 'plain' && labelsIn(data.json)[0] === 'Valid backup')).toBe(true);
      if (start === 1) {
        const valid = choices[offered.findIndex(data => data.kind === 'plain' && labelsIn(data.json)[0] === 'Valid backup')];
        expect(await app.loadFromDisk(undefined, { fromBackup: valid.id })).toBe(true);
        expect(app.wallets.map(wallet => wallet.getLabel())).toEqual(['Valid backup']);
      }
    }
    // Restored without another reset, under the store's password.
    const again = appOn(disk);
    expect(await again.loadFromDisk('pw')).toBe(true);
    expect(again.wallets.map(wallet => wallet.getLabel())).toEqual(['Valid backup']);
  });
});

describe('seventh review · a partial repair keeps the source, retries keep one copy, the scope stays', () => {
  const WORDS_C = 'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong';
  const plainOf = (words: string, label: string) => bucketJson([walletRecord(words, label)]);
  const seal = (json: string, password: string) => encryption.encrypt(json, password);
  const DAMAGED = JSON.stringify({ no: 'wallet list' });
  /** Store: a damaged bucket (pw-a) and a healthy one (pw-b). Backup in use: the repair (pw-r) and a wallet only it has (pw-y). */
  const setup = () => {
    const store = [seal(DAMAGED, 'pw-a'), seal(plainOf(WORDS_B, 'Second storage'), 'pw-b')];
    const backup = JSON.stringify([seal(plainOf(WORDS_A, 'For the repair'), 'pw-r'), seal(plainOf(WORDS_C, 'Only in the backup'), 'pw-y')]);
    const disk = new StorageDouble();
    disk.primary.set('data', JSON.stringify(store));
    disk.backup.set('data', backup);
    disk.backupFile = true;
    return { disk, store, backup };
  };

  it('repairing a bucket from a copy with several keeps that copy whole; its own wallet comes back with its password (finding 1)', async () => {
    const { disk, store, backup } = setup();
    const app = appOn(disk);
    const [copy] = await restoreChoices(app, 'pw-a');
    expect(await app.loadFromDisk('pw-r', { fromBackup: copy.id })).toBe(true);

    // Destination: both of its passwords open what they should.
    const repaired = appOn(disk);
    expect(await repaired.loadFromDisk('pw-a')).toBe(true);
    expect(repaired.wallets.map(wallet => wallet.getLabel())).toEqual(['For the repair']);
    const healthy = appOn(disk);
    expect(await healthy.loadFromDisk('pw-b')).toBe(true);
    expect(healthy.wallets.map(wallet => wallet.getSecret())).toEqual([WORDS_B]);
    expect(JSON.parse(disk.primary.get('data')!)[1]).toBe(store[1]);

    // Source: kept whole, bytes untouched.
    expect(disk.keptData()).toContain(backup);

    // After a restart with the store unreadable, the copy is offered and its own password opens its own wallet.
    disk.readFault = { data: 'locked' };
    const restarted = appOn(disk);
    const offered = await restoreChoices(restarted);
    const sourceChoice = offered.find(choice => choice.id === copy.id);
    expect(sourceChoice).toBeDefined();
    expect(await restarted.loadFromDisk('pw-y', { fromBackup: sourceChoice!.id })).toBe(true);
    expect(restarted.wallets.map(wallet => [wallet.getLabel(), wallet.getSecret()])).toEqual([['Only in the backup', WORDS_C]]);
  });

  it('if the source cannot be kept, neither the store nor the source changes (finding 1)', async () => {
    const { disk, store, backup } = setup();
    const app = appOn(disk);
    const [copy] = await restoreChoices(app, 'pw-a');
    disk.setAsideFault = new Error('EROFS');
    await expect(app.loadFromDisk('pw-r', { fromBackup: copy.id })).rejects.toThrow(StorageWriteError);
    expect(disk.primary.get('data')).toBe(JSON.stringify(store));
    expect(disk.backup.get('data')).toBe(backup);
    expect(disk.log.filter(entry => entry.startsWith('primary:') || entry.startsWith('backup:'))).toEqual([]);
  });

  it('a copy with one bucket is carried whole, so it is not set aside', async () => {
    const disk = new StorageDouble();
    disk.primary.set('data', JSON.stringify([seal(DAMAGED, 'pw-a')]));
    disk.backup.set('data', JSON.stringify([seal(plainOf(WORDS_A, 'For the repair'), 'pw-r')]));
    disk.backupFile = true;
    const app = appOn(disk);
    const [copy] = await restoreChoices(app, 'pw-a');
    expect(await app.loadFromDisk('pw-r', { fromBackup: copy.id })).toBe(true);
    expect(disk.setAside).toEqual([]);
  });

  it('failed attempts keep one copy of the store, not one per attempt (finding 2)', async () => {
    const { disk, store } = setup();
    const app = appOn(disk);
    const [copy] = await restoreChoices(app, 'pw-a');
    disk.writeFault = { data: new Error('keystore full') };
    for (let attempt = 0; attempt < 3; attempt++) {
      await expect(app.loadFromDisk('pw-r', { fromBackup: copy.id })).rejects.toThrow(StorageWriteError);
    }
    disk.writeFault = {};
    expect(await app.loadFromDisk('pw-r', { fromBackup: copy.id })).toBe(true);
    expect(disk.keptData().filter(data => data === JSON.stringify(store))).toHaveLength(1);
    expect(disk.kept.size).toBe(2); // the store as it was, and the source copy
  });

  it('copies offered again for a standing damaged-bucket offer keep its scope (finding 3)', async () => {
    const { disk, store } = setup();
    const app = appOn(disk);
    const [copy] = await restoreChoices(app, 'pw-a');
    disk.backup.set('data', JSON.stringify([seal(plainOf(WORDS_A, 'Written later'), 'pw-r')]));

    const changed = await app.loadFromDisk('pw-r', { fromBackup: copy.id }).catch(e => e);
    expect(changed).toBeInstanceOf(StorageRecoverableError);
    expect((changed as StorageRecoverableError).scope).toBe('bucket');
    const [again] = (changed as StorageRecoverableError).choices;
    expect(await app.loadFromDisk('pw-r', { fromBackup: again.id })).toBe(true);
    expect(JSON.parse(disk.primary.get('data')!)[1]).toBe(store[1]); // still a bucket repair
  });
});
