/* global alert */
import React, { Component } from 'react';
import { View, Alert, Platform, TouchableOpacity } from 'react-native';
import { BlueLoading, BlueHeaderDefaultSub, BlueListItem, SafeBlueArea, BlueNavigationStyle } from '../../BlueComponents';
import PropTypes from 'prop-types';
import AsyncStorage from '@react-native-community/async-storage';
import { AppStorage } from '../../class';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let prompt = require('../../prompt');
let loc = require('../../loc');

export default class EncryptStorage extends Component {
  static navigationOptions = () => ({
    ...BlueNavigationStyle(),
    title: loc.settings.security,
  });

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      language: loc.getLanguage(),
      deleteWalletsAfterUninstall: false,
    };
  }

  async componentDidMount() {
    this.setState({
      isLoading: false,
      advancedModeEnabled: (await AsyncStorage.getItem(AppStorage.ADVANCED_MODE_ENABLED)) || false,
      storageIsEncrypted: await BlueApp.storageIsEncrypted(),
      deleteWalletsAfterUninstall: await BlueApp.isDeleteWalletAfterUninstallEnabled(),
    });
  }

  decryptStorage = async () => {
    const password = await prompt(loc.settings.password, loc._.storage_is_encrypted).catch(() => {
      this.setState({ isLoading: false });
    });
    try {
      await BlueApp.decryptStorage(password);
      this.setState({
        isLoading: false,
        storageIsEncrypted: await BlueApp.storageIsEncrypted(),
        deleteWalletAfterUninstall: await BlueApp.isDeleteWalletAfterUninstallEnabled(),
      });
    } catch (e) {
      if (password) {
        alert(loc._.bad_password);
        ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
      }
      this.setState({
        isLoading: false,
        storageIsEncrypted: await BlueApp.storageIsEncrypted(),
        deleteWalletAfterUninstall: await BlueApp.isDeleteWalletAfterUninstallEnabled(),
      });
    }
  };

  onDeleteWalletsAfterUninstallSwitch = async value => {
    await BlueApp.setResetOnAppUninstallTo(value);
    this.setState({ deleteWalletsAfterUninstall: value });
  };

  onEncryptStorageSwitch = value => {
    this.setState({ isLoading: true }, async () => {
      if (value === true) {
        let p1 = await prompt(loc.settings.password, loc.settings.password_explain).catch(() => {
          this.setState({ isLoading: false });
          p1 = undefined;
        });
        if (!p1) {
          this.setState({ isLoading: false });
          return;
        }
        let p2 = await prompt(loc.settings.password, loc.settings.retype_password).catch(() => {
          this.setState({ isLoading: false });
        });
        if (p1 === p2) {
          await BlueApp.encryptStorage(p1);
          this.setState({
            isLoading: false,
            storageIsEncrypted: await BlueApp.storageIsEncrypted(),
          });
        } else {
          this.setState({ isLoading: false });
          alert(loc.settings.passwords_do_not_match);
        }
      } else {
        Alert.alert(
          'Decrypt Storage',
          'Are you sure you want to decrypt your storage? This will allow your wallets to be accessed without a password, and remove your plausible deniability wallets.',
          [
            {
              text: loc.send.details.cancel,
              style: 'cancel',
              onPress: () => this.setState({ isLoading: false }),
            },
            {
              text: loc._.ok,
              style: 'destructive',
              onPress: this.decryptStorage,
            },
          ],
          { cancelable: false },
        );
      }
    });
  };

  render() {
    if (this.state.isLoading) {
      return <BlueLoading />;
    }

    return (
      <SafeBlueArea forceInset={{ horizontal: 'always' }} style={{ flex: 1 }}>
        <View>
          <BlueHeaderDefaultSub leftText="storage" rightComponent={null} />
          <BlueListItem
            hideChevron
            title="Encypted and Password protected"
            switchButton
            onSwitch={this.onEncryptStorageSwitch}
            switched={this.state.storageIsEncrypted}
          />
          {Platform.OS === 'ios' && this.state.storageIsEncrypted && (
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
          {this.state.storageIsEncrypted && (
            <TouchableOpacity
              disabled={!this.state.storageIsEncrypted}
              onPress={() => this.props.navigation.navigate('PlausibleDeniability')}
            >
              <BlueListItem disabled={!this.state.storageIsEncrypted} title={loc.settings.plausible_deniability} />
            </TouchableOpacity>
          )}
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
