import Bugsnag from '@bugsnag/react-native';
import { getUniqueId } from 'react-native-device-info';

import bugsnagReady from '../bugsnag';

/**
 * in case Bugsnag was started, but user decided to opt out while using the app, we have this
 * flag `userHasOptedOut` and we forbid logging in `onError` handler
 * @type {boolean}
 */
let userHasOptedOut: boolean = false;

(async () => {
  try {
    if (!(await bugsnagReady)) {
      userHasOptedOut = true;
      return;
    }

    Bugsnag.addOnError(function () {
      return !userHasOptedOut;
    });
    const uniqueID = await getUniqueId();
    if (!userHasOptedOut) Bugsnag.setUser(uniqueID);
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
  bugsnagReady
    .then(ready => {
      if (ready && !userHasOptedOut) Bugsnag.notify(new Error(String(errorString)));
    })
    .catch(error => console.error('Failed to report error to Bugsnag:', error));
};

A.leaveNavigationBreadcrumb = (screen: string) => {
  bugsnagReady
    .then(ready => {
      if (ready && !userHasOptedOut) Bugsnag.leaveBreadcrumb(screen, undefined, 'navigation');
    })
    .catch(error => console.error('Failed to leave navigation breadcrumb:', error));
};

export default A;
