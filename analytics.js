import amplitude from 'amplitude-js';
import { getVersion } from 'react-native-device-info';
import { Platform } from 'react-native';

amplitude.getInstance().init('8b7cf19e8eea3cdcf16340f5fbf16330', null, {
  useNativeDeviceInfo: true,
  platform: Platform.OS,
});
amplitude.getInstance().setVersionName(getVersion());

let A = async event => {
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
};

module.exports = A;
