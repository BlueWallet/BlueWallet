/* global alert */
/**
 * @exports {AppStorage}
 */
import { AppStorage } from './class';
let prompt = require('./prompt');
let EV = require('./events');

/** @type {AppStorage} */
let BlueApp = new AppStorage();

(async () => {
  let password = false;
  if (await BlueApp.storageIsEncrypted()) {
    password = await prompt(
      'Enter password',
      'Your storage is encrypted. Password is required to decrypt it',
    );
  }
  let success = await BlueApp.loadFromDisk(password);
  if (success) {
    console.log('loaded from disk');
    EV(EV.enum.WALLETS_COUNT_CHANGED);
    EV(EV.enum.TRANSACTIONS_COUNT_CHANGED);
  }

  if (!success && password) {
    // we had password and yet could not load/decrypt
    alert('Could not decrypt. Bad password.');
  }
})();

module.exports = BlueApp;
