/**
 * @exports {AppStorage}
 */
import { AppStorage } from './class';
import DeviceQuickActions from './class/quick-actions';
let prompt = require('./prompt');
let EV = require('./events');
let currency = require('./currency');
let loc = require('./loc');
let BlueElectrum = require('./BlueElectrum'); // eslint-disable-line

/** @type {AppStorage} */
const BlueApp = new AppStorage();

async function startAndDecrypt(retry) {
  console.log('startAndDecrypt');
  if (BlueApp.getWallets().length > 0) {
    console.log('App already has some wallets, so we are in already started state, exiting startAndDecrypt');
    return;
  }
  let password = false;
  if (await BlueApp.storageIsEncrypted()) {
    DeviceQuickActions.clearShortcutItems();
    do {
      password = await prompt((retry && loc._.bad_password) || loc._.enter_password, loc._.storage_is_encrypted, false);
    } while (!password);
  }
  let success = await BlueApp.loadFromDisk(password);
  if (success) {
    console.log('loaded from disk');
    EV(EV.enum.WALLETS_COUNT_CHANGED);
    EV(EV.enum.TRANSACTIONS_COUNT_CHANGED);
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
  }

  if (!success && password) {
    // we had password and yet could not load/decrypt
    return startAndDecrypt(true);
  }
}

BlueApp.startAndDecrypt = startAndDecrypt;
currency.startUpdater();

module.exports = BlueApp;
