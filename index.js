import './bugsnag';
import './gesture-handler';
import 'react-native-get-random-values';
import './shim.js';

import React, { useEffect } from 'react';
import { AppRegistry, LogBox } from 'react-native';

import BackgroundFetch from 'react-native-background-fetch';
import App from './App';
import { restoreSavedPreferredFiatCurrencyAndExchangeFromStorage } from './blue_modules/currency';
import { headlessSwapTask } from './blue_modules/arkade-adapters/background/task-scheduler';

// Register Android headless task so swap processing can run after app termination.
BackgroundFetch.registerHeadlessTask(headlessSwapTask);

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
