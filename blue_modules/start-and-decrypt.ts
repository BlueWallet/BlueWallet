import { Platform } from 'react-native';

import { BlueApp as BlueAppClass } from '../class/blue-app';
import { showKeychainWipeAlert } from '../hooks/useKeychainAuthentication';

const BlueApp = BlueAppClass.getInstance();
// If attempt reaches 10, a wipe keychain option will be provided to the user.
let unlockAttempt = 0;

type PasswordPromptCallback = () => Promise<string | undefined>;

export const startAndDecrypt = async (
  retry?: boolean,
  passwordPrompt?: PasswordPromptCallback,
  explicitPassword?: string,
  storageEncrypted?: boolean,
  requirePersistedData = false,
): Promise<boolean> => {
  // Always validate and reload persisted storage. In-memory wallets are a
  // session cache, never proof that the current unlock attempt succeeded.
  await BlueApp.migrateKeys();
  let password: undefined | string;
  const isEncrypted = storageEncrypted ?? (await BlueApp.storageIsEncrypted());
  if (isEncrypted) {
    if (explicitPassword) {
      password = explicitPassword;
    } else if (passwordPrompt) {
      password = await passwordPrompt();
    } else {
      return false;
    }
    if (!password) return false;
  }
  let success = false;
  let loadError: unknown;
  try {
    success = await BlueApp.loadFromDisk(password);
  } catch (error) {
    // in case of exception reading from keystore, lets retry instead of assuming there is no storage and
    // proceeding with no wallets
    console.warn('exception loading from disk:', error);
    loadError = error;
  }

  if (loadError) {
    // retrying, but only once
    try {
      await new Promise(resolve => setTimeout(resolve, 3000)); // sleep
      success = await BlueApp.loadFromDisk(password);
    } catch (error) {
      console.warn('second exception loading from disk:', error);
      throw error;
    }
    if (!success) throw loadError;
  }

  if (success) {
    console.log('loaded from disk');
    return true;
  }

  if (password) {
    // we had password and yet could not load/decrypt
    unlockAttempt++;
    if (unlockAttempt < 10 || Platform.OS !== 'ios') {
      // Return false to indicate wrong password, let UI show error and retry
      return false;
    } else {
      unlockAttempt = 0;
      showKeychainWipeAlert();
      // We want to return false to let the UnlockWith screen that it is NOT ok to proceed.
      return false;
    }
  } else {
    unlockAttempt = 0;
    // A fresh installation may legitimately have no wallet data. A protected
    // app-unlock session may not: treating a missing/corrupt Keychain entry as
    // an empty installation would open navigation with the user's wallets gone.
    return !requirePersistedData;
  }
};

export default BlueApp;
