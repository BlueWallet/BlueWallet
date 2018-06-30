/**
 * @exports {AppStorage}
 */
import { AppStorage } from './class';
import { Amplitude } from 'expo';
import { Analytics, PageHit } from 'expo-analytics';
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

Amplitude.initialize('8b7cf19e8eea3cdcf16340f5fbf16330');
Amplitude.logEvent('INIT');
const analytics = new Analytics('UA-121673546-1');
analytics
  .hit(new PageHit('INIT'))
  .then(() => console.log('success'))
  .catch(e => console.log(e.message));

startAndDecrypt();

module.exports = BlueApp;
