/**
 * Errors of the wallet store (`class/blue-app.ts`). Each one names a state the
 * UI must treat differently: none of them means "there are no wallets".
 */

/** The store may hold wallets but cannot be read now (locked keystore, backup unreadable). Retry later. */
export class StorageUnavailableError extends Error {
  constructor(message = 'The wallet storage cannot be read right now') {
    super(message);
    this.name = 'StorageUnavailableError';
  }
}

/**
 * The secure store cannot be read (or holds an invalid value) but the Realm
 * backup has a readable copy. The backup may be older than the store, so it
 * is never opened on its own: the user decides to restore it (H03/H04).
 */
export class StorageRecoverableError extends StorageUnavailableError {
  /** The backup copies the user can pick from: one, or several that differ. */
  readonly choices: RestoreChoice[];
  /**
   * What a restore replaces: the whole store (unreadable, invalid or absent),
   * or only the encrypted bucket the user's password opened damaged, keeping
   * the other buckets and that password (sixth review).
   */
  readonly scope: 'store' | 'bucket';

  constructor(reason: string, choices: RestoreChoice[], scope: 'store' | 'bucket' = 'store') {
    super(`The wallet storage cannot be read (${reason}); a backup copy is available`);
    this.name = 'StorageRecoverableError';
    this.choices = choices;
    this.scope = scope;
  }
}

/**
 * One restorable backup copy. `id` names its content (a digest), not its place
 * in a list: the restore opens exactly the copy the user saw and authorized,
 * or refuses and offers the copies again if that content is gone (third
 * review). `savedAt` is when its file was last written, for the label.
 */
export type RestoreChoice = { id: string; savedAt?: number };

/**
 * A restore was about to be written, but the secure store is not the one the
 * restore was offered for: it reads again, or it changed (fourth and sixth
 * reviews). Nothing was restored or moved; the ordinary unlock evaluates the
 * store as it is now.
 */
export class StorageReadableAgainError extends Error {
  constructor() {
    super('The wallet storage changed or can be read again; the backup was not restored');
    this.name = 'StorageReadableAgainError';
  }
}

/** The stored value exists but has no shape this version understands. */
export class StorageCorruptError extends Error {
  constructor(message = 'The wallet storage is damaged') {
    super(message);
    this.name = 'StorageCorruptError';
  }
}

/** The primary store was not updated: the last save did not happen. */
export class StorageWriteError extends Error {
  /** Set once the UI told the user, so callers do not show a second alert. */
  reported = false;

  constructor(message = 'The wallet storage could not be written') {
    super(message);
    this.name = 'StorageWriteError';
  }
}

/** A write was attempted before a complete load; refusing protects what is on disk. */
export class StorageNotLoadedError extends StorageWriteError {
  constructor() {
    super('The wallet storage was not loaded; nothing was written');
    this.name = 'StorageNotLoadedError';
  }
}

/** Removing the password would erase other encrypted buckets (legacy decoy storage). */
export class OtherEncryptedBucketsError extends Error {
  constructor() {
    super('The storage holds another encrypted storage with a different password');
    this.name = 'OtherEncryptedBucketsError';
  }
}

/**
 * The new password of an encryption upgrade already opens another bucket of
 * the store: with it, an unlock could open either one (H08).
 */
export class PasswordInUseError extends Error {
  constructor() {
    super('This password already opens another encrypted storage');
    this.name = 'PasswordInUseError';
  }
}

/**
 * The secure store rejects a missing key with code "404" on Android and iOS
 * (react-native-secure-key-store); AsyncStorage, used in tests, resolves null.
 */
export function isMissingKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && String((error as { code?: unknown }).code) === '404';
}

/** True when the error was already shown to the user by `StorageProvider.saveToDisk`. */
export function isReportedSaveError(error: unknown): boolean {
  return error instanceof StorageWriteError && error.reported;
}
