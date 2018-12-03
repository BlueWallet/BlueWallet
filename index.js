import React from 'react';
import './shim.js';
import MainBottomTabs from './MainBottomTabs';
import { Sentry } from 'react-native-sentry';
import { AppRegistry } from 'react-native';
import { name as appName } from './app.json';
/** @type {AppStorage} */
let BlueApp = require('./BlueApp');
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

const RNFS = require('react-native-fs');
RNFS.readDir(RNFS.DocumentDirectoryPath + '/ExponentExperienceData')
  .then(result => {
    return result;
  })
  .then(paths => {
    paths.forEach(directory => {
      if (directory.isDirectory()) {
        RNFS.readDir(directory.path + '/RCTAsyncLocalStorage').then(localStoryDirectory => {
          localStoryDirectory.forEach(file => {
            if (file.isFile()) {
              RNFS.readFile(file.path).then(content => {
                const json = JSON.parse(content);
                if (json.hasOwnProperty('wallets')) {
                  BlueApp.wallets = BlueApp.wallets.concat(JSON.parse(json.wallets));
                  console.log(BlueApp.wallets);
                  BlueApp.saveToDisk().then(() => {
                    RNFS.unlink(RNFS.DocumentDirectoryPath + '/ExponentExperienceData');
                  });
                }
              });
            }
          });
        });
      }
    });
  });

//

AppRegistry.registerComponent(appName, () => BlueAppComponent);
