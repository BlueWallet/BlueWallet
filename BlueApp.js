/**
 * @exports {AppStorage}
 */
import { AppStorage } from './class';
let prompt = require('./prompt');
let EV = require('./events');
let loc = require('./loc');

/** @type {AppStorage} */
let BlueApp = new AppStorage();

async function startAndDecrypt(retry) {
  let password = false;
  if (await BlueApp.storageIsEncrypted()) {
    do {
      password = await prompt(
        (retry && loc._.bad_password) || loc._.enter_password,
        loc._.storage_is_encrypted,
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
