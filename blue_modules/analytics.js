import * as Sentry from '@sentry/react-native';
import amplitude from 'amplitude-js';
import { getVersion, getSystemName, getUniqueId } from 'react-native-device-info';
import { Platform } from 'react-native';
const BlueApp = require('../BlueApp');

if (process.env.NODE_ENV !== 'development') {
  Sentry.init({
    dsn: 'https://23377936131848ca8003448a893cb622@sentry.io/1295736',
  });
  Sentry.setUser({ id: getUniqueId() });
}

amplitude.getInstance().init('8b7cf19e8eea3cdcf16340f5fbf16330', null, {
  useNativeDeviceInfo: true,
  platform: getSystemName().toLocaleLowerCase().includes('mac') ? getSystemName() : Platform.OS,
});
amplitude.getInstance().setVersionName(getVersion());
amplitude.getInstance().options.apiEndpoint = 'api2.amplitude.com';
BlueApp.isDoNotTrackEnabled().then(value => {
  if (value) Sentry.close();
  amplitude.getInstance().setOptOut(value);
});

const A = async event => {
  console.log('posting analytics...', event);
  try {
    amplitude.getInstance().logEvent(event);
  } catch (err) {
    console.log(err);
  }
};

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
  return amplitude.getInstance().setOptOut(value);
};

module.exports = A;
