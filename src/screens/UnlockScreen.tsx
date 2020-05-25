import React, { PureComponent } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NavigationScreenProps, NavigationInjectedProps } from 'react-navigation';

import { images } from 'app/assets';
import { Header, PinInput, Image, ScreenTemplate } from 'app/components';
import { CONST } from 'app/consts';
import { BiometricService, SecureStorageService } from 'app/services';
import { palette, typography } from 'app/styles';

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

  state = {
    pin: '',
    error: '',
    showInput: true,
  };

  inputRef: any = React.createRef();

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

  openKeyboard = () => {
    if (this.inputRef.current) {
      this.inputRef.current.inputItemRef.current.focus();
    }
  };

  render() {
    const { error, pin } = this.state;
    return (
      <ScreenTemplate
        contentContainer={styles.container}
        footer={
          <View style={styles.pinContainer}>
            <PinInput value={pin} onTextChange={pin => this.updatePin(pin)} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        }
      >
        <Image source={images.portraitLogo} style={styles.logo} resizeMode="contain" />
      </ScreenTemplate>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinContainer: {
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
