import React, { useEffect } from 'react';
import './shim.js';
import { AppRegistry, YellowBox } from 'react-native';
import App from './App';
YellowBox.ignoreWarnings(['Require cycle', 'Non-serializable values were', "Can't perform a React state update", '{"code":404']);

const A = require('./blue_modules/analytics');

if (!Error.captureStackTrace) {
  // captureStackTrace is only available when debugging
  Error.captureStackTrace = () => {};
}

const BlueAppComponent = () => {
  useEffect(() => {
    A(A.ENUM.INIT);
  }, []);

  return <App />;
};

AppRegistry.registerComponent('BlueWallet', () => BlueAppComponent);
