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
    EV(EV.enum.WALLETS_COUNT_CHANGED);
    console.log('Migration was successful. Exiting migration...')
    this.props.onComplete();
  }

  // Migrate Document directory from Expo
  async migrateDataFromExpo() {
    const expoDirectoryExists = await RNFS.exists(RNFS.DocumentDirectoryPath + '/ExponentExperienceData');

    if (!expoDirectoryExists) {
        console.log('Expo data was previously migrated. Exiting migration...');
      this.props.onComplete();
      return;
    }
    try {
        await RNFS.unlink(RNFS.DocumentDirectoryPath + '/RCTAsyncLocalStorage_V1')
        console.log('/RCTAsyncLocalStorage_V1 has been deleted. Continuing...')
    } catch {
        console.log('/RCTAsyncLocalStorage_V1 does not exist. Continuing...')
    }
    RNFS.copyFile(
      RNFS.DocumentDirectoryPath + '/ExponentExperienceData/%40overtorment%2Fbluewallet/RCTAsyncLocalStorage',
      RNFS.DocumentDirectoryPath + '/RCTAsyncLocalStorage_V1',
    )
      .then(() => {
        RNFS.readDir(RNFS.DocumentDirectoryPath + '/RCTAsyncLocalStorage_V1').then(files => {
          files.forEach(file => {
            if (file.name !== 'manifest.json') {
              RNFS.readFile(file.path).then(fileContents => {
                AsyncStorage.setItem('data', fileContents)
                .then(() => {
                  RNFS.unlink(RNFS.DocumentDirectoryPath + '/ExponentExperienceData').then(() => this.migrationComplete());
                })
                .catch(() => {
                    console.log('An error was encountered when trying to delete /ExponentExperienceData. Exiting migration...');
                    this.props.onComplete();
                })
                .then(() => this.migrationComplete())
              });
            }
          });
        })
        .catch(error => {
            console.log('An error was encountered when trying to read the /RTCAsyncLocalStorage_V1 directory. Exiting migration...');
            console.log(error);
            this.props.onComplete();
        });
      })
      .catch(_error => this.props.onComplete());
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
