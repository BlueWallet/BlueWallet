import Bugsnag from '@bugsnag/react-native';
import { getUniqueId } from 'react-native-device-info';

import { BlueApp as BlueAppClass } from '../class';

const BlueApp = BlueAppClass.getInstance();

/**
 * in case Bugsnag was started, but user decided to opt out while using the app, we have this
 * flag `userHasOptedOut` and we forbid logging in `onError` handler
 * @type {boolean}
 */
let userHasOptedOut: boolean = false;

(async () => {
  const uniqueID = await getUniqueId();
  const doNotTrack = await BlueApp.isDoNotTrackEnabled();

  if (doNotTrack) {
    // dont start Bugsnag at all
    return;
  }

  Bugsnag.start({
    user: {
      id: uniqueID,
    },
    onError: function (event) {
      return !userHasOptedOut;
    },
  });
})();

const A = async (event: string) => {};

A.ENUM = {
  INIT: 'INIT',
  GOT_NONZERO_BALANCE: 'GOT_NONZERO_BALANCE',
  GOT_ZERO_BALANCE: 'GOT_ZERO_BALANCE',
  CREATED_WALLET: 'CREATED_WALLET',
  CREATED_LIGHTNING_WALLET: 'CREATED_LIGHTNING_WALLET',
  APP_UNSUSPENDED: 'APP_UNSUSPENDED',
};

A.setOptOut = (value: boolean) => {
  if (value) userHasOptedOut = true;
};

A.logError = (errorString: string) => {
  console.error(errorString);
  Bugsnag.notify(new Error(String(errorString)));
};

export default A;
