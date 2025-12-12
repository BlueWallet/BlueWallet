import { Platform } from 'react-native';

import { BlueApp as BlueAppClass } from '../class/';
import prompt from '../helpers/prompt';
import { showKeychainWipeAlert } from '../hooks/useBiometrics';
import loc from '../loc';

const BlueApp = BlueAppClass.getInstance();
// If attempt reaches 10, a wipe keychain option will be provided to the user.
let unlockAttempt = 0;

type PasswordPromptCallback = () => Promise<string | undefined>;

export const startAndDecrypt = async (retry?: boolean, passwordPrompt?: PasswordPromptCallback): Promise<boolean> => {
  // If wallets are already loaded, no need to migrate, decrypt, or load from disk.
  if (BlueApp.getWallets().length > 0) {
    return true;
  }
  await BlueApp.migrateKeys();
  let password: undefined | string;
  if (await BlueApp.storageIsEncrypted()) {
    if (passwordPrompt) {
      password = await passwordPrompt();
    } else {
      do {
        password = await prompt((retry && loc._.bad_password) || loc._.enter_password, loc._.storage_is_encrypted, false);
      } while (!password);
    }
  }
  let success = false;
  let wasException = false;
  try {
    success = await BlueApp.loadFromDisk(password);
  } catch (error) {
    // in case of exception reading from keystore, lets retry instead of assuming there is no storage and
    // proceeding with no wallets
    console.warn('exception loading from disk:', error);
    wasException = true;
  }

  if (wasException) {
    // retrying, but only once
    try {
      await new Promise(resolve => setTimeout(resolve, 3000)); // sleep
      success = await BlueApp.loadFromDisk(password);
    } catch (error) {
      console.warn('second exception loading from disk:', error);
    }
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
    // Return true because there was no wallet data in keychain. Proceed.
    return true;
  }
};

export default BlueApp;
