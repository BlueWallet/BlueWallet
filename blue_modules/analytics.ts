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
  // Don't try to start Bugsnag again as it's already initialized in native code
  // Just configure the existing instance if tracking is allowed
  const uniqueID = await getUniqueId();
  const doNotTrack = await BlueApp.isDoNotTrackEnabled();

  if (doNotTrack) {
    userHasOptedOut = true;
    return;
  }

  // Configure the existing Bugsnag instance instead of starting a new one
  Bugsnag.setUser(uniqueID);

  // Add additional configuration if needed
  Bugsnag.addOnError(function (event) {
    return !userHasOptedOut;
  });
})();

const A = async (event: string) => {};

A.setOptOut = (value: boolean) => {
  if (value) userHasOptedOut = true;
};

A.logError = (errorString: string) => {
  console.error(errorString);
  Bugsnag.notify(new Error(String(errorString)));
};

export default A;
