import React, { Component } from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Appearance, StatusBar, ActivityIndicator } from 'react-native';
import { Icon } from 'react-native-elements';
import Biometric from './class/biometrics';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as NavigationService from './NavigationService';
import { StackActions } from '@react-navigation/native';
import PropTypes from 'prop-types';
import { BlueStorageContext } from './blue_modules/storage-context';
/** @type {AppStorage} */

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 2,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qrCode: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrCodeImage: {
    width: 120,
    height: 120,
  },
  biometric: {
    flex: 0.2,
    justifyContent: 'flex-end',
    marginBottom: 58,
  },
  biometricRow: {
    justifyContent: 'center',
    flexDirection: 'row',
  },
  icon: {
    width: 64,
    height: 64,
  },
  encrypted: {
    width: 0.5,
    height: 20,
  },
});

export default class UnlockWith extends Component {
  state = { biometricType: false, isStorageEncrypted: false, isAuthenticating: false, appearance: Appearance.getColorScheme() };
  static contextType = BlueStorageContext;

  async componentDidMount() {
    Appearance.addChangeListener(this.appearanceChanged);
    let biometricType = false;
    if (await Biometric.isBiometricUseCapableAndEnabled()) {
      biometricType = await Biometric.biometricType();
    }
    const storageIsEncrypted = await this.context.isStorageEncrypted();
    this.setState({ biometricType, isStorageEncrypted: storageIsEncrypted }, async () => {
      if (this.props.route.params.unlockOnComponentMount) {
        if (!biometricType || storageIsEncrypted) {
          this.unlockWithKey();
        } else if (typeof biometricType === 'string') this.unlockWithBiometrics();
      }
    });
  }

  componentWillUnmount() {
    Appearance.removeChangeListener();
  }

  appearanceChanged = () => {
    const appearance = Appearance.getColorScheme();
    if (appearance) {
      this.setState({ appearance });
    }
  };

  successfullyAuthenticated = () => {
    this.context.setWalletsInitialized(true);
    NavigationService.dispatch(StackActions.replace('DrawerRoot'));
  };

  unlockWithBiometrics = async () => {
    if (await this.context.isStorageEncrypted()) {
      this.unlockWithKey();
    }
    this.setState({ isAuthenticating: true }, async () => {
      if (await Biometric.unlockWithBiometrics()) {
        this.setState({ isAuthenticating: false });
        await this.context.startAndDecrypt();
        return this.successfullyAuthenticated();
      }
      this.setState({ isAuthenticating: false });
    });
  };

  unlockWithKey = () => {
    this.setState({ isAuthenticating: true }, async () => {
      if (await this.context.startAndDecrypt()) {
        this.successfullyAuthenticated();
      } else {
        this.setState({ isAuthenticating: false });
      }
    });
  };

  renderUnlockOptions = () => {
    if (this.state.isAuthenticating) {
      return <ActivityIndicator />;
    } else {
      const color = this.state.appearance === 'dark' ? '#FFFFFF' : '#000000';
      if (
        (this.state.biometricType === Biometric.TouchID || this.state.biometricType === Biometric.Biometrics) &&
        !this.state.isStorageEncrypted
      ) {
        return (
          <TouchableOpacity disabled={this.state.isAuthenticating} onPress={this.unlockWithBiometrics}>
            <Icon name="fingerprint" size={64} type="font-awesome5" color={color} />
          </TouchableOpacity>
        );
      } else if (this.state.biometricType === Biometric.FaceID && !this.state.isStorageEncrypted) {
        return (
          <TouchableOpacity disabled={this.state.isAuthenticating} onPress={this.unlockWithBiometrics}>
            <Image
              source={this.state.appearance === 'dark' ? require('./img/faceid-default.png') : require('./img/faceid-dark.png')}
              style={styles.icon}
            />
          </TouchableOpacity>
        );
      } else if (this.state.isStorageEncrypted) {
        return (
          <TouchableOpacity disabled={this.state.isAuthenticating} onPress={this.unlockWithKey}>
            <Icon name="lock" size={64} type="font-awesome5" color={color} />
          </TouchableOpacity>
        );
      }
    }
  };

  render() {
    if (!this.state.biometricType && !this.state.isStorageEncrypted) {
      return <View />;
    }

    return (
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="default" />
        <View style={styles.container}>
          <View style={styles.qrCode}>
            <Image source={require('./img/qr-code.png')} style={styles.qrCodeImage} />
          </View>
          <View style={styles.biometric}>
            <View style={styles.biometricRow}>{this.renderUnlockOptions()}</View>
          </View>
        </View>
      </SafeAreaView>
    );
  }
}

UnlockWith.propTypes = {
  route: PropTypes.shape({
    params: PropTypes.shape({
      unlockOnComponentMount: PropTypes.bool,
    }),
  }),
};
