import { AppStorage } from './class';
import Biometric from './class/biometrics';
import { Platform } from 'react-native';
import loc from './loc';
const prompt = require('./blue_modules/prompt');
const currency = require('./blue_modules/currency');
const BlueElectrum = require('./blue_modules/BlueElectrum'); // eslint-disable-line @typescript-eslint/no-unused-vars
BlueElectrum.connectMain();
const BlueApp = new AppStorage();
// If attempt reaches 10, a wipe keychain option will be provided to the user.
let unlockAttempt = 0;

const startAndDecrypt = async retry => {
  console.log('startAndDecrypt');
  if (BlueApp.getWallets().length > 0) {
    console.log('App already has some wallets, so we are in already started state, exiting startAndDecrypt');
    return true;
  }
  await BlueApp.migrateKeys();
  let password = false;
  if (await BlueApp.storageIsEncrypted()) {
    do {
      password = await prompt((retry && loc._.bad_password) || loc._.enter_password, loc._.storage_is_encrypted, false);
    } while (!password);
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
    // We want to return true to let the UnlockWith screen that its ok to proceed.
    return true;
  }

  if (password) {
    // we had password and yet could not load/decrypt
    unlockAttempt++;
    if (unlockAttempt < 10 || Platform.OS !== 'ios') {
      return startAndDecrypt(true);
    } else {
      unlockAttempt = 0;
      Biometric.showKeychainWipeAlert();
      // We want to return false to let the UnlockWith screen that it is NOT ok to proceed.
      return false;
    }
  } else {
    unlockAttempt = 0;
    // Return true because there was no wallet data in keychain. Proceed.
    return true;
  }
};

BlueApp.startAndDecrypt = startAndDecrypt;
currency.init();

module.exports = BlueApp;
