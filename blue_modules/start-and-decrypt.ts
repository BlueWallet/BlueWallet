import { Platform } from 'react-native';

import { BlueApp as BlueAppClass } from '../class/blue-app';
import { StorageReadableAgainError, StorageRecoverableError, StorageUnavailableError, type RestoreChoice } from '../class/storage-errors';
import presentAlert from '../components/Alert';
import prompt from '../helpers/prompt';
import { authorizeUnlock, showKeychainWipeAlert } from '../hooks/useBiometrics';
import loc from '../loc';
import { loadDepinRpcOverrides } from './neurai/depinRpcOverrides';

const BlueApp = BlueAppClass.getInstance();
// If attempt reaches 10, a wipe keychain option will be provided to the user.
let unlockAttempt = 0;

type PasswordPromptCallback = () => Promise<string | undefined>;

/**
 * - `unlocked`: the session is loaded (an empty install counts).
 * - `wrong_password`: the store is encrypted and the password opens nothing.
 * - `unavailable`: the store could not be read or parsed. The app must stay
 *   locked: proceeding would show an empty wallet list and the next save
 *   would replace the stored wallets (H04).
 * - `backup_available`: unavailable, but the Realm backup has a readable copy
 *   (or several that differ, see `getRestoreChoices`) the user may choose to
 *   restore. It can be older than the lost one.
 * - `not_authorized`: a restore of a backup without an app password was not
 *   authorized (biometrics cancelled or unavailable); nothing was opened.
 * - `readable_again`: a restore was asked for, but the secure store reads
 *   again; nothing was restored, and the ordinary unlock should run.
 */
export type UnlockResult = 'unlocked' | 'wrong_password' | 'unavailable' | 'backup_available' | 'not_authorized' | 'readable_again';

let restoreChoices: RestoreChoice[] = [];
let restoreScope: 'store' | 'bucket' = 'store';

/** The backup copies offered by the last `backup_available` result. */
export const getRestoreChoices = (): RestoreChoice[] => restoreChoices;
/** What restoring one of them replaces: the whole store, or only the damaged bucket the password opened. */
export const getRestoreScope = (): 'store' | 'bucket' => restoreScope;

const unreadable = (error: unknown): UnlockResult => {
  if (error instanceof StorageReadableAgainError) return 'readable_again';
  console.warn('the storage cannot be opened:', (error as Error)?.message);
  restoreChoices = error instanceof StorageRecoverableError ? error.choices : [];
  restoreScope = error instanceof StorageRecoverableError ? error.scope : 'store';
  return error instanceof StorageRecoverableError ? 'backup_available' : 'unavailable';
};

const RETRY_DELAY_MS = 3000;

/** A locked keystore right after boot often reads fine a moment later: retry once. */
async function withOneRetry<T>(read: () => Promise<T>): Promise<T> {
  try {
    return await read();
  } catch (error) {
    if (!(error instanceof StorageUnavailableError)) throw error;
    // Damaged content does not read better a moment later: no wait for it.
    if (error instanceof StorageRecoverableError && error.scope === 'bucket') throw error;
    console.warn('storage unavailable, retrying once:', error.message);
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    return read();
  }
}

/**
 * @param options.fromBackup The user chose to restore this backup copy (the
 *   `id` of one of `getRestoreChoices`): it is opened and written over the
 *   unreadable secure store. A copy without an app password needs the same
 *   authorization as an ordinary unlock first. The id names the content, so
 *   the load opens exactly what was authorized; if that content is gone, the
 *   result is `backup_available` with the copies there are now.
 */
export const startAndDecrypt = async (
  retry?: boolean,
  passwordPrompt?: PasswordPromptCallback,
  options: { fromBackup?: string } = {},
): Promise<UnlockResult> => {
  // A complete session is already in memory: nothing to migrate, decrypt or load.
  if (BlueApp.isSessionLoaded()) return 'unlocked';
  await BlueApp.migrateKeys();
  const restoreChoice = options.fromBackup;
  const fromBackup = restoreChoice !== undefined;

  let encrypted: boolean;
  try {
    encrypted =
      restoreChoice !== undefined ? await BlueApp.backupIsEncrypted(restoreChoice) : await withOneRetry(() => BlueApp.storageIsEncrypted());
  } catch (error) {
    return unreadable(error);
  }
  // The app password authorizes an encrypted copy; a plain one gets the
  // biometric check the ordinary unlock would ask for (second review).
  if (fromBackup && !encrypted && !(await authorizeUnlock())) return 'not_authorized';

  let password: undefined | string;
  if (encrypted) {
    if (passwordPrompt) {
      password = await passwordPrompt();
    } else {
      do {
        password = await prompt((retry && loc._.bad_password) || loc._.enter_password, loc._.storage_is_encrypted, false);
      } while (!password);
    }
  }

  let success: boolean;
  try {
    success =
      restoreChoice !== undefined
        ? await BlueApp.loadFromDisk(password, { fromBackup: restoreChoice })
        : await withOneRetry(() => BlueApp.loadFromDisk(password));
  } catch (error) {
    return unreadable(error);
  }

  if (success) {
    unlockAttempt = 0;
    console.log('loaded from disk');
    // Wallets start talking to their nodes right after unlock: read the saved
    // node overrides first, so none of them is built for the default node (H19).
    await loadDepinRpcOverrides().catch(error => console.warn('reading node settings failed; retried on first use:', error?.message));
    // Records of an unknown type are usually pre-fork Bitcoin wallets and are
    // kept silently; a Neurai record that fails to parse deserves a notice.
    if (BlueApp.getPreservedRecords().some(record => record.reason === 'unreadable')) {
      presentAlert({ message: loc.settings.storage_preserved_records });
    }
    return 'unlocked';
  }

  // Only an encrypted store returns false: the password opened no bucket.
  unlockAttempt++;
  if (unlockAttempt >= 10 && Platform.OS === 'ios') {
    unlockAttempt = 0;
    showKeychainWipeAlert();
  }
  return 'wrong_password';
};

export default BlueApp;
