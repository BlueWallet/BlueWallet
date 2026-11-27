import { encodeWalletAmounts } from '../blue_modules/neurai/walletAmountsCodec';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import Keychain from 'react-native-keychain';
import RNSecureKeyStore, { ACCESSIBLE } from 'react-native-secure-key-store';
import Realm from 'realm';
import { sha256 } from '@noble/hashes/sha256';

import * as encryption from '../blue_modules/encryption';
import { randomBytes } from './rng';
import { NeuraiHDWallet } from './wallets/neurai-hd-wallet';
import { NeuraiPQWallet } from './wallets/neurai-pq-wallet';
import { NeuraiECDSAWallet } from './wallets/neurai-ecdsa-wallet';
import { NeuraiHardwareWallet } from './wallets/neurai-hardware-wallet';
import { ExtendedTransaction, Transaction, TWallet } from './wallets/types';
import { hexToUint8Array, uint8ArrayToHex } from '../blue_modules/uint8array-extras';
import { isTestnetChain, type NeuraiChainType } from '../blue_modules/neurai/networkConfig';
import { purgeStaleTestnetStorage } from '../blue_modules/neurai/testnetReset';
import { migrateWalletReferences } from '../blue_modules/neurai/walletIdMigration';
import {
  OtherEncryptedBucketsError,
  PasswordInUseError,
  StorageCorruptError,
  StorageNotLoadedError,
  StorageReadableAgainError,
  StorageRecoverableError,
  StorageUnavailableError,
  type RestoreChoice,
  StorageWriteError,
  isMissingKeyError,
} from './storage-errors';

export type TTXMetadata = {
  [txid: string]: {
    memo?: string;
  };
};

export type TCounterpartyMetadata = {
  /**
   * our contact identifier, such as bip47 payment code
   */
  [counterparty: string]: {
    /**
     * custom human-readable name we assign ourselves
     */
    label: string;
    /**
     * some counterparties cannot be deleted because they sent a notif tx onchain, so we just mark them as hidden when user deletes
     */
    hidden?: boolean;
  };
};

type TBucketStorage = {
  wallets: string[]; // array of serialized wallets, not actual wallet objects
  tx_metadata: TTXMetadata;
  counterparty_metadata: TCounterpartyMetadata;
};

/**
 * What `data` holds. The shape decides, not the `data_encrypted` flag: data
 * and flag are two writes, and an interruption between them used to make an
 * encrypted array look like a plain store (H04/H07). The flag is still
 * written so an older version can open the same storage.
 */
export type StoredData = { kind: 'absent' } | { kind: 'plain'; json: string } | { kind: 'encrypted'; buckets: string[] };

/**
 * A stored wallet record this version cannot turn into a wallet: unknown type
 * (another version, or a pre-fork Bitcoin wallet), a record that fails to
 * parse, or a second copy of a wallet already loaded. It is written back
 * byte for byte so a save never deletes what a load could not read (H29).
 */
export type PreservedRecord = {
  raw: string;
  reason: 'unknown-type' | 'unreadable' | 'duplicate';
  /** For duplicates: the ID of the wallet it repeats, so deleting that wallet removes it too. */
  id?: string;
};

/**
 * A save that changes how the store is protected. `upgrade` rewrites the
 * bucket this session opened in the `nw2:` format (H08), under `password`
 * (the session's own or a new one); every other bucket is kept byte for byte.
 */
type Transition = { kind: 'encrypt'; password: string } | { kind: 'decrypt' } | { kind: 'upgrade'; password: string };

/** The format a new encrypted store is written in: `nw2:` where the native module exists. */
const newBucketFormat = (): encryption.BucketFormat => (encryption.strongEncryptionAvailable() ? 'nw2' : 'cryptojs');

const WALLET_CLASSES: Record<string, { fromJson(json: string): unknown }> = {
  [NeuraiHDWallet.type]: NeuraiHDWallet,
  [NeuraiECDSAWallet.type]: NeuraiECDSAWallet,
  [NeuraiPQWallet.type]: NeuraiPQWallet,
  [NeuraiHardwareWallet.type]: NeuraiHardwareWallet,
};

const EMPTY_BUCKET_JSON = JSON.stringify({ wallets: [], tx_metadata: {}, counterparty_metadata: {} });

const isReactNative = typeof navigator !== 'undefined' && navigator?.product === 'ReactNative';

/**
 * Parses `data` into its kind. Only a missing value is absent: an empty string
 * is a value with no valid shape, and treating it as a new install let the
 * next save replace a valid backup (H04). Throws `StorageCorruptError`.
 */
export function parseStoredData(raw: string | null | undefined): StoredData {
  if (raw === null || raw === undefined) return { kind: 'absent' };
  if (raw === '') throw new StorageCorruptError('stored data is an empty string');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new StorageCorruptError('stored data is not JSON');
  }
  if (Array.isArray(parsed)) {
    if (parsed.length === 0 || !parsed.every(bucket => typeof bucket === 'string' && bucket.length > 0)) {
      throw new StorageCorruptError('encrypted storage has no valid buckets');
    }
    return { kind: 'encrypted', buckets: parsed };
  }
  if (parsed && typeof parsed === 'object' && Array.isArray((parsed as TBucketStorage).wallets)) return { kind: 'plain', json: raw };
  throw new StorageCorruptError('stored data has an unknown shape');
}

/** One stored copy of `data` (secure store or Realm backup), classified. */
type StoredCopy =
  | { state: 'ok'; data: Exclude<StoredData, { kind: 'absent' }> }
  | { state: 'absent' }
  | { state: 'invalid'; reason: string }
  | { state: 'error'; reason: string };

/** A readable backup copy. `id` names its content: equal content, equal id, wherever the file is. */
type BackupOption = { path: string; data: Exclude<StoredData, { kind: 'absent' }>; savedAt?: number; id: string };

/** Every backup file found, read or not: what a restore must not write over without setting it aside. */
type BackupFile = { path: string; copy: StoredCopy; kept: boolean; raw?: unknown };

/**
 * The backup copies, without duplicates. `unresolved` lists files that exist
 * but could not be read or hold no valid store today: while there are any,
 * the readable copies are not the whole picture (third review).
 */
type BackupState =
  | { state: 'absent' }
  | { state: 'error'; reason: string }
  | { state: 'ok'; options: BackupOption[]; unresolved: string[]; files: BackupFile[] };

/** Names a stored value by its content, so a restore can check it opens what the user chose. */
export function storedDataId(data: Exclude<StoredData, { kind: 'absent' }>): string {
  return uint8ArrayToHex(sha256(JSON.stringify(data))).slice(0, 32);
}

/** A copy set aside instead of being written over: `keyvalue.realm.kept-<time>`, next to the original. */
const KEPT_BACKUP = /^keyvalue\.realm\.kept-\d+$/;

/**
 * "Start fresh" renames every wallet backup file to `<name>.reset-<token>`
 * before its commit, and writes the token into the empty store it commits
 * (`storageReset`). The token in the store (or in the backup it writes next)
 * is what tells, after a failure or a restart, whether those files belong to
 * a reset that happened (delete them) or one that did not (give them back)
 * (fourth and fifth reviews).
 */
const RESET_FIELD = 'storageReset';

/**
 * The wallet-backup files this app owns, by full name: the backup
 * (`keyvalue.realm`), copies set aside (`.kept-N`), superseded and stale
 * copies, the side files Realm keeps beside each (`.lock`, `.note`,
 * `.management`), under any number of reset suffixes. Nothing else is ever
 * renamed or deleted by a reset, whatever its suffix (fifth review).
 */
const OWN_BACKUP_FILE =
  /^(keyvalue\.realm(?:\.(?:kept-\d+|superseded(?:-\d+)?|stale-[^.]+))?)(\.(?:lock|note|management))?((?:\.reset-\d+)*)$/;

type OwnBackupFile = { stem: string; side: boolean; tokens: string[] };

function parseOwnBackupFile(name: string): OwnBackupFile | null {
  const match = OWN_BACKUP_FILE.exec(name);
  if (!match) return null;
  return { stem: match[1], side: Boolean(match[2]), tokens: match[3] ? match[3].split('.reset-').slice(1) : [] };
}

/**
 * Older wallet copies kept on the device, by file name and place: copies a
 * restore set aside, the Documents copy of older versions and those it was
 * renamed to. Not the backup in use (Caches `keyvalue.realm`), Realm's side
 * files, nor files of a reset, which are deleted or given back on their own.
 * An encryption upgrade does not rewrite them (H08).
 */
