import './bugsnag';
import './gesture-handler';
import 'react-native-get-random-values';
import './shim.js';

import React, { useEffect } from 'react';
import { AppRegistry, LogBox } from 'react-native';
import BackgroundFetch from 'react-native-background-fetch';

import App from './App';
import { restoreSavedPreferredFiatCurrencyAndExchangeFromStorage } from './blue_modules/currency';
import { runArkBackgroundTask } from './blue_modules/arkade-background';

// Android headless execution boots a bare JS runtime without the React tree.
// The headless task callback must be registered at module scope before
// AppRegistry.registerComponent so the symbol exists when the OS dispatches a
// terminated-process wake.
BackgroundFetch.registerHeadlessTask(async event => {
  if (event.timeout) {
    BackgroundFetch.finish(event.taskId);
    return;
  }
  await runArkBackgroundTask(event.taskId);
});

if (!Error.captureStackTrace) {
  // captureStackTrace is only available when debugging
  Error.captureStackTrace = () => {};
}

LogBox.ignoreLogs([
  'Require cycle:',
  'Battery state `unknown` and monitoring disabled, this is normal for simulators and tvOS.',
  'Open debugger to view warnings.',
  'Non-serializable values were found in the navigation state',
]);

const BlueAppComponent = () => {
  useEffect(() => {
    restoreSavedPreferredFiatCurrencyAndExchangeFromStorage().catch(error => {
      console.error('Failed to restore preferred currency and exchange rates on startup:', error);
    });
  }, []);

  return <App />;
};

AppRegistry.registerComponent('BlueWallet', () => BlueAppComponent);
