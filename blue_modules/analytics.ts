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
  try {
    // Don't try to start Bugsnag again as it's already initialized in native code.
    // Configure it only when tracking is allowed.
    const doNotTrack = await BlueApp.isDoNotTrackEnabled();
    if (doNotTrack) {
      userHasOptedOut = true;
      return;
    }

    const uniqueID = await getUniqueId();
    Bugsnag.setUser(uniqueID);
    Bugsnag.addOnError(function () {
      return !userHasOptedOut;
    });
  } catch (error) {
    // Never let analytics setup crash the app.
    console.error('Failed to initialize analytics:', error);
  }
})();

const A = async (event: string) => {};

A.setOptOut = (value: boolean) => {
  if (value) userHasOptedOut = true;
};

A.logError = (errorString: string) => {
  console.error(errorString);
  if (!userHasOptedOut) {
    try {
      Bugsnag.notify(new Error(String(errorString)));
    } catch (error) {
      console.error('Failed to report error to Bugsnag:', error);
    }
  }
};

export default A;
