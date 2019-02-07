import 'intl';
import 'intl/locale-data/jsonp/en';
import React from 'react';
import './shim.js';
import App from './App';
import { Sentry } from 'react-native-sentry';
import { AppRegistry } from 'react-native';
import { name as appName } from './app.json';
if (process.env.NODE_ENV !== 'development') {
  Sentry.config('https://23377936131848ca8003448a893cb622@sentry.io/1295736').install();
}
if(__DEV__) {
  import('./ReactotronConfig').then(() => console.log('Reactotron Configured'))
}

if (!Error.captureStackTrace) {
  // captureStackTrace is only available when debugging
  Error.captureStackTrace = () => {};
}

class BlueAppComponent extends React.Component {
  render() {
    return <App />;
  }
}

AppRegistry.registerComponent(appName, () => BlueAppComponent);
