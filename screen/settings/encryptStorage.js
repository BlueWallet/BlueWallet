/* global alert */
import React, { Component } from 'react';
import { ScrollView, Alert, Platform, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import {
  BlueLoading,
  BlueHeaderDefaultSub,
  BlueListItem,
  SafeBlueArea,
  BlueNavigationStyle,
  BlueSpacing20,
  BlueCard,
  BlueText,
} from '../../BlueComponents';
import PropTypes from 'prop-types';
import { AppStorage } from '../../class';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Biometric from '../../class/biometrics';
let BlueApp: AppStorage = require('../../BlueApp');
let prompt = require('../../prompt');
let loc = require('../../loc');

export default class EncryptStorage extends Component {
  static navigationOptions = () => ({
    ...BlueNavigationStyle(),
    title: 'Security',
  });

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      language: loc.getLanguage(),
      deleteWalletsAfterUninstall: false,
      biometrics: { isDeviceBiometricCapable: false, isBiometricsEnabled: false, biometricsType: '' },
    };
  }

  async componentDidMount() {
    const isBiometricsEnabled = await Biometric.isBiometricUseEnabled();
    const isDeviceBiometricCapable = await Biometric.isDeviceBiometricCapable();
    const biometricsType = (await Biometric.biometricType()) || 'biometrics';
    this.setState({
      isLoading: false,
      advancedModeEnabled: await BlueApp.isAdancedModeEnabled(),
      storageIsEncrypted: await BlueApp.storageIsEncrypted(),
      deleteWalletsAfterUninstall: await BlueApp.isDeleteWalletAfterUninstallEnabled(),
      biometrics: { isBiometricsEnabled, isDeviceBiometricCapable, biometricsType },
    });
  }

  decryptStorage = async () => {
    const password = await prompt(loc.settings.password, loc._.storage_is_encrypted).catch(() => {
      this.setState({ isLoading: false });
    });
    try {
      await BlueApp.decryptStorage(password);
      this.props.navigation.popToTop();
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
          'Are you sure you want to decrypt your storage? This will allow your wallets to be accessed without a password.',
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

  onUseBiometricSwitch = async value => {
    let isBiometricsEnabled = this.state.biometrics;
    if (await Biometric.unlockWithBiometrics()) {
      isBiometricsEnabled.isBiometricsEnabled = value;
      await Biometric.setBiometricUseEnabled(value);
      this.setState({ biometrics: isBiometricsEnabled });
    }
  };

  render() {
    if (this.state.isLoading) {
      return <BlueLoading />;
    }

    return (
      <SafeBlueArea forceInset={{ horizontal: 'always' }} style={{ flex: 1 }}>
        <ScrollView>
          {this.state.biometrics.isDeviceBiometricCapable && (
            <>
              <BlueHeaderDefaultSub leftText="biometrics" rightComponent={null} />
              <BlueListItem
                title={`Use ${this.state.biometrics.biometricsType}`}
                Component={TouchableWithoutFeedback}
                switch={{ value: this.state.biometrics.isBiometricsEnabled, onValueChange: this.onUseBiometricSwitch }}
              />
              <BlueCard>
                <BlueText>
                  {this.state.biometrics.biometricsType} will be used to confirm your identity prior to making a transaction, unlocking,
                  exporting or deleting a wallet. {this.state.biometrics.biometricsType} will not be used to unlock an encrypted storage.
                </BlueText>
              </BlueCard>
              <BlueSpacing20 />
            </>
          )}
          <BlueHeaderDefaultSub leftText="storage" rightComponent={null} />
          <BlueListItem
            testID="EncyptedAndPasswordProtected"
            hideChevron
            title="Encypted and Password protected"
            Component={TouchableWithoutFeedback}
            switch={{ onValueChange: this.onEncryptStorageSwitch, value: this.state.storageIsEncrypted }}
          />
          {Platform.OS === 'ios' && (
            <BlueListItem
              hideChevron
              title="Delete if BlueWallet is uninstalled"
              Component={TouchableWithoutFeedback}
              switch={{
                onValueChange: this.onDeleteWalletsAfterUninstallSwitch,
                value: this.state.deleteWalletsAfterUninstall,
              }}
            />
          )}
          {this.state.storageIsEncrypted && (
            <BlueListItem
              onPress={() => this.props.navigation.navigate('PlausibleDeniability')}
              disabled={!this.state.storageIsEncrypted}
              title={loc.settings.plausible_deniability}
              chevron
              testID="PlausibleDeniabilityButton"
              Component={TouchableOpacity}
            />
          )}
        </ScrollView>
      </SafeBlueArea>
    );
  }
}

EncryptStorage.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    popToTop: PropTypes.func,
    goBack: PropTypes.func,
  }),
};
