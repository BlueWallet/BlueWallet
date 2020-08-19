import 'react-native-gesture-handler';

import 'intl';
import 'intl/locale-data/jsonp/en';
import './shim.js';

import React, { useEffect } from 'react';
import { AppRegistry, StatusBar } from 'react-native';
import SplashScreen from 'react-native-splash-screen';

import App from './App';

if (!Error.captureStackTrace) {
  // captureStackTrace is only available when debugging
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  Error.captureStackTrace = () => {};
}

const BlueAppComponent = () => {
  useEffect(() => {
    SplashScreen.hide();
  }, []);
  return (
    <>
      <StatusBar backgroundColor="rgba(0,0,0,0)" translucent />
      <App />
    </>
  );
};

AppRegistry.registerComponent('GoldWallet', () => BlueAppComponent);
