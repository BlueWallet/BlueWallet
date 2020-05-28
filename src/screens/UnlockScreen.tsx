import React, { PureComponent } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { NavigationScreenProps } from 'react-navigation';

import { images } from 'app/assets';
import { Header, PinInput, Image } from 'app/components';
import { CONST } from 'app/consts';
import { BiometricService, SecureStorageService } from 'app/services';
import { getStatusBarHeight, ifIphoneX, palette, typography } from 'app/styles';

const BlueApp = require('../../BlueApp');
const i18n = require('../../loc');

interface Props {
  onSuccessfullyAuthenticated?: () => void;
  isBiometricEnabledByUser: boolean;
}

interface State {
  pin: string;
  error: string;
  showInput: boolean;
}

export class UnlockScreen extends PureComponent<Props, State> {
  static navigationOptions = (props: NavigationScreenProps) => ({
    header: <Header navigation={props.navigation} title={i18n.unlock.title} />,
  });

  state: State = {
    pin: '',
    error: '',
    showInput: true,
  };

  async componentDidMount() {
    await BlueApp.startAndDecrypt();
    if (this.props.isBiometricEnabledByUser) {
      await this.unlockWithBiometrics();
    }
  }

  unlockWithBiometrics = async () => {
    if (!!BiometricService.biometryType) {
      this.setState(
        {
          showInput: false,
        },
        async () => {
          const result = await BiometricService.unlockWithBiometrics();
          if (result) {
            this.props.onSuccessfullyAuthenticated && this.props.onSuccessfullyAuthenticated();
          } else {
            this.setState({
              showInput: true,
            });
          }
        },
      );
    }
  };

  updatePin = (pin: string) => {
    this.setState({ pin }, async () => {
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

  render() {
    const { error, pin } = this.state;
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <ScrollView contentContainerStyle={styles.contentContainer}>
          <View style={styles.imageContainer}>
            <Image source={images.portraitLogo} style={styles.logo} resizeMode="contain" />
          </View>
          <KeyboardAvoidingView
            keyboardVerticalOffset={getStatusBarHeight() + 52}
            behavior={Platform.OS == 'ios' ? 'padding' : undefined}
            style={styles.pinContainer}
          >
            <PinInput value={pin} onTextChange={this.updatePin} />
            <Text style={styles.errorText}>{error}</Text>
          </KeyboardAvoidingView>
        </ScrollView>
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
    paddingBottom: ifIphoneX(50, 16),
    zIndex: 1000,
  },
  contentContainer: {
    flexGrow: 1,
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  pinContainer: {
    paddingTop: 32,
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 235,
  },
  errorText: {
    marginTop: 10,
    color: palette.textRed,
    ...typography.headline6,
  },
});
