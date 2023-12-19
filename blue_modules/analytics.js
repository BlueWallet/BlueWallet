import { getUniqueId } from 'react-native-device-info';
import Bugsnag from '@bugsnag/react-native';
const BlueApp = require('../BlueApp');

/**
 * in case Bugsnag was started, but user decided to opt out while using the app, we have this
 * flag `userHasOptedOut` and we forbid logging in `onError` handler
 * @type {boolean}
 */
let userHasOptedOut = false;

if (process.env.NODE_ENV !== 'development') {
  (async () => {
    const uniqueID = await getUniqueId();
    const doNotTrack = await BlueApp.isDoNotTrackEnabled();

    if (doNotTrack) {
      // dont start Bugsnag at all
      return;
    }

    Bugsnag.start({
      collectUserIp: false,
      user: {
        id: uniqueID,
      },
      onError: function (event) {
        return !userHasOptedOut;
      },
    });
  })();
}

const A = async event => {};

A.ENUM = {
  INIT: 'INIT',
  GOT_NONZERO_BALANCE: 'GOT_NONZERO_BALANCE',
  GOT_ZERO_BALANCE: 'GOT_ZERO_BALANCE',
  CREATED_WALLET: 'CREATED_WALLET',
  CREATED_LIGHTNING_WALLET: 'CREATED_LIGHTNING_WALLET',
  APP_UNSUSPENDED: 'APP_UNSUSPENDED',
  NAVIGATED_TO_WALLETS_HODLHODL: 'NAVIGATED_TO_WALLETS_HODLHODL',
};

A.setOptOut = value => {
  if (value) userHasOptedOut = true;
};

A.logError = errorString => {
  console.error(errorString);
  Bugsnag.notify(new Error(String(errorString)));
};

module.exports = A;
