import { getUniqueId } from 'react-native-device-info';
import Bugsnag from '@bugsnag/react-native';
const BlueApp = require('../BlueApp');

let userHasOptedOut = false;

if (process.env.NODE_ENV !== 'development') {
  const uniqueID = await getUniqueId();
  Bugsnag.start({
    collectUserIp: false,
    user: {
      id: uniqueID,
    },
    onError: function (event) {
      return !userHasOptedOut;
    },
  });
}

BlueApp.isDoNotTrackEnabled().then(value => {
  if (value) userHasOptedOut = true;
});

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