export function olderBackupCopies(listing: ReadonlyArray<{ place: 'documents' | 'caches'; name: string }>): string[] {
  return listing
    .filter(({ place, name }) => {
      const own = parseOwnBackupFile(name);
      return !!own && !own.side && own.tokens.length === 0 && !(place === 'caches' && own.stem === 'keyvalue.realm');
    })
    .map(({ name }) => name);
}

/** The reset a plain store was committed by, if any. */
function resetTokenOf(json: string): string | null {
  try {
    const token = JSON.parse(json)?.[RESET_FIELD];
    return typeof token === 'string' ? token : null;
  } catch {
    return null;
  }
}

function classifyCopy(raw: unknown): StoredCopy {
  if (raw === null || raw === undefined) return { state: 'absent' };
  if (typeof raw !== 'string') return { state: 'invalid', reason: 'stored data is not a string' };
  try {
    const data = parseStoredData(raw);
    return data.kind === 'absent' ? { state: 'absent' } : { state: 'ok', data };
  } catch (error: any) {
    return { state: 'invalid', reason: error?.message ?? String(error) };
  }
}

/** Whether a bucket's plaintext is a store this version can open: JSON with a wallet list. */
function isWalletBucket(json: string): boolean {
  try {
    const parsed = JSON.parse(json);
    return !!parsed && typeof parsed === 'object' && Array.isArray(parsed.wallets);
  } catch {
    return false;
  }
}

/** Tries each encrypted bucket with `password`. Pure: it does not touch any session state (H05). */
export function openEncryptedBucket(
  buckets: readonly string[],
  password: string,
): { plaintext: string; index: number; key: encryption.BucketKey | null } | null {
  for (let index = 0; index < buckets.length; index++) {
    const opened = encryption.openBucket(buckets[index], password);
    if (opened) return { plaintext: opened.plaintext, index, key: opened.key };
  }
  return null;
}

export class BlueApp {
  static FLAG_ENCRYPTED = 'data_encrypted';
  static HANDOFF_STORAGE_KEY = 'HandOff';

  private static _instance: BlueApp | null = null;
  private static diskWrites: Promise<void> = Promise.resolve();
  private savePromise?: Promise<void>;
  private saveRequested = false;

  static keys2migrate = [BlueApp.HANDOFF_STORAGE_KEY];

  public cachedPassword?: false | string;
  public tx_metadata: TTXMetadata;
  public counterparty_metadata: TCounterpartyMetadata;
  public wallets: TWallet[];

  /**
   * True once `loadFromDisk` produced a complete session, including a
   * verified empty install, or after an explicit reset. Until then nothing is
   * written: a session built from a failed read must never replace the
   * stored wallets (H04).
   */
  private sessionLoaded = false;
  /** Encrypted bucket this session opened; null for plain storage. Per instance, set only by a complete load (H05). */
  private bucketIndex: number | null = null;
  /**
   * The key of the session's `nw2:` bucket (H08), derived once at the unlock
   * or the write that made it, so saves need no new derivation. Null for a
   * CryptoJS or plain store; dropped with the password.
   */
  private bucketKey: encryption.BucketKey | null = null;
  private preservedRecords: PreservedRecord[] = [];
  /** Top-level bucket fields this version does not know, kept for newer versions. */
  private bucketExtras: Record<string, unknown> = {};
  private transition: Transition | null = null;
  /**
   * What this session last read or wrote. Writes build on it when the secure
   * store has no `data` key (a session opened from the backup), instead of
   * failing or dropping the other buckets.
   */
  private loadedData: StoredData = { kind: 'absent' };
  /** Set by an explicit restore: the next write replaces an unreadable secure store with the backup's buckets. */
  private restoringFromBackup = false;
  /**
   * The encrypted store whose bucket the user's password opened damaged in
   * this session: its content id, that password and the bucket. A restore
   * offered for it replaces that bucket only, and only while the store is
   * still exactly that content (fifth and sixth reviews).
   */
  private damaged: { id: string; password: string; index: number } | null = null;
  private realmFilesMigrated: Promise<void> | null = null;
  /** The primary store holds the last save but the Realm backup could not be written. Cleared by the next good backup. */
  public backupDegraded = false;
  /** The legacy `data_encrypted` flag could not be written. Only older versions read it; every save writes it again. */
  public flagStale = false;

  constructor() {
    this.wallets = [];
    this.tx_metadata = {};
    this.counterparty_metadata = {};
    this.cachedPassword = false;
  }

  static getInstance(): BlueApp {
    if (!BlueApp._instance) {
      BlueApp._instance = new BlueApp();
    }

    return BlueApp._instance;
  }

  isSessionLoaded(): boolean {
    return this.sessionLoaded;
  }

  /** Stored records kept unopened, for diagnostics and the unlock notice. */
  getPreservedRecords(): readonly PreservedRecord[] {
    return this.preservedRecords;
  }

  async migrateKeys() {
    // do not migrate keys if we are not in RN env
    if (!isReactNative) {
      return;
    }

    for (const key of BlueApp.keys2migrate) {
      try {
        const value = await RNSecureKeyStore.get(key);
        if (value) {
          await AsyncStorage.setItem(key, value);
          await RNSecureKeyStore.remove(key);
        }
      } catch (_) {}
    }
  }

