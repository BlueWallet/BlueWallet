import 'react-native-gesture-handler';

import 'intl';
import 'intl/locale-data/jsonp/en';
import './shim.js';
import React from 'react';
import { AppRegistry, StatusBar, YellowBox } from 'react-native';

import App from './App';
import config from './config';

YellowBox.ignoreWarnings(['Non-serializable values were found in the navigation state']);

if (!Error.captureStackTrace) {
  // captureStackTrace is only available when debugging
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  Error.captureStackTrace = () => {};
}

const BlueAppComponent = () => {
  return (
    <>
      <StatusBar backgroundColor="rgba(0,0,0,0)" translucent />
      <App />
    </>
  );
};

AppRegistry.registerComponent(config.applicationName, () => BlueAppComponent);
