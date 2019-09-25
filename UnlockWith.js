import React, { Component } from 'react';
import { View, Image, TouchableOpacity } from 'react-native';
import { Icon } from 'react-native-elements';
import Biometric from './class/biometrics';
import PropTypes from 'prop-types';
import Biometrics from 'react-native-biometrics';
import { SafeAreaView } from 'react-navigation';
/** @type {AppStorage} */

const BlueApp = require('./BlueApp');

export default class UnlockWith extends Component {
  state = { biometricType: false, isStorageEncrypted: false, isAuthenticating: false };

  async componentDidMount() {
    let biometricType = false;
    const isStorageEncrypted = await BlueApp.storageIsEncrypted();
    if ((await Biometric.isBiometricUseCapableAndEnabled()) && !isStorageEncrypted) {
      biometricType = await Biometric.biometricType();
    }
    this.setState({ biometricType, isStorageEncrypted }, async () => {
      if (!biometricType) {
        await BlueApp.startAndDecrypt();
        this.props.onSuccessfullyAuthenticated();
      } else if (biometricType !== false && !isStorageEncrypted) this.unlockWithBiometrics();
    });
  }

  successfullyAuthenticated = () => {
    this.props.onSuccessfullyAuthenticated();
  };

  unlockWithBiometrics = () => {
    this.setState({ isAuthenticating: true }, async () => {
      if (await Biometric.unlockWithBiometrics()) {
        await BlueApp.startAndDecrypt();
        return this.props.onSuccessfullyAuthenticated();
      }
      this.setState({ isAuthenticating: false });
    });
  };

  render() {
    if (!this.state.biometricType && !this.state.isStorageEncrypted) {
      return <View />;
    }
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 2, justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Image source={require('./img/qr-code.png')} style={{ width: 120, height: 120 }} />
          </View>
          <View style={{ flex: 0.1, justifyContent: 'flex-end', marginBottom: 64 }}>
            <View style={{ justifyContent: 'center', flexDirection: 'row' }}>
              {this.state.biometricType === Biometrics.TouchID && (
                <>
                  <TouchableOpacity disabled={this.state.isAuthenticating} onPress={this.unlockWithBiometrics}>
                    <Image source={require('./img/fingerprint.png')} style={{ width: 64, height: 64 }} />
                  </TouchableOpacity>
                </>
              )}
              {this.state.biometricType === Biometrics.FaceID && (
                <>
                  <TouchableOpacity disabled={this.state.isAuthenticating} onPress={this.unlockWithBiometrics}>
                    <Image source={require('./img/faceid.png')} style={{ width: 64, height: 64 }} />
                  </TouchableOpacity>
                </>
              )}
              {this.state.biometricType !== false && this.state.isStorageEncrypted && (
                <View style={{ backgroundColor: 'gray', width: 0.5, height: 20, marginHorizontal: 16 }} />
              )}
              {this.state.isStorageEncrypted && (
                <>
                  <TouchableOpacity
                    disabled={this.state.isAuthenticating}
                    onPress={() => {
                      this.setState({ isAuthenticating: true }, async () => {
                        await BlueApp.startAndDecrypt();
                        this.props.onSuccessfullyAuthenticated();
                      });
                    }}
                  >
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
