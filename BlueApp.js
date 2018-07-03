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
    // now, lets try to fetch balance and txs for first wallet if it is time for it
    let hadToRefresh = false;
    let noErr = true;
    try {
      let wallets = BlueApp.getWallets();
      if (wallets && wallets[0] && wallets[0].timeToRefresh()) {
        console.log('time to refresh wallet #0');
        let oldBalance = wallets[0].getBalance();
        await wallets[0].fetchBalance();
        if (oldBalance !== wallets[0].getBalance()) {
          // balance changed, thus txs too
          await wallets[0].fetchTransactions();
          hadToRefresh = true;
          EV(EV.enum.WALLETS_COUNT_CHANGED);
          EV(EV.enum.TRANSACTIONS_COUNT_CHANGED);
        }
      } //  end of timeToRefresh
    } catch (Err) {
      noErr = false;
      console.warn(Err);
    }

    if (hadToRefresh && noErr) {
      await BlueApp.saveToDisk(); // caching
    }
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
