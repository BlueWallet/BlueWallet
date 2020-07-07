import React, { PureComponent } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';

import { images } from 'app/assets';
import { Image, PinView, PinInputView } from 'app/components';
import { CONST } from 'app/consts';
import { BiometricService, SecureStorageService } from 'app/services';
import { getStatusBarHeight, palette, typography } from 'app/styles';

const BlueApp = require('../../BlueApp');
const i18n = require('../../loc');

interface Props {
  onSuccessfullyAuthenticated?: () => void;
  isBiometricEnabledByUser: boolean;
}

interface State {
  pin: string;
  error: string;
}

export class UnlockScreen extends PureComponent<Props, State> {
  state: State = {
    pin: '',
    error: '',
  };

  async componentDidMount() {
    await BlueApp.startAndDecrypt();
    if (this.props.isBiometricEnabledByUser) {
      await this.unlockWithBiometrics();
    }
  }

  unlockWithBiometrics = async () => {
    if (!!BiometricService.biometryType) {
      const result = await BiometricService.unlockWithBiometrics();
      if (result) {
        this.props.onSuccessfullyAuthenticated && this.props.onSuccessfullyAuthenticated();
      }
    }
  };

  updatePin = (pin: string) => {
    this.setState({ pin: this.state.pin + pin }, async () => {
      if (this.state.pin.length === CONST.pinCodeLength) {
        const setPin = await SecureStorageService.getSecuredValue('pin');
        if (setPin === this.state.pin) {
          this.props.onSuccessfullyAuthenticated && this.props.onSuccessfullyAuthenticated();
        } else {
          this.setState({
            error: i18n.onboarding.pinDoesNotMatch,
            pin: '',
          });
        }
      }
    });
  };

  onClearPress = () => {
    this.setState({
      pin: this.state.pin.slice(0, -1),
    });
  };

  render() {
    const { error, pin } = this.state;
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.imageContainer}>
          <Image source={images.portraitLogo} style={styles.logo} resizeMode="contain" />
        </View>
        <PinView value={pin} length={CONST.pinCodeLength as number} />
        <Text style={styles.errorText}>{error}</Text>
        <PinInputView value={pin} onTextChange={this.updatePin} onClearPress={this.onClearPress} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.white,
    alignItems: 'center',
    ...StyleSheet.absoluteFillObject,
    paddingTop: getStatusBarHeight(),
    zIndex: 1000,
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  logo: {
    width: 150,
    height: 235,
  },
  errorText: {
    marginVertical: 20,
    color: palette.textRed,
    ...typography.headline6,
  },
});
