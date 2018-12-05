/* global alert */
import React from 'react';
import './shim.js';
import MainBottomTabs from './MainBottomTabs';
import { Sentry } from 'react-native-sentry';
import { AppRegistry, AsyncStorage } from 'react-native';
import { name as appName } from './app.json';
/** @type {AppStorage} */
Sentry.config('https://23377936131848ca8003448a893cb622@sentry.io/1295736').install();

/** @type {AppStorage} */

if (!Error.captureStackTrace) {
  // captureStackTrace is only available when debugging
  Error.captureStackTrace = () => {};
}

/** @format */

class BlueAppComponent extends React.Component {
  render() {
    return <MainBottomTabs />;
  }
}

// Migrate Document directory from Expo
async function migrateDataFromExpo() {
  const RNFS = require('react-native-fs');
  const expoDirectoryExists = await RNFS.exists(RNFS.DocumentDirectoryPath + '/ExponentExperienceData');
  if (!expoDirectoryExists) {
    return;
  }
  await RNFS.unlink(RNFS.DocumentDirectoryPath + '/RCTAsyncLocalStorage_V1');
  RNFS.copyFile(
    RNFS.DocumentDirectoryPath + '/ExponentExperienceData/%40overtorment%2Fbluewallet/RCTAsyncLocalStorage',
    RNFS.DocumentDirectoryPath + '/RCTAsyncLocalStorage_V1',
  ).then(() => {
    RNFS.readDir(RNFS.DocumentDirectoryPath + '/RCTAsyncLocalStorage_V1').then(files => {
      files.forEach(file => {
        if (file.name !== 'manifest.json') {
          RNFS.readFile(file.path).then(fileContents => {
            AsyncStorage.setItem('data', fileContents).then(() => {
              RNFS.unlink(RNFS.DocumentDirectoryPath + '/ExponentExperienceData');
              alert('Previously added wallets have been imported. Please, restart the app in order to see them.');
            });
          });
        }
      });
    });
  });
}

//
migrateDataFromExpo();
AppRegistry.registerComponent(appName, () => BlueAppComponent);
