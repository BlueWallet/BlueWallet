import { AppStorage } from './class';
import Biometric from './class/biometrics';
import { Platform } from 'react-native';
import loc from './loc';
const prompt = require('./blue_modules/prompt');
const currency = require('./blue_modules/currency');
const BlueElectrum = require('./blue_modules/BlueElectrum'); // eslint-disable-line no-unused-vars
const BlueApp: AppStorage = new AppStorage();
// If attempt reaches 10, a wipe keychain option will be provided to the user.
let unlockAttempt = 0;

const startAndDecrypt = async retry => {
  console.log('startAndDecrypt');
  if (BlueApp.getWallets().length > 0) {
    console.log('App already has some wallets, so we are in already started state, exiting startAndDecrypt');
    return true;
  }
  let password = false;
  if (await BlueApp.storageIsEncrypted()) {
    do {
      password = await prompt((retry && loc._.bad_password) || loc._.enter_password, loc._.storage_is_encrypted, false);
    } while (!password);
  }
  const success = await BlueApp.loadFromDisk(password);
  if (success) {
    console.log('loaded from disk');
    // now, lets try to fetch balance and txs for first wallet if it is time for it
    /* let hadToRefresh = false;
    let noErr = true;
    try {
      let wallets = BlueApp.getWallets();
      if (wallets && wallets[0] && wallets[0].timeToRefreshBalance()) {
        console.log('time to refresh wallet #0');
        let oldBalance = wallets[0].getBalance();
        await wallets[0].fetchBalance();
        if (oldBalance !== wallets[0].getBalance() || wallets[0].getUnconfirmedBalance() !== 0 || wallets[0].timeToRefreshTransaction()) {
          // balance changed, thus txs too
          // or wallet thinks its time to reload TX list
          await wallets[0].fetchTransactions();
          hadToRefresh = true;
          EV(EV.enum.WALLETS_COUNT_CHANGED);
          EV(EV.enum.TRANSACTIONS_COUNT_CHANGED);
        } else {
          console.log('balance not changed');
        }
      } //  end of timeToRefresh
    } catch (Err) {
      noErr = false;
      console.warn(Err);
    }

    if (hadToRefresh && noErr) {
      await BlueApp.saveToDisk(); // caching
    } */
    // We want to return true to let the UnlockWith screen that its ok to proceed.
    return true;
  }

  if (!success && password) {
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
currency.startUpdater();

module.exports = BlueApp;
