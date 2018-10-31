import './shim.js';
import MainBottomTabs from './MainBottomTabs';
import Sentry from 'sentry-expo';
Sentry.config('https://23377936131848ca8003448a893cb622@sentry.io/1295736').install();

/** @type {AppStorage} */
require('./BlueApp');

if (!Error.captureStackTrace) {
  // captureStackTrace is only available when debugging
  Error.captureStackTrace = () => {};
}

export default MainBottomTabs;
