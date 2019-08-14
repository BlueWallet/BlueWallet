/* global alert */
import React, {Component} from 'react';
import {View, Alert, Platform, TouchableOpacity} from 'react-native';
import {BlueLoading, BlueHeaderDefaultSub, BlueListItem, SafeBlueArea, BlueNavigationStyle} from '../../BlueComponents';
import PropTypes from 'prop-types';
import RNSecureKeyStore, {ACCESSIBLE} from 'react-native-secure-key-store';
import AsyncStorage from '@react-native-community/async-storage';
import {AppStorage} from '../../class';
import {StorageType} from '../../models/storageType';
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let prompt = require('../../prompt');
let loc = require('../../loc');

export default class EncryptStorage extends Component {
  static navigationOptions = () => ({
    ...BlueNavigationStyle(),
    title: loc.settings.security,
  });

  static deleteWalletAfterUninstall = 'deleteWalletAfterUninstall';

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      language: loc.getLanguage(),
    };
  }

  async componentDidMount() {
    let deleteWalletsAfterUninstall = true;
    try {
      deleteWalletsAfterUninstall = await RNSecureKeyStore.get(EncryptStorage.deleteWalletAfterUninstall);
      deleteWalletsAfterUninstall =
        deleteWalletsAfterUninstall === true || deleteWalletsAfterUninstall === '1' || deleteWalletsAfterUninstall === 1;
    } catch (_e) {
      deleteWalletsAfterUninstall = true;
    }
    this.setState({
      isLoading: false,
      advancedModeEnabled: (await AsyncStorage.getItem(AppStorage.ADVANCED_MODE_ENABLED)) || false,
      storageIsEncrypted: await BlueApp.storageIsEncrypted(),
      deleteWalletsAfterUninstall,
    });
  }

  decryptStorage = async () => {
    const password = await prompt(loc.settings.password, loc._.storage_is_encrypted).catch(() => {
      this.setState({isLoading: false});
    });
    if (BlueApp.cachedPassword === password) {
      await BlueApp.decryptStorage();
      try {
        await RNSecureKeyStore.remove(AppStorage.PLAUSABLEWALLETDATA);
        await RNSecureKeyStore.set(EncryptStorage.deleteWalletAfterUninstall, true, {accessible: ACCESSIBLE.WHEN_UNLOCKED});
      } catch (e) {
        console.log(e);
        this.setState({
          isLoading: false,
          storageIsEncrypted: await BlueApp.storageIsEncrypted(),
          deleteWalletAfterUninstall: await RNSecureKeyStore.get(EncryptStorage.deleteWalletAfterUninstall),
        });
      }
      this.setState({
        isLoading: false,
        storageIsEncrypted: await BlueApp.storageIsEncrypted(),
        deleteWalletAfterUninstall: await RNSecureKeyStore.get(EncryptStorage.deleteWalletAfterUninstall),
      });
    } else {
      this.setState({isLoading: false});
      alert(loc._.bad_password);
    }
  };

  onDeleteWalletsAfterUninstallSwitch = async value => {
    await RNSecureKeyStore.setResetOnAppUninstallTo(value);
    await RNSecureKeyStore.set(EncryptStorage.deleteWalletAfterUninstall, value, {accessible: ACCESSIBLE.WHEN_UNLOCKED});
    this.setState({deleteWalletsAfterUninstall: value});
  };

  onEncryptStorageSwitch = value => {
    this.setState({isLoading: true}, async () => {
      if (value === true) {
        let p1 = await prompt(loc.settings.password, loc.settings.password_explain).catch(() => {
          this.setState({isLoading: false});
          p1 = undefined;
        });
        if (!p1) {
          this.setState({isLoading: false});
          return;
        }
        let p2 = await prompt(loc.settings.password, loc.settings.retype_password).catch(() => {
          this.setState({isLoading: false});
        });
        if (p1 === p2) {
          await BlueApp.encryptStorage(p1);
          this.setState({
            isLoading: false,
            storageIsEncrypted: await BlueApp.storageIsEncrypted(),
          });
        } else {
          this.setState({isLoading: false});
          alert(loc.settings.passwords_do_not_match);
        }
      } else {
        Alert.alert(
          'Decrypt Storage',
          'Are you sure you want to decrypt your storage? This will also delete all your plausible deniability storages.',
          [
            {
              text: loc.send.details.cancel,
              style: 'cancel',
              onPress: () => this.setState({isLoading: false}),
            },
            {
              text: loc._.ok,
              style: 'destructive',
              onPress: this.decryptStorage,
            },
          ],
          {cancelable: false},
        );
      }
    });
  };

  render() {
    if (this.state.isLoading) {
      return <BlueLoading />;
    }

    return (
      <SafeBlueArea forceInset={{horizontal: 'always'}} style={{flex: 1}}>
        <View>
          <BlueHeaderDefaultSub leftText="storage" rightComponent={null} />
          {BlueApp.storageType === StorageType.WALLET && (
            <BlueListItem
              hideChevron
              title="Encypted and Password protected"
              switchButton
              onSwitch={this.onEncryptStorageSwitch}
              switched={this.state.storageIsEncrypted}
            />
          )}

          {Platform.OS === 'ios' && (
            <BlueListItem
              hideChevron
              disabled={!this.state.storageIsEncrypted}
              switchDisabled={!this.state.storageIsEncrypted}
              title="Delete if BlueWallet is uninstalled"
              switchButton
              onSwitch={this.onDeleteWalletsAfterUninstallSwitch}
              switched={this.state.deleteWalletsAfterUninstall}
            />
          )}
          <TouchableOpacity
            disabled={!this.state.storageIsEncrypted}
            onPress={() => this.props.navigation.navigate('PlausibleDeniability')}>
            <BlueListItem disabled={!this.state.storageIsEncrypted} title={loc.settings.plausible_deniability} />
          </TouchableOpacity>
        </View>
      </SafeBlueArea>
    );
  }
}

EncryptStorage.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    goBack: PropTypes.func,
  }),
};
