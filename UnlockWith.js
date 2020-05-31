import React, { Component } from 'react';
import { View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Icon } from 'react-native-elements';
import Biometric from './class/biometrics';
import PropTypes from 'prop-types';
import { SafeAreaView } from 'react-native-safe-area-context';
/** @type {AppStorage} */

const BlueApp = require('./BlueApp');

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
    backgroundColor: 'gray',
    width: 0.5,
    height: 20,
    marginHorizontal: 16,
  },
});

export default class UnlockWith extends Component {
  state = { biometricType: false, isStorageEncrypted: false, isAuthenticating: false };

  async componentDidMount() {
    let biometricType = false;
    if (await Biometric.isBiometricUseCapableAndEnabled()) {
      biometricType = await Biometric.biometricType();
    }
    const isStorageEncrypted = await BlueApp.storageIsEncrypted();
    this.setState({ biometricType, isStorageEncrypted }, async () => {
      if (!biometricType || isStorageEncrypted) {
        this.unlockWithKey();
      } else if (typeof biometricType === 'string') this.unlockWithBiometrics();
    });
  }

  successfullyAuthenticated = () => {
    this.props.onSuccessfullyAuthenticated();
  };

  unlockWithBiometrics = async () => {
    if (await BlueApp.storageIsEncrypted()) {
      this.unlockWithKey();
    }
    this.setState({ isAuthenticating: true }, async () => {
      if (await Biometric.unlockWithBiometrics()) {
        this.setState({ isAuthenticating: false });
        await BlueApp.startAndDecrypt();
        return this.props.onSuccessfullyAuthenticated();
      }
      this.setState({ isAuthenticating: false });
    });
  };

  unlockWithKey = () => {
    this.setState({ isAuthenticating: true }, async () => {
      await BlueApp.startAndDecrypt();
      this.props.onSuccessfullyAuthenticated();
    });
  };

  render() {
    if (!this.state.biometricType && !this.state.isStorageEncrypted) {
      return <View />;
    }
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.container}>
          <View style={styles.qrCode}>
            <Image source={require('./img/qr-code.png')} style={styles.qrCodeImage} />
          </View>
          <View style={styles.biometric}>
            <View style={styles.biometricRow}>
              {(this.state.biometricType === Biometric.TouchID || this.state.biometricType === Biometric.Biometrics) &&
                !this.state.isStorageEncrypted && (
                  <>
                    <TouchableOpacity disabled={this.state.isAuthenticating} onPress={this.unlockWithBiometrics}>
                      <Image source={require('./img/fingerprint.png')} style={styles.icon} />
                    </TouchableOpacity>
                  </>
                )}
              {this.state.biometricType === Biometric.FaceID && !this.state.isStorageEncrypted && (
                <>
                  <TouchableOpacity disabled={this.state.isAuthenticating} onPress={this.unlockWithBiometrics}>
                    <Image source={require('./img/faceid.png')} style={styles.icon} />
                  </TouchableOpacity>
                </>
              )}
              {this.state.biometricType !== false && this.state.isStorageEncrypted && <View style={styles.encrypted} />}
              {this.state.isStorageEncrypted && (
                <>
                  <TouchableOpacity disabled={this.state.isAuthenticating} onPress={this.unlockWithKey}>
                    <Icon name="key" size={64} type="font-awesome" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }
}

UnlockWith.propTypes = {
  onSuccessfullyAuthenticated: PropTypes.func,
};
