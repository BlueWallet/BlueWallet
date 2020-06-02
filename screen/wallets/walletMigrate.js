import { AppStorage } from '../../class';
import AsyncStorage from '@react-native-community/async-storage';
import RNFS from 'react-native-fs';
import RNSecureKeyStore, { ACCESSIBLE } from 'react-native-secure-key-store';

export default class WalletMigrate {
  static expoDataDirectory = RNFS.DocumentDirectoryPath + '/ExponentExperienceData/%40overtorment%2Fbluewallet/RCTAsyncLocalStorage';

  constructor(onComplete) {
    this.onComplete = onComplete;
  }

  // 0: Let's start!
  async start() {
    const isNotFirstLaunch = await AsyncStorage.getItem('RnSksIsAppInstalled');
    if (!isNotFirstLaunch) {
      try {
        console.warn('It is the first launch...')
        await RNSecureKeyStore.setResetOnAppUninstallTo(false);
        const deleteWalletsFromKeychain = await RNSecureKeyStore.get(AppStorage.DELETE_WALLET_AFTER_UNINSTALL);
        await RNSecureKeyStore.setResetOnAppUninstallTo(deleteWalletsFromKeychain === '1');
        await AsyncStorage.setItem('RnSksIsAppInstalled', '1');
      } catch (_e) {}
      await AsyncStorage.setItem('RnSksIsAppInstalled', '1');
    }
    return this.migrateDataFromExpo();
  }

  // 1: Migrate Document directory from Expo
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
      await RNFS.copyFile(WalletMigrate.expoDataDirectory, RNFS.DocumentDirectoryPath + '/RCTAsyncLocalStorage_V1');
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
    const files = await RNFS.readDir(WalletMigrate.expoDataDirectory);
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

  // 2: Migrate Data from AsyncStorage to RNSecureKeyStore
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

  // 3: We're done!
  migrationComplete() {
    console.log('Migration was successful. Exiting migration...');
    this.onComplete();
  }
}
