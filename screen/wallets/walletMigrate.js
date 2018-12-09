import React, { Component } from 'react';
import { View, ActivityIndicator, AsyncStorage } from 'react-native';
import PropTypes from 'prop-types';
import RNFS from 'react-native-fs';
let EV = require('../../events');

export default class WalletMigrate extends Component {
  componentDidMount() {
    this.migrateDataFromExpo();
  }

  migrationComplete() {
    console.log('Migration was successful. Exiting migration...');
    this.props.onComplete();
  }

  // Migrate Document directory from Expo
  async migrateDataFromExpo() {
    const expoDirectoryExists = await RNFS.exists(RNFS.DocumentDirectoryPath + '/ExponentExperienceData');

    if (!expoDirectoryExists) {
      console.log('Expo data was previously migrated. Exiting migration...');
      this.migrationComplete();
      return;
    }
    try {
      await RNFS.unlink(RNFS.DocumentDirectoryPath + '/RCTAsyncLocalStorage_V1');
      console.log('/RCTAsyncLocalStorage_V1 has been deleted. Continuing...');
    } catch (error) {
      console.log(error);
      console.log('/RCTAsyncLocalStorage_V1 does not exist. Continuing...');
    }
    try {
      await RNFS.copyFile(
        RNFS.DocumentDirectoryPath + '/ExponentExperienceData/%40overtorment%2Fbluewallet/RCTAsyncLocalStorage',
        RNFS.DocumentDirectoryPath + '/RCTAsyncLocalStorage_V1',
      );
    } catch (error) {
      console.log('An error was encountered when trying to copy Expo data to /RCTAsyncLocalStorage_V1. Exiting migration...');
      console.log(error);
    }
    try {
      await RNFS.unlink(RNFS.DocumentDirectoryPath + '/RCTAsyncLocalStorage_V1/.DS_Store');
    } catch (error) {
      console.log('An error was encountered when trying to delete .DS_Store. Continuing migration...');
      console.log(error);
    }
    const files = await RNFS.readDir(RNFS.DocumentDirectoryPath + '/RCTAsyncLocalStorage_V1');
    for (const file of files) {
      try {
        if (file.isFile() && file.name !== 'manifest.json') {
          const fileParsed = JSON.parse(await RNFS.readFile(file.path));
          if (fileParsed.hasOwnProperty('wallets')) {
            await AsyncStorage.setItem('data', fileParsed);
          }
        } else if (file.isFile() && file.name === 'manifest.json') {
          const manifestFile = await RNFS.readFile(file.path);
          const manifestFileParsed = JSON.parse(manifestFile);
          await AsyncStorage.setItem('data_encrypted', manifestFileParsed.data_encrypted);
          await AsyncStorage.setItem('data', manifestFileParsed.data);
        }
      } catch (error) {
        console.log(error);
      }
    }
    try {
      await RNFS.unlink(RNFS.DocumentDirectoryPath + '/ExponentExperienceData');
      console.log('Deleted /ExponentExperienceData.');
    } catch (error) {
      console.log('An error was encountered when trying to delete /ExponentExperienceData. Exiting migration...');
      console.log(error);
    }
    this.migrationComplete();
  }

  render() {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
}

WalletMigrate.propTypes = {
  onComplete: PropTypes.func,
};
