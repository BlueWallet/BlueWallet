import * as Sentry from '@sentry/react-native';
import { getUniqueId } from 'react-native-device-info';
const BlueApp = require('../BlueApp');

if (process.env.NODE_ENV !== 'development') {
  Sentry.init({
    dsn: 'https://23377936131848ca8003448a893cb622@sentry.io/1295736',
  });
  Sentry.setUser({ id: getUniqueId() });
}

BlueApp.isDoNotTrackEnabled().then(value => {
  if (value) Sentry.close();
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
  if (value) Sentry.close();
};

module.exports = A;
