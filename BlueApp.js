/**
 * @exports {AppStorage}
 */
import { AppStorage } from './class';
let prompt = require('./prompt');
let EV = require('./events');

/** @type {AppStorage} */
let BlueApp = new AppStorage();

async function startAndDecrypt(retry) {
  let password = false;
  if (await BlueApp.storageIsEncrypted()) {
    do {
      password = await prompt(
        (retry && 'Bad pasword, try again') || 'Enter password',
        'Your storage is encrypted. Password is required to decrypt it',
      );
    } while (!password);
  }
  let success = await BlueApp.loadFromDisk(password);
  if (success) {
    console.log('loaded from disk');
    EV(EV.enum.WALLETS_COUNT_CHANGED);
    EV(EV.enum.TRANSACTIONS_COUNT_CHANGED);
  }

  if (!success && password) {
    // we had password and yet could not load/decrypt
    return startAndDecrypt(true);
  }
}

startAndDecrypt();

module.exports = BlueApp;
