import './shim.js';
import MainBottomTabs from './MainBottomTabs';
import { Sentry } from 'react-native-sentry';
import { AppRegistry } from 'react-native';
import { name as appName } from './app.json';
Sentry.config('https://23377936131848ca8003448a893cb622@sentry.io/1295736').install();

/** @type {AppStorage} */

if (!Error.captureStackTrace) {
  // captureStackTrace is only available when debugging
  Error.captureStackTrace = () => {};
}

/** @format */

AppRegistry.registerComponent(appName, () => MainBottomTabs);