  /**
   * Wrapper for storage call. Secure store works only in RN environment. AsyncStorage is
   * used for cli/tests
   */
  setItem = (key: string, value: any): Promise<any> => {
    if (isReactNative) {
      return RNSecureKeyStore.set(key, value, { accessible: ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    } else {
      return AsyncStorage.setItem(key, value);
    }
  };

  /**
   * Wrapper for storage call. Secure store works only in RN environment. AsyncStorage is
   * used for cli/tests
   */
  getItem = (key: string): Promise<any> => {
    if (isReactNative) {
      return RNSecureKeyStore.get(key);
    } else {
      return AsyncStorage.getItem(key);
    }
  };

  /** The secure-store copy. A missing key (code 404 on device, null in tests) is absent; any other failure is an error. */
  private async readPrimaryCopy(): Promise<StoredCopy> {
    try {
      return classifyCopy(await this.getItem('data'));
    } catch (error: any) {
      return isMissingKeyError(error) ? { state: 'absent' } : { state: 'error', reason: error?.message ?? String(error) };
    }
  }

  /**
   * Every backup copy of `data`: the Realm file in Caches (the one in use),
   * one older versions left in Documents, and copies a restore set aside
   * (`keyvalue.realm.kept-*`). All are read directly, by content, so neither a
   * failed move nor a file date can hide a real copy (H32, second review).
   * Never creates a database: a missing file is an absent copy.
   */
  private async readBackupState(): Promise<BackupState> {
    await this.migrateRealmFilesOnce();
    const files: BackupFile[] = [];
    try {
      const places = [BlueApp.realmKeyValuePath(), BlueApp.legacyRealmKeyValuePath()];
      for (const path of places) {
        if (await this.backupFileExists(path)) {
          const { raw, ...copy } = await this.readBackupAt(path);
          files.push({ path, copy: copy as StoredCopy, kept: false, raw });
        }
      }
      for (const path of await this.listKeptBackups()) {
        const { raw, ...copy } = await this.readBackupAt(path);
        files.push({ path, copy: copy as StoredCopy, kept: true, raw });
      }
    } catch (error: any) {
      // Not knowing which files exist is not knowing what there is to lose.
      return { state: 'error', reason: error?.message ?? String(error) };
    }
    const options: BackupOption[] = [];
    const unresolved: string[] = [];
    for (const { path, copy } of files) {
      if (copy.state === 'error' || copy.state === 'invalid') unresolved.push(path);
      if (copy.state !== 'ok') continue;
      const id = storedDataId(copy.data);
      if (options.some(option => option.id === id)) continue;
      options.push({ path, data: copy.data, savedAt: await this.backupSavedAt(path), id });
    }
    if (options.length) return { state: 'ok', options, unresolved, files };
    const broken = files.find(({ copy }) => copy.state === 'error' || copy.state === 'invalid');
    if (broken) return { state: 'error', reason: (broken.copy as { reason: string }).reason };
    return { state: 'absent' };
  }

  private async readBackupAt(path: string): Promise<StoredCopy & { raw?: unknown }> {
    try {
      const realm = await this.openRealmKeyValue(path);
      try {
        // Untyped schema: Realm cannot infer the object type here.
        const obj: { value?: unknown } | null | undefined = (realm as any).objectForPrimaryKey('KeyValue', 'data');
        return { ...classifyCopy(obj?.value), raw: obj?.value };
      } finally {
        realm.close();
      }
    } catch (error: any) {
      return { state: 'error', reason: error?.message ?? String(error) };
    }
  }

  async backupFileExists(path: string = BlueApp.realmKeyValuePath()): Promise<boolean> {
    return RNFS.exists(path);
  }

  /** When a backup file was last written, to tell two copies apart in the restore screen. */
  async backupSavedAt(path: string): Promise<number | undefined> {
    try {
      return new Date((await RNFS.stat(path)).mtime).getTime();
    } catch {
      return undefined;
    }
  }

  /** Whether the device keeps older wallet copies an encryption upgrade leaves as they are (`olderBackupCopies`). */
  hasOlderBackupCopies = async (): Promise<boolean> => {
    try {
      const [documents, caches] = BlueApp.backupDirs();
      const listing: Array<{ place: 'documents' | 'caches'; name: string }> = [];
      for (const [place, dir] of [
        ['documents', documents],
        ['caches', caches],
      ] as const) {
        if (!(await RNFS.exists(dir))) continue;
        for (const file of await RNFS.readDir(dir)) listing.push({ place, name: file.name });
      }
      return olderBackupCopies(listing).length > 0;
    } catch (error: any) {
      console.warn('listing older backup copies failed:', error?.message);
      return false;
    }
  };

  /** Copies a restore set aside, in Caches and in Documents (oldest first). */
  async listKeptBackups(): Promise<string[]> {
    const kept: string[] = [];
    for (const path of [BlueApp.realmKeyValuePath(), BlueApp.legacyRealmKeyValuePath()]) {
      const dir = path.slice(0, path.lastIndexOf('/'));
      if (!(await RNFS.exists(dir))) continue;
      for (const file of await RNFS.readDir(dir)) {
        if (KEPT_BACKUP.test(file.name)) kept.push(`${dir}/${file.name}`);
      }
    }
    return kept.sort();
  }

  /**
   * Renames a backup file to `<name>.kept-<time>` in its own directory, so a
   * restore can write the backup without losing what this file held. Throws
   * if the file could not be renamed: the restore must not go on then.
   */
  async setAsideBackup(path: string): Promise<void> {
    let target = `${path}.kept-${Date.now()}`;
    for (let n = 1; await RNFS.exists(target); n++) target = `${path}.kept-${Date.now() + n}`;
    await RNFS.moveFile(path, target);
    if (await RNFS.exists(path)) throw new StorageWriteError(`the backup at ${path} could not be set aside`);
  }

  private static choicesOf(backup: Extract<BackupState, { state: 'ok' }>): RestoreChoice[] {
    return backup.options.map(option => ({ id: option.id, savedAt: option.savedAt }));
  }

  /**
   * What to open, decided from both copies (H03/H04):
   * - the secure store, when it holds valid data;
   * - the backup, when the secure store has no `data` key at all, there is
   *   one backup copy and every backup file could be read: nothing else
   *   exists anywhere;
   * - nothing (a new install), only when every copy is verifiably absent.
   * A secure store that fails or holds an invalid value is never silently
   * replaced by a backup, which may be older, and two backup copies that
   * differ are never chosen between by the app: that raises
   * `StorageRecoverableError` and the user chooses what to restore.
   */
  async readStoredData(): Promise<StoredData> {
    // One turn of the disk writer: an interrupted reset is settled, and the
    // copies read, with no reset or restore moving files in between (fifth review).
    return this.exclusive(() => this.readStoredDataNow());
  }

  private async readStoredDataNow(): Promise<StoredData> {
    const { unsettled } = await this.settlePendingResets();
    const primary = await this.readPrimaryCopy();
    if (primary.state === 'ok') return primary.data;
    // Files of a reset nobody can tell about yet: the copies seen now are not
    // the whole picture, so nothing is declared empty or offered (fifth review).
    // The one exception is an encrypted backup in use: it may carry the
    // reset's token, and opening it with its password is how to tell (sixth review).
    if (unsettled) {
      const active = await this.activeBackupEvidence();
      if (active.copy.state === 'ok' && active.copy.data.kind === 'encrypted') {
        const choice = { id: storedDataId(active.copy.data), savedAt: await this.backupSavedAt(BlueApp.realmKeyValuePath()) };
        throw new StorageRecoverableError('an interrupted reset is settled by opening the backup in use', [choice]);
      }
      throw new StorageUnavailableError('files of an interrupted reset are not settled yet');
    }
    const backup = await this.readBackupState();
    if (primary.state === 'absent') {
      // A copy the app set aside is only ever opened by the user's choice.
      const onlyCopyIsKept = backup.state === 'ok' && backup.files.some(file => file.kept && file.path === backup.options[0].path);
      if (backup.state === 'ok' && backup.options.length === 1 && backup.unresolved.length === 0 && !onlyCopyIsKept) {
        console.warn('the secure store has no wallet data; opening the Realm backup');
        return backup.options[0].data;
      }
      // Several copies, or one readable next to one that could not be read
      // today: the app does not pick, the user does (third review).
      if (backup.state === 'ok') {
        const reason = backup.options.length > 1 ? 'the backup copies differ' : 'another backup copy cannot be read';
        throw new StorageRecoverableError(reason, BlueApp.choicesOf(backup));
      }
      if (backup.state === 'absent') return { kind: 'absent' };
      throw new StorageUnavailableError(`the secure store has no wallet data and the backup cannot be read (${backup.reason})`);
    }
    console.warn('the secure store copy is not usable:', primary.reason);
    if (backup.state === 'ok') throw new StorageRecoverableError(primary.reason, BlueApp.choicesOf(backup));
    if (primary.state === 'invalid') throw new StorageCorruptError(primary.reason);
    throw new StorageUnavailableError(primary.reason);
  }

  /**
   * The backup copy whose content is `id`, read now. When that content is no
   * longer in any backup file, the restore stops and the copies there are now
   * are offered again: the user chose, and authorized, that content only.
   */
  private async chosenBackup(id: string): Promise<{ option: BackupOption; backup: Extract<BackupState, { state: 'ok' }> }> {
    const backup = await this.readBackupState();
    const option = backup.state === 'ok' ? backup.options.find(candidate => candidate.id === id) : undefined;
    if (option && backup.state === 'ok') return { option, backup };
    // The copies are offered again for the same operation: a standing offer for
    // a damaged bucket still repairs that bucket only (seventh review).
    if (backup.state === 'ok') {
      throw new StorageRecoverableError('the chosen backup copy changed', BlueApp.choicesOf(backup), this.damaged ? 'bucket' : 'store');
    }
    throw new StorageUnavailableError('the backup copy cannot be opened');
  }

  /** One backup copy, for an explicit restore (`id` from `StorageRecoverableError.choices`). */
  async readBackupForRestore(id: string): Promise<Exclude<StoredData, { kind: 'absent' }>> {
    return (await this.chosenBackup(id)).option.data;
  }

  async backupIsEncrypted(id: string): Promise<boolean> {
    return (await this.readBackupForRestore(id)).kind === 'encrypted';
  }

  /**
   * What the restore may replace, decided in the disk writer from the secure
   * store as it is now:
   * - an offer made for a damaged bucket stands only while the store is still
   *   exactly the content that was examined; then only that bucket is
   *   replaced (sixth review);
   * - otherwise the store must still be unusable: unreadable, invalid or
   *   absent. A store that reads (again) is never replaced: the ordinary
   *   unlock evaluates it (fourth review).
   * Throws `StorageReadableAgainError` when the offer no longer applies.
   */
  private async restoreTarget(): Promise<
    { kind: 'store'; keep?: string } | { kind: 'bucket'; buckets: string[]; index: number; password: string; keep: string }
  > {
    let raw: unknown;
    let primary: StoredCopy;
    try {
      raw = await this.getItem('data');
      primary = classifyCopy(raw);
    } catch (error: any) {
      primary = isMissingKeyError(error) ? { state: 'absent' } : { state: 'error', reason: error?.message ?? String(error) };
    }
    if (this.damaged) {
      const examined = this.damaged;
      if (primary.state === 'ok' && primary.data.kind === 'encrypted' && storedDataId(primary.data) === examined.id) {
        return { kind: 'bucket', buckets: primary.data.buckets, index: examined.index, password: examined.password, keep: raw as string };
      }
      this.damaged = null; // the store changed since it was examined: the offer expired
      throw new StorageReadableAgainError();
    }
    if (primary.state === 'ok') throw new StorageReadableAgainError();
    // An invalid value may be a format this version does not know: it is kept, not lost.
    return primary.state === 'invalid' && typeof raw === 'string' ? { kind: 'store', keep: raw } : { kind: 'store' };
  }

  /**
   * Keeps a secure-store value about to be replaced by a restore as a copy set
   * aside (`keyvalue.realm.kept-*`, its encryption untouched), offered by any
   * later recovery. Throws if it could not be written: the restore stops.
   */
  async keepStoreCopy(raw: string): Promise<void> {
    const dir = BlueApp.realmKeyValuePath().slice(0, BlueApp.realmKeyValuePath().lastIndexOf('/'));
    const realm = await this.openRealmKeyValue(await BlueApp.freeKeptPath(dir));
    try {
      realm.write(() => {
        realm.create('KeyValue', { key: 'data', value: raw }, Realm.UpdateMode.Modified);
      });
    } finally {
      realm.close();
    }
  }

  /**
   * Writes a chosen backup copy as one turn of the disk writer: check again
   * that the secure store still needs it, set the other copies aside, write.
   * Nothing happens between the check and the write, and a failure at any
   * step leaves the session closed.
   */
  private async commitRestore(restore: { option: BackupOption; backup: Extract<BackupState, { state: 'ok' }> }): Promise<void> {
    await this.exclusive(async () => {
      const target = await this.restoreTarget();
      // The copies as they are now, in this same turn: the chosen content must still be there.
      const now = await this.chosenBackup(restore.option.id);
      // The value being replaced is kept first (a store with other buckets,
      // or one this version cannot read); if that fails, nothing is written.
      // A copy set aside with the same bytes already keeps it (seventh review).
      const alreadyKept = now.backup.files.some(file => file.kept && file.raw === target.keep);
      if (target.keep !== undefined && !alreadyKept) {
        try {
          await this.keepStoreCopy(target.keep);
        } catch (error: any) {
          throw new StorageWriteError(`the store could not be kept before restoring (${error?.message ?? error})`);
        }
      }
      // Nothing is written over before the copies the user did not choose are
      // safe, nor the chosen copy itself when only one of its buckets is imported.
      const partial = target.kind === 'bucket' && now.option.data.kind === 'encrypted' && now.option.data.buckets.length > 1;
      await this.setAsideOtherCopies(now.backup, restore.option.id, partial);
      if (target.kind === 'bucket') {
        // Only the damaged bucket is replaced, with the restored wallets under
        // the password that opened it; every other bucket stays byte for byte.
        this.loadedData = { kind: 'encrypted', buckets: target.buckets };
        this.cachedPassword = target.password;
        this.bucketIndex = target.index;
        this.bucketKey = null;
      }
      this.restoringFromBackup = true;
      try {
        await this.writeToDisk(true);
      } finally {
        this.restoringFromBackup = false;
      }
    });
  }

  /** Runs `task` as one turn of the disk writer, after any write or reset in flight. */
  private exclusive<T>(task: () => Promise<T>): Promise<T> {
    const run = BlueApp.diskWrites.then(task);
    BlueApp.diskWrites = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  /**
   * Before a restore writes the backup, every file it would write over or
   * retire is renamed aside unless it holds the chosen content (or nothing):
   * a copy the user did not choose, or one that could not be read, stays on
   * the device and is offered by a later recovery (third review).
   *
   * `keepChosen`: only one bucket of the chosen copy is imported (a damaged
   * bucket repaired from a copy with several), so its other buckets live only
   * in that file: one file with the chosen content is set aside too (seventh
   * review). A copy already set aside with the same bytes counts as kept, so
   * nothing is duplicated; copies set aside are never written over.
   * Throws on the first rename that fails, before anything was written.
   */
  private async setAsideOtherCopies(backup: Extract<BackupState, { state: 'ok' }>, chosenId: string, keepChosen = false): Promise<void> {
    const isChosen = (file: BackupFile) => file.copy.state === 'ok' && storedDataId(file.copy.data) === chosenId;
    let chosenSafe = !keepChosen || backup.files.some(file => file.kept && isChosen(file));
    for (const file of backup.files) {
      if (file.kept || file.copy.state === 'absent') continue;
      if (isChosen(file) && chosenSafe) continue;
      // A file whose bytes are already in a copy set aside loses nothing when written over.
      if (file.raw !== undefined && backup.files.some(other => other.kept && other.raw === file.raw)) continue;
      try {
        await this.setAsideBackup(file.path);
      } catch (error: any) {
        throw new StorageWriteError(`a backup copy could not be set aside before restoring (${error?.message ?? error})`);
      }
      if (isChosen(file)) chosenSafe = true;
    }
  }

  /**
   * The stored value the next write builds on: the secure store's, or what
   * this session loaded when that key is gone or during an explicit restore.
   * A secure store that cannot be read is never written over implicitly.
   */
  private async writeBase(): Promise<StoredData> {
    if (this.restoringFromBackup) return this.loadedData;
    const primary = await this.readPrimaryCopy();
    if (primary.state === 'ok') return primary.data;
    if (primary.state === 'absent') return this.loadedData;
    throw new StorageWriteError(`the secure store cannot be read before writing (${primary.reason})`);
  }

  /**
   * Before unlock, reads the store (and throws if it cannot be read). After
   * a load, answers from the session, which is what the next save will write.
   */
  storageIsEncrypted = async (): Promise<boolean> => {
    if (this.sessionLoaded) return Boolean(this.cachedPassword);
    return (await this.readStoredData()).kind === 'encrypted';
  };

  /**
   * Turns the app password off. Refused while the store holds other encrypted
   * buckets (decoy storages made by the removed plausible-deniability
   * feature): writing a plain store would erase them (H06).
   */
  decryptStorage = async (password: string): Promise<boolean> => {
    this.assertSessionLoaded();
    if (!this.cachedPassword || password !== this.cachedPassword) {
      throw new Error('Incorrect password. Please, try again.');
    }
    const stored = await this.writeBase();
    if (stored.kind === 'encrypted' && stored.buckets.length > 1) throw new OtherEncryptedBucketsError();
    await this.saveWithTransition({ kind: 'decrypt' });
    return true;
  };

  /** Turns the app password on. The encrypted store is written by the same queued writer as every save (H07). */
  encryptStorage = async (password: string): Promise<void> => {
    this.assertSessionLoaded();
    if (this.cachedPassword) throw new Error('Storage is already encrypted');
    if (!password) throw new Error('Password is required');
    await this.saveWithTransition({ kind: 'encrypt', password });
  };

  /**
   * Whether the bucket this session opened is still in the old CryptoJS
   * format and this device can write the new one (H08). Read from what the
   * session last read or wrote, which is what its next save replaces.
   */
  canUpgradeEncryption = (): boolean => {
    if (!this.sessionLoaded || !this.cachedPassword || this.bucketIndex === null) return false;
    if (!encryption.strongEncryptionAvailable()) return false;
    const data = this.loadedData;
    return (
      data.kind === 'encrypted' &&
      this.bucketIndex < data.buckets.length &&
      encryption.bucketFormat(data.buckets[this.bucketIndex]) === 'cryptojs'
    );
  };

  /**
   * Moves the bucket this session opened to the `nw2:` format (H08), keeping
   * its password or under `newPassword`. Written by the same queued writer as
   * every save; the other buckets are kept byte for byte, and a new password
   * that already opens one of them is refused (`PasswordInUseError`).
   */
  upgradeEncryption = async (newPassword?: string): Promise<void> => {
    this.assertSessionLoaded();
    if (!this.cachedPassword) throw new Error('Storage is not encrypted');
    if (!encryption.strongEncryptionAvailable()) throw new Error('strong encryption is not available on this device');
    if (newPassword === '') throw new Error('Password is required');
    await this.saveWithTransition({ kind: 'upgrade', password: newPassword ?? this.cachedPassword });
  };

  private async saveWithTransition(transition: Transition): Promise<void> {
    this.transition = transition;
    try {
      await this.saveToDisk();
    } finally {
      // Applied by the write that committed it; a failed write leaves the session as it was.
      this.transition = null;
    }
  }

  /**
   * Explicit "start fresh": an empty plain store in the secure store and in
   * the Realm backup, no older copy on the device, and an empty session.
   *
   * The empty secure store is the commit point (fourth review). Before it,
   * every wallet-backup file is only renamed to `<name>.reset-<token>`, so a
   * reset that fails is undone and reported, and the app opens what it opened
   * before. The committed store, and the backup written right after it, carry
   * the token; files of a committed reset that could not be deleted are
   * deleted on the next start (`settlePendingResets`) and never offered.
   * Only the files this reset renamed are deleted (fifth review).
   *
   * The session is unusable while the reset runs and stays so if it fails
   * (H04). Queued behind any write in flight.
   *
   * @returns `cleanupPending` when the reset is done but some old files are
   *   left for the next start.
   */
  async resetStorage(): Promise<{ cleanupPending: boolean }> {
    this.sessionLoaded = false;
    this.transition = null;
    const token = String(Date.now());
    const emptyJson = JSON.stringify({ wallets: [], tx_metadata: {}, counterparty_metadata: {}, [RESET_FIELD]: token });
    let cleanupPending = false;
    await this.exclusive(async () => {
      // Reversible: a copy that cannot be renamed undoes the others and fails the reset.
      await this.setAsideForReset(token);
      try {
        await this.setItem('data', emptyJson);
      } catch (error: any) {
        // Not committed: the copies go back. If that fails too, the next start
        // does it, because the store does not carry this token.
        await this.undoReset(token).catch((undoError: any) =>
          console.warn('undoing the reset failed; the next start retries:', undoError?.message),
        );
        throw new StorageWriteError(`resetting the secure store failed: ${error?.message ?? error}`);
      }
      try {
        await this.setItem(BlueApp.FLAG_ENCRYPTED, '');
        this.flagStale = false;
      } catch (error: any) {
        this.flagStale = true;
        console.warn('resetting the legacy encryption flag failed:', error?.message);
      }
      try {
        await this.writeBackup({ data: emptyJson, [BlueApp.FLAG_ENCRYPTED]: '' });
        this.backupDegraded = false;
      } catch (error: any) {
        // The old backup is already renamed away; the next save writes a new one.
        this.backupDegraded = true;
        console.warn('writing the empty Realm backup failed; the next save retries:', error?.message);
      }
      try {
        await this.deleteResetFiles(token);
      } catch (error: any) {
        // The files left keep their reset suffix: that is what the next start finishes.
        cleanupPending = true;
        console.warn('old backup copies are deleted on the next start:', error?.message);
      }
    });
    this.damaged = null;
    this.bucketKey = null;

    this.wallets = [];
    this.tx_metadata = {};
    this.counterparty_metadata = {};
    this.cachedPassword = undefined;
    this.bucketIndex = null;
    this.preservedRecords = [];
    // Kept in the store, so a later start can still tell this reset happened.
    this.bucketExtras = { [RESET_FIELD]: token };
    this.loadedData = { kind: 'plain', json: emptyJson };
    this.restoringFromBackup = false;
    this.sessionLoaded = true;
    return { cleanupPending };
  }

  /**
   * The one decision about the files of a reset that was cut short (fifth and
   * sixth reviews). Runs inside the disk writer (`exclusive`), so no reset or
   * restore moves files meanwhile. For each reset token on disk:
   * - committed, so its files are deleted: the store just opened (`opened`),
   *   or the plain secure store, or the plain backup in use carries the token;
   * - not committed, so its files go back to their names: a store that reads
   *   (plain, or `opened`) does not carry it;
   * - given back as copies set aside (offered by a recovery, never opened on
   *   their own) when nothing can prove it either way: the store is lost
   *   (absent or invalid) and the backup in use was read and has no token or
   *   is gone; or `authorized`, the user just opened the store with its
   *   password and it cannot tell (its bucket is damaged);
   * - otherwise left as they are, still tied to their reset: the store cannot
   *   be read or is encrypted and not opened yet, or the backup in use could
   *   not be read now or is encrypted. A later start, or opening that backup,
   *   decides.
   * A step that fails leaves the files with their suffix, for the next start.
   * @returns `unsettled` when files of some reset are still on disk.
   */
  private async settlePendingResets(opened?: string | null, authorized = false): Promise<{ unsettled: boolean }> {
    let tokens: string[];
    try {
      tokens = await this.listResetTokens();
    } catch (error: any) {
      console.warn('listing the files of an interrupted reset failed:', error?.message);
      return { unsettled: true };
    }
    if (!tokens.length) return { unsettled: false };

    let storeToken: string | null | undefined; // undefined: the store cannot tell now
    let storeLost = false;
    if (opened !== undefined) {
      storeToken = opened;
    } else {
      const primary = await this.readPrimaryCopy();
      if (primary.state === 'ok' && primary.data.kind === 'plain') storeToken = resetTokenOf(primary.data.json);
      storeLost = primary.state === 'absent' || primary.state === 'invalid';
    }
    const backup = await this.activeBackupEvidence();

    for (const token of tokens) {
      try {
        if (storeToken === token || backup.token === token) await this.deleteResetFiles(token);
        else if (storeToken !== undefined) await this.undoReset(token);
        else if (authorized || (storeLost && backup.known)) await this.undoReset(token, 'kept');
      } catch (error: any) {
        console.warn('settling an interrupted reset failed; the next start retries:', error?.message);
      }
    }
    return { unsettled: (await this.listResetTokens().catch(() => ['?'])).length > 0 };
  }

  /**
   * What the backup in use says about a reset: the token it carries; `known`
   * false when it could not be read now or is encrypted, so its silence
   * proves nothing (sixth review). A missing file is known to carry none.
   */
  private async activeBackupEvidence(): Promise<{ token: string | null; known: boolean; copy: StoredCopy }> {
    try {
      if (!(await this.backupFileExists(BlueApp.realmKeyValuePath()))) return { token: null, known: true, copy: { state: 'absent' } };
    } catch (error: any) {
      return { token: null, known: false, copy: { state: 'error', reason: error?.message ?? String(error) } };
    }
    const copy = await this.readBackupAt(BlueApp.realmKeyValuePath());
    if (copy.state === 'ok' && copy.data.kind === 'plain') return { token: resetTokenOf(copy.data.json), known: true, copy };
    if (copy.state === 'absent') return { token: null, known: true, copy };
    return { token: null, known: false, copy };
  }

  /**
   * Returns instace of the Realm database, which is encrypted by random bytes stored in keychain.
   * Database file is static.
   *
   * @returns {Promise<Realm>}
   */
  async openRealmKeyValue(path: string = BlueApp.realmKeyValuePath()): Promise<Realm> {
    const service = 'realm_encryption_key';
    let password;
    const credentials = await Keychain.getGenericPassword({ service });
    if (credentials) {
      password = credentials.password;
    } else {
      const buf = await randomBytes(64);
      password = uint8ArrayToHex(buf);
      await Keychain.setGenericPassword(service, password, { service });
    }

    const buf = hexToUint8Array(password);
    const encryptionKey = Int8Array.from(buf);

    const schema = [
      {
        name: 'KeyValue',
        primaryKey: 'key',
        properties: {
          key: { type: 'string', indexed: true },
          value: 'string', // stringified json, or whatever
        },
      },
    ];
    // @ts-ignore schema doesn't match Realm's schema type
    return Realm.open({
      // @ts-ignore schema doesn't match Realm's schema type
      schema,
      path,
      encryptionKey,
      excludeFromIcloudBackup: true,
    });
  }

  /** One absolute path for opening and for purging the backup (H32). */
  static realmKeyValuePath(): string {
    return `${RNFS.CachesDirectoryPath}/keyvalue.realm`;
  }

  /** Where versions before the move to Caches kept the backup. */
  static legacyRealmKeyValuePath(): string {
    return `${RNFS.DocumentDirectoryPath}/keyvalue.realm`;
  }

  /** Writes every entry in one Realm transaction, so data and flag never come from different saves (H07). */
  private async writeBackup(entries: Record<string, string>): Promise<void> {
    await this.migrateRealmFilesOnce();
    const realm = await this.openRealmKeyValue();
    try {
      realm.write(() => {
        for (const [key, value] of Object.entries(entries)) {
          realm.create('KeyValue', { key, value }, Realm.UpdateMode.Modified);
        }
      });
    } finally {
      realm.close();
    }
  }

  /**
   * Loads from storage all wallets and maps them to `this.wallets`.
   *
   * The whole set is built aside and published at once, only after the store
   * was read and parsed (H04). Records that cannot become wallets are kept for
   * the next save (H29).
   *
   * @param password Required when the store is encrypted.
   * @param options.fromBackup An explicit restore: the `id` of the backup copy
   *   the user chose. It is opened only if that content is still there, the
   *   other backup files are set aside, and it is written over the secure
   *   store before the session is used.
   * @returns true when the session is ready (also for a verified empty
   *   install); false when the store is encrypted and `password` opens no bucket.
   * @throws StorageUnavailableError | StorageRecoverableError | StorageCorruptError
   *   when the store cannot be read.
   */
  async loadFromDisk(password?: string, options: { fromBackup?: string } = {}): Promise<boolean> {
    const restore = options.fromBackup !== undefined ? await this.chosenBackup(options.fromBackup) : null;
    const fromBackup = restore !== null;
    const stored = restore ? restore.option.data : await this.readStoredData();
    let bucketJson = EMPTY_BUCKET_JSON;
    let bucketIndex: number | null = null;
    let sessionPassword: string | undefined;
    let sessionKey: encryption.BucketKey | null = null;
    if (stored.kind === 'encrypted') {
      if (!password) return false;
      const opened = openEncryptedBucket(stored.buckets, password);
      if (!opened) return false;
      bucketJson = opened.plaintext;
      bucketIndex = opened.index;
      sessionPassword = password;
      sessionKey = opened.key;
    } else if (stored.kind === 'plain') {
      bucketJson = stored.json;
    }

    let bucket: (TBucketStorage & Record<string, unknown>) | null = null;
    try {
      bucket = JSON.parse(bucketJson);
    } catch {
      bucket = null;
    }
    if (!bucket || !isWalletBucket(bucketJson)) {
      // The bucket opened but its content is damaged: offer a backup copy if
      // one can be read, as for any unreadable store (second review).
      if (!fromBackup && stored.kind === 'encrypted' && password !== undefined && bucketIndex !== null) {
        const damagedId = storedDataId(stored);
        const choices = await this.exclusive(async () => {
          // The user just proved the store's password: files of an interrupted
          // reset that nothing else can settle are recovered for them to choose,
          // as copies set aside (sixth review).
          const { unsettled } = await this.settlePendingResets(undefined, true);
          if (unsettled) return [];
          const backup = await this.readBackupState();
          // A backup identical to the damaged store would only fail the same way.
          return backup.state === 'ok' ? BlueApp.choicesOf(backup).filter(choice => choice.id !== damagedId) : [];
        });
        if (choices.length) {
          this.damaged = { id: damagedId, password, index: bucketIndex };
          throw new StorageRecoverableError('the opened bucket is damaged', choices, 'bucket');
        }
      }
      throw new StorageCorruptError('the opened bucket has no wallet list');
    }

    const wallets: TWallet[] = [];
    const preserved: PreservedRecord[] = [];
    for (const raw of bucket.wallets) {
      const record = this.restoreRecord(raw);
      if ('preserved' in record) {
        preserved.push(record.preserved);
        continue;
      }
      const id = record.wallet.getID();
      if (wallets.some(wallet => wallet.getID() === id)) {
        preserved.push({ raw, reason: 'duplicate', id });
        continue;
      }
      wallets.push(record.wallet);
    }

    const { wallets: _records, tx_metadata, counterparty_metadata, ...extras } = bucket; // eslint-disable-line @typescript-eslint/no-unused-vars
    this.sessionLoaded = false;
    this.wallets = wallets;
    this.tx_metadata = tx_metadata ?? {};
    this.counterparty_metadata = counterparty_metadata ?? {};
    this.preservedRecords = preserved;
    this.bucketExtras = extras;
    this.cachedPassword = sessionPassword;
    this.bucketIndex = bucketIndex;
    this.bucketKey = sessionKey;
    this.loadedData = stored;
    this.restoringFromBackup = false;

    // The restore is complete only once the secure store holds the backup:
    // until then the session must not be used.
    if (restore) await this.commitRestore(restore);
    this.sessionLoaded = true;
    this.damaged = null;
    // An interrupted reset the encrypted store could not tell about before the unlock.
    const opened = typeof extras[RESET_FIELD] === 'string' ? (extras[RESET_FIELD] as string) : null;
    await this.exclusive(() => this.settlePendingResets(opened));

    if (preserved.length) {
      console.warn(
        'kept stored records this version cannot open:',
        preserved.map(record => record.reason),
      );
    }

    // References of wallets whose ID changed move before any screen reads them,
    // and before the testnet purge, which looks them up by the current IDs.
    try {
      await migrateWalletReferences(this.wallets);
    } catch (error: any) {
      console.warn('[Neurai] wallet reference migration failed:', error?.message);
    }
    // Testnet reset: drop the DePIN caches of the old chain once (wallet
    // JSON is handled in AbstractNeuraiWallet.fromJson). Never blocks loading.
    const testnetIds = this.wallets
      .filter(w => 'network' in w && typeof w.network === 'string' && isTestnetChain(w.network as NeuraiChainType))
      .map(w => w.getID());
    purgeStaleTestnetStorage(testnetIds).catch(error => console.warn('[Neurai] testnet cache cleanup failed:', error));
    return true;
  }

  private restoreRecord(raw: unknown): { wallet: TWallet } | { preserved: PreservedRecord } {
    if (typeof raw !== 'string') return { preserved: { raw: JSON.stringify(raw), reason: 'unreadable' } };
    let type: unknown;
    try {
      type = JSON.parse(raw)?.type;
    } catch {
      return { preserved: { raw, reason: 'unreadable' } };
    }
    const WalletClass = typeof type === 'string' ? WALLET_CLASSES[type] : undefined;
    if (!WalletClass) return { preserved: { raw, reason: 'unknown-type' } };
    try {
      return { wallet: WalletClass.fromJson(raw) as TWallet };
    } catch {
      return { preserved: { raw, reason: 'unreadable' } };
    }
  }

  /**
   * Removes `wallet` from the session, and any stored duplicate of it.
   * Matches the object itself first: older stores can hold two records with
   * one ID, and deleting by ID removed both (H02).
   *
   * @returns `undo`, which puts the session back when the save that should
   *   persist the deletion fails, so the screen matches the disk (H03).
   */
  deleteWallet = (wallet: TWallet): { undo: () => void } => {
    const previousWallets = this.wallets;
    const previousPreserved = this.preservedRecords;
    const ID = wallet.getID();
    let index = this.wallets.indexOf(wallet);
    if (index < 0) index = this.wallets.findIndex(value => value.getID() === ID);
    if (index >= 0) this.wallets = this.wallets.filter((_, i) => i !== index);
    this.preservedRecords = this.preservedRecords.filter(record => record.id !== ID);
    return {
      undo: () => {
        this.wallets = previousWallets;
        this.preservedRecords = previousPreserved;
      },
    };
  };

  /**
   * Serializes and saves to storage object data.
   * If cached password is saved - finds the correct bucket
   * to save to, encrypts and then saves.
   *
   * Rejects when the primary store was not written (H03), so callers never
   * report success for a save that did not happen. A failure of only the
   * Realm backup resolves, sets `backupDegraded`, and the next save repairs it.
   */
  saveToDisk(): Promise<void> {
    this.saveRequested = true;
    if (!this.savePromise) this.savePromise = this.flushPendingSaves();
    return this.savePromise;
  }

  private async flushPendingSaves(): Promise<void> {
    try {
      do {
        this.saveRequested = false;
        // One disk writer across instances. A push arriving during a write
        // requests another snapshot; all callers wait for that snapshot too.
        const write = BlueApp.diskWrites.then(() => this.writeToDisk());
        BlueApp.diskWrites = write.catch(() => {});
        await write;
      } while (this.saveRequested);
    } finally {
      // Clear in this continuation, without an extra promise callback that
      // could strand a save requested between draining and cleanup.
      this.savePromise = undefined;
    }
  }

  private assertSessionLoaded(): void {
    if (!this.sessionLoaded) throw new StorageNotLoadedError();
  }

  private serializeWallet(wallet: TWallet): string {
    wallet.prepareForSerialization();
    const keyCloned = Object.assign({}, wallet); // stripped-down version of a wallet to save to secure keystore
    if (wallet._txs_by_external_index) {
      keyCloned._txs_by_external_index = {};
      keyCloned._txs_by_internal_index = {};
    }
    return JSON.stringify(encodeWalletAmounts({ ...keyCloned, type: keyCloned.type }));
  }

  private serializeBucket(): string {
    return JSON.stringify({
      ...this.bucketExtras,
      wallets: [...this.wallets.map(wallet => this.serializeWallet(wallet)), ...this.preservedRecords.map(record => record.raw)],
      tx_metadata: this.tx_metadata,
      counterparty_metadata: this.counterparty_metadata,
    });
  }

  /**
   * The stored value for an encrypted session: the bucket this session opened
   * is replaced, every other bucket is kept byte for byte. The target must
   * still open with the session password, or nothing is written (H05). It
   * keeps its format; `upgradeTo` writes it as `nw2:` under that password.
   */
  private async encryptedData(
    bucketJson: string,
    password: string,
    upgradeTo?: string,
  ): Promise<{ buckets: string[]; key: encryption.BucketKey | null }> {
    const stored = await this.writeBase();
    const index = this.bucketIndex;
    if (stored.kind !== 'encrypted' || index === null || index >= stored.buckets.length) {
      throw new StorageWriteError('the encrypted bucket of this session is not in the store');
    }
    const current = encryption.openBucket(stored.buckets[index], password, this.bucketKey);
    if (!current) {
      throw new StorageWriteError('the stored bucket does not open with this session password');
    }
    const buckets = stored.buckets.slice();
    if (upgradeTo === undefined) {
      const sealed = encryption.sealBucket(bucketJson, password, { like: stored.buckets[index], key: current.key });
      buckets[index] = sealed.bucket;
      return { buckets, key: sealed.key };
    }
    if (upgradeTo !== password && buckets.some((bucket, other) => other !== index && encryption.decrypt(bucket, upgradeTo))) {
      throw new PasswordInUseError();
    }
    const sealed = encryption.sealBucket(bucketJson, upgradeTo, { format: 'nw2' });
    buckets[index] = sealed.bucket;
    return { buckets, key: sealed.key };
  }

  /** `restoring`: the write that commits a restore, before the session opens (`commitRestore`). */
  private async writeToDisk(restoring = false): Promise<void> {
    if (!restoring) this.assertSessionLoaded();
    const transition = this.transition;
    const bucketJson = this.serializeBucket();

    let written: Exclude<StoredData, { kind: 'absent' }>;
    let password: string | undefined;
    let key: encryption.BucketKey | null = null;
    if (transition?.kind === 'encrypt') {
      if ((await this.writeBase()).kind === 'encrypted') throw new StorageWriteError('the store is already encrypted');
      password = transition.password;
      const sealed = encryption.sealBucket(bucketJson, password, { format: newBucketFormat() });
      written = { kind: 'encrypted', buckets: [sealed.bucket] };
      key = sealed.key;
    } else if (transition?.kind === 'decrypt') {
      const stored = await this.writeBase();
      if (stored.kind === 'encrypted' && stored.buckets.length > 1) throw new OtherEncryptedBucketsError();
      written = { kind: 'plain', json: bucketJson };
    } else if (transition?.kind === 'upgrade') {
      if (!this.cachedPassword) throw new StorageWriteError('the store is not encrypted');
      password = transition.password;
      const sealed = await this.encryptedData(bucketJson, this.cachedPassword, transition.password);
      written = { kind: 'encrypted', buckets: sealed.buckets };
      key = sealed.key;
    } else if (this.cachedPassword) {
      password = this.cachedPassword;
      const sealed = await this.encryptedData(bucketJson, password);
      written = { kind: 'encrypted', buckets: sealed.buckets };
      key = sealed.key;
    } else {
      written = { kind: 'plain', json: bucketJson };
    }
    const data = written.kind === 'encrypted' ? JSON.stringify(written.buckets) : written.json;
    const flag = password ? '1' : '';

    try {
      await this.setItem('data', data);
    } catch (error: any) {
      console.error('save to disk failed:', error?.message);
      throw new StorageWriteError(error?.message || 'the secure store rejected the write');
    }

    // `data` is the commit point: the session follows what the secure store
    // now holds, whatever happens to the flag or the backup below (H03/H07).
    this.loadedData = written;
    this.restoringFromBackup = false;
    // The key of what was just written (null for CryptoJS or plain).
    this.bucketKey = key;
    if (transition?.kind === 'encrypt') {
      this.cachedPassword = transition.password;
      this.bucketIndex = 0;
    } else if (transition?.kind === 'upgrade') {
      // Same bucket, new format (and maybe password).
      this.cachedPassword = transition.password;
    } else if (transition?.kind === 'decrypt') {
      this.cachedPassword = undefined;
      this.bucketIndex = null;
    }
    if (transition) this.transition = null;

    try {
      await this.setItem(BlueApp.FLAG_ENCRYPTED, flag);
      this.flagStale = false;
    } catch (error: any) {
      // Only older versions read the flag (the shape of `data` decides here).
      this.flagStale = true;
      console.warn('writing the legacy encryption flag failed; the next save retries it:', error?.message);
    }

    try {
      await this.writeBackup({ data, [BlueApp.FLAG_ENCRYPTED]: flag });
      this.backupDegraded = false;
      // The secure store and the Caches backup now hold this save: a copy left
      // in Documents is older for certain. Set it aside (kept, not offered for
      // recovery, removed by a reset).
      await this.retireLegacyBackup().catch((error: any) => console.warn('setting the old Documents backup aside failed:', error?.message));
    } catch (error: any) {
      this.backupDegraded = true;
      console.warn('saving the Realm backup failed; the next save retries it:', error?.message);
      if (String(error?.message).includes('Realm file decryption failed')) {
        // The file may hold a revision the secure store does not (fourth
        // review): set it aside, where a later recovery still offers it, and
        // start a new backup. If it cannot be moved, it stays as it is and
        // the next save tries again; it is never deleted here.
        try {
          await this.setAsideBackup(BlueApp.realmKeyValuePath());
          await this.writeBackup({ data, [BlueApp.FLAG_ENCRYPTED]: flag });
          this.backupDegraded = false;
        } catch (retryError: any) {
          console.warn('the Realm backup that does not open was kept; the next save retries:', retryError?.message);
        }
      }
    }
  }

  /**
   * For each wallet, fetches balance from remote endpoint.
   * Use getter for a specific wallet to get actual balance.
   * Returns void.
   * If index is present then fetch only from this specific wallet
   */
  fetchWalletBalances = async (index?: number): Promise<void> => {
    console.log('fetchWalletBalances for wallet#', typeof index === 'undefined' ? '(all)' : index);
    if (index || index === 0) {
      let c = 0;
      for (const wallet of this.wallets) {
        if (c++ === index) {
          await wallet.fetchBalance();
        }
      }
    } else {
      await Promise.all(
        this.wallets.map(async wallet => {
          console.log('fetching balance for', wallet.getLabel());
          await wallet.fetchBalance();
        }),
      );
    }
  };

  /**
   * Fetches from remote endpoint all transactions for each wallet.
   * Returns void.
   * To access transactions - get them from each respective wallet.
   * If index is present then fetch only from this specific wallet.
   *
   * @param index {Integer} Index of the wallet in this.wallets array,
   *                        blank to fetch from all wallets
   * @return {Promise.<void>}
   */
  fetchWalletTransactions = async (index?: number) => {
    console.log('fetchWalletTransactions for wallet#', typeof index === 'undefined' ? '(all)' : index);
    if (index || index === 0) {
      let c = 0;
      for (const wallet of this.wallets) {
        if (c++ === index) {
          await wallet.fetchTransactions();
        }
      }
    } else {
      await Promise.all(this.wallets.map(async wallet => wallet.fetchTransactions()));
    }
  };

  getWallets = (): TWallet[] => {
    return this.wallets;
  };

  /**
   * Getter for all transactions in all wallets.
   * But if index is provided - only for wallet with corresponding index
   *
   * @param index {number|undefined} Wallet index in this.wallets. Empty (or undef) for all wallets.
   * @param limit {number} How many txs return, starting from the earliest. Default: all of them.
   * @param includeWalletsWithHideTransactionsEnabled {boolean} Wallets' _hideTransactionsInWalletsList property determines wether the user wants this wallet's txs hidden from the main list view.
   */
  getTransactions = (
    index?: number,
    limit: number = Infinity,
    includeWalletsWithHideTransactionsEnabled: boolean = false,
  ): ExtendedTransaction[] => {
    if (index || index === 0) {
      let txs: Transaction[] = [];
      let c = 0;
      for (const wallet of this.wallets) {
        if (c++ === index) {
          txs = txs.concat(wallet.getTransactions());

          const txsRet: ExtendedTransaction[] = [];
          const walletID = wallet.getID();
          const walletPreferredBalanceUnit = wallet.getPreferredBalanceUnit();
          txs.map(tx =>
            txsRet.push({
              ...tx,
              walletID,
              walletPreferredBalanceUnit,
            }),
          );
          return txsRet;
        }
      }
    }

    const txs: ExtendedTransaction[] = [];
    for (const wallet of this.wallets.filter(w => includeWalletsWithHideTransactionsEnabled || !w.getHideTransactionsInWalletsList())) {
      const walletTransactions: Transaction[] = wallet.getTransactions();
      const walletID = wallet.getID();
      const walletPreferredBalanceUnit = wallet.getPreferredBalanceUnit();
      for (const t of walletTransactions) {
        txs.push({
          ...t,
          walletID,
          walletPreferredBalanceUnit,
        });
      }
    }

    return txs
      .sort((a, b) => {
        return b.timestamp - a.timestamp;
      })
      .slice(0, limit);
  };

  /**
   * Getter for a sum of all balances of all wallets
   */
  getBalance = (): bigint => {
    let finalBalance = 0n;
    for (const wal of this.wallets) {
      finalBalance += wal.getBalance();
    }
    return finalBalance;
  };

  isHandoffEnabled = async (): Promise<boolean> => {
    try {
      return !!(await AsyncStorage.getItem(BlueApp.HANDOFF_STORAGE_KEY));
    } catch (_) {}
    return false;
  };

  setIsHandoffEnabled = async (value: boolean): Promise<void> => {
    await AsyncStorage.setItem(BlueApp.HANDOFF_STORAGE_KEY, value ? '1' : '');
  };

  /**
   * Simple async sleeper function
   */
  sleep = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  };

  /** The two directories that hold wallet backups: Documents, then Caches. */
  private static backupDirs(): string[] {
    const dirOf = (path: string) => path.slice(0, path.lastIndexOf('/'));
    return [dirOf(BlueApp.legacyRealmKeyValuePath()), dirOf(BlueApp.realmKeyValuePath())];
  }

  /** A name next to `dir` that no file has: `keyvalue.realm.kept-<time>`. */
  private static async freeKeptPath(dir: string): Promise<string> {
    let path = `${dir}/keyvalue.realm.kept-${Date.now()}`;
    for (let n = 1; await RNFS.exists(path); n++) path = `${dir}/keyvalue.realm.kept-${Date.now() + n}`;
    return path;
  }

  /**
   * Renames every wallet-backup file this app owns, in both directories and
   * with Realm's side files, to `<name>.reset-<token>` (files of an earlier
   * unsettled reset get the new suffix on top). On the first failure the
   * renamed ones go back and it throws: nothing is lost by a reset that does
   * not happen.
   */
  async setAsideForReset(token: string): Promise<void> {
    try {
      for (const dir of BlueApp.backupDirs()) {
        if (!(await RNFS.exists(dir))) continue;
        for (const file of await RNFS.readDir(dir)) {
          if (!parseOwnBackupFile(file.name)) continue;
          const from = `${dir}/${file.name}`;
          await RNFS.moveFile(from, `${from}.reset-${token}`);
          if (await RNFS.exists(from)) throw new Error(`${file.name} was not moved`);
        }
      }
    } catch (error: any) {
      await this.undoReset(token).catch((undoError: any) =>
        console.warn('undoing the reset failed; the next start retries:', undoError?.message),
      );
      throw new StorageWriteError(`the backup copies could not be set aside for the reset (${error?.message ?? error})`);
    }
  }

  /** The files of reset `token`: own files whose last reset suffix is that token. */
  private static async filesOfReset(token: string): Promise<Array<{ dir: string; name: string; own: OwnBackupFile }>> {
    const found: Array<{ dir: string; name: string; own: OwnBackupFile }> = [];
    for (const dir of BlueApp.backupDirs()) {
      if (!(await RNFS.exists(dir))) continue;
      for (const file of await RNFS.readDir(dir)) {
        const own = parseOwnBackupFile(file.name);
        if (own && own.tokens[own.tokens.length - 1] === token) found.push({ dir, name: file.name, own });
      }
    }
    return found;
  }

  /**
   * Gives the files of reset `token` back. `original`: to their names (a name
   * taken meanwhile gets a `.kept-*` name instead, never written over).
   * `kept`: the backups themselves come back as copies set aside, which a
   * recovery offers but never opens on its own. Realm's side files that cannot
   * go back to their name are deleted: they hold no wallet.
   */
  async undoReset(token: string, mode: 'original' | 'kept' = 'original'): Promise<void> {
    const suffix = `.reset-${token}`;
    const failures: string[] = [];
    for (const { dir, name, own } of await BlueApp.filesOfReset(token)) {
      const from = `${dir}/${name}`;
      try {
        let to = from.slice(0, -suffix.length);
        const nested = own.tokens.length > 1;
        if (own.side && !nested && (mode === 'kept' || (await RNFS.exists(to)))) {
          await RNFS.unlink(from);
          continue;
        }
        const asKept = mode === 'kept' && !nested && !/^keyvalue\.realm\.(superseded|stale-)/.test(own.stem);
        if (asKept || (await RNFS.exists(to))) to = await BlueApp.freeKeptPath(dir);
        await RNFS.moveFile(from, to);
      } catch (error: any) {
        failures.push(`${name}: ${error?.message ?? error}`);
      }
    }
    if (failures.length) throw new StorageWriteError(`the reset could not be undone (${failures.join('; ')})`);
  }

  /** Deletes the files of a committed reset `token`, and nothing else. */
  async deleteResetFiles(token: string): Promise<void> {
    const failures: string[] = [];
    for (const { dir, name } of await BlueApp.filesOfReset(token)) {
      try {
        await RNFS.unlink(`${dir}/${name}`);
      } catch (error: any) {
        failures.push(`${name}: ${error?.message ?? error}`);
      }
    }
    if (failures.length) throw new StorageWriteError(`old backup copies could not be deleted (${failures.join('; ')})`);
  }

  /** The tokens of resets whose files are still on the device. */
  async listResetTokens(): Promise<string[]> {
    const tokens = new Set<string>();
    for (const dir of BlueApp.backupDirs()) {
      if (!(await RNFS.exists(dir))) continue;
      for (const file of await RNFS.readDir(dir)) {
        const own = parseOwnBackupFile(file.name);
        if (own && own.tokens.length) tokens.add(own.tokens[own.tokens.length - 1]);
      }
    }
    return [...tokens].sort();
  }

  /**
   * Runs the Documents → Caches move before this instance opens a Realm file.
   * A failed move is not remembered as done: the next call tries again, and
   * the recovery reads both places meanwhile (second review).
   */
  private migrateRealmFilesOnce(): Promise<void> {
    if (!this.realmFilesMigrated) {
      this.realmFilesMigrated = this.moveRealmFilesToCacheDirectory().catch((error: any) => {
        console.warn('moveRealmFilesToCacheDirectory error:', error?.message);
        this.realmFilesMigrated = null;
      });
    }
    return this.realmFilesMigrated;
  }

  /**
   * Moves Realm files from Documents (included in device backups) to Caches,
   * only where Caches has no file of that name. When both exist, neither is
   * moved: the recovery compares them by content, and the Documents copy is
   * set aside once a save has made the Caches copy current (H32).
   */
  async moveRealmFilesToCacheDirectory() {
    const documentPath = RNFS.DocumentDirectoryPath; // Path to documentPath folder
    const cachePath = RNFS.CachesDirectoryPath; // Path to cachePath folder
    try {
      if (!(await RNFS.exists(documentPath))) return; // If the documentPath directory does not exist, return (nothing to move)
      const files = await RNFS.readDir(documentPath); // Read all files in documentPath directory
      if (Array.isArray(files) && files.length === 0) return; // If there are no files, return (nothing to move)
      const appRealmFiles = files.filter(
        file => file.name.endsWith('.realm') || file.name.endsWith('.realm.lock') || file.name.includes('.realm.management'),
      );

      for (const file of appRealmFiles) {
        const filePath = `${documentPath}/${file.name}`;
        const newFilePath = `${cachePath}/${file.name}`;
        if (!(await RNFS.exists(filePath))) continue;
        if (await RNFS.exists(newFilePath)) continue; // both kept; see readBackupState
        await RNFS.moveFile(filePath, newFilePath); // Move the file
        console.log(`Moved Realm file: ${filePath} to ${newFilePath}`);
      }
    } catch (error) {
      console.error('Error moving Realm files:', error);
      throw new Error(`Error moving Realm files: ${(error as Error).message}`);
    }
  }

  /**
   * Renames a Documents backup that a newer save in Caches superseded. An
   * earlier superseded copy is kept too (a second one gets a time suffix):
   * nothing here deletes a copy of the wallets.
   */
  async retireLegacyBackup(): Promise<void> {
    const legacy = BlueApp.legacyRealmKeyValuePath();
    if (!(await RNFS.exists(legacy))) return;
    let superseded = `${legacy}.superseded`;
    if (await RNFS.exists(superseded)) superseded = `${legacy}.superseded-${Date.now()}`;
    await RNFS.moveFile(legacy, superseded);
  }
}
