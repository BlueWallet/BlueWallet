import React, { Component } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import PropTypes from 'prop-types';
import RNFS from 'react-native-fs';
import RNSecureKeyStore, { ACCESSIBLE } from 'react-native-secure-key-store';

const expoDataDirectory = RNFS.DocumentDirectoryPath + '/ExponentExperienceData/%40overtorment%2Fbluewallet/RCTAsyncLocalStorage';

export default class WalletMigrate extends Component {
  componentDidMount() {
    this.migrateDataFromExpo();
  }

  migrationComplete() {
    console.log('Migration was successful. Exiting migration...');
    this.props.onComplete();
  }

  async migrateDataToSecureKeystore() {
    try {
      const data = await AsyncStorage.getItem('data');
      if (data) {
        const isEncrypted = (await AsyncStorage.getItem('data_encrypted')) || '';
        await RNSecureKeyStore.set('data', data, { accessible: ACCESSIBLE.WHEN_UNLOCKED });
        await RNSecureKeyStore.set('data_encrypted', isEncrypted, {
          accessible: ACCESSIBLE.WHEN_UNLOCKED,
        });
        await AsyncStorage.removeItem('data');
        await AsyncStorage.removeItem('data_encrypted');
      }
    } catch (_e) {
      console.log('Nothing to migrate from AsyncStorage.');
    }
    this.migrationComplete();
  }

  // Migrate Document directory from Expo
  async migrateDataFromExpo() {
    const expoDirectoryExists = await RNFS.exists(RNFS.DocumentDirectoryPath + '/ExponentExperienceData');

    if (!expoDirectoryExists) {
      console.log('Expo data was previously migrated. Exiting migration...');
      await this.migrateDataToSecureKeystore();
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
      await RNFS.copyFile(expoDataDirectory, RNFS.DocumentDirectoryPath + '/RCTAsyncLocalStorage_V1');
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
    const files = await RNFS.readDir(expoDataDirectory);
    for (const file of files) {
      try {
        if (file.isFile()) {
          if (file.name === 'manifest.json') {
            const manifestFile = await RNFS.readFile(file.path);
            const manifestFileParsed = JSON.parse(manifestFile);
            if (manifestFileParsed.hasOwnProperty('data')) {
              if (typeof manifestFileParsed.data === 'string') {
                await AsyncStorage.setItem('data', manifestFileParsed.data);
              }
            }
            if (manifestFileParsed.hasOwnProperty('data_encrypted')) {
              if (typeof manifestFileParsed.data_encrypted === 'string') {
                await AsyncStorage.setItem('data_encrypted', manifestFileParsed.data_encrypted);
              }
            }
          } else if (file.name !== 'manifest.json') {
            const manifestFile = await RNFS.readFile(file.path);
            const manifestFileParsed = JSON.parse(manifestFile);
            if (typeof manifestFileParsed === 'object') await AsyncStorage.setItem('data', JSON.stringify(manifestFileParsed));
          }
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
    await this.migrateDataToSecureKeystore();
  }

  render() {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignContent: 'center', backgroundColor: '#ffffff' }}>
        <ActivityIndicator />
      </View>
    );
  }
}

WalletMigrate.propTypes = {
  onComplete: PropTypes.func,
};
