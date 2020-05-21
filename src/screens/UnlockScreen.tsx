import React, { PureComponent } from 'react';
import { StyleSheet, KeyboardAvoidingView, Alert } from 'react-native';
import { NavigationScreenProps, NavigationInjectedProps } from 'react-navigation';
import { connect } from 'react-redux';

import { images } from 'app/assets';
import { Header, PinInput, Image, InputItem } from 'app/components';
import { CONST } from 'app/consts';
import { BiometricService, SecureStorageService } from 'app/services';
import { ApplicationState } from 'app/state';
import { palette } from 'app/styles';

const BlueApp = require('../../BlueApp');
const i18n = require('../../loc');

interface Props extends NavigationInjectedProps<{ onSuccess: () => void; flowType: string }> {
  onSuccessfullyAuthenticated?: () => void;
  isBiometricEnabledByUser: boolean;
  appSettings?: any;
}

class UnlockScreen extends PureComponent<Props> {
  static navigationOptions = (props: NavigationScreenProps) => ({
    header: <Header navigation={props.navigation} title={i18n.unlock.title} />,
  });
  state = {
    pin: '',
    showInput: true,
  };

  inputRef: any = React.createRef();

  async componentDidMount() {
    await BlueApp.startAndDecrypt();
    if (this.props.navigation && this.props.navigation.getParam('flowType') === 'password') {
      return this.openKeyboard();
    }
    if (this.props.isBiometricEnabledByUser || this.props.appSettings.isBiometricsEnabled) {
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

  updatePassword = (password: string) => {
    const onSuccessFn = this.props.navigation.getParam('onSuccess');
    this.setState({ pin: password }, async () => {
      if (this.state.pin.length === CONST.transactionPasswordLength) {
        if (await SecureStorageService.checkSecuredPassword('transactionPassword', this.state.pin)) {
          onSuccessFn();
        } else {
          Alert.alert('wrong password');
          this.setState({
            pin: '',
          });
        }
      }
    });
  };

  updatePin = (pin: string) => {
    this.setState({ pin }, async () => {
      if (this.state.pin.length === CONST.pinCodeLength) {
        const setPin = await SecureStorageService.getSecuredValue('pin');
        if (setPin === this.state.pin) {
          this.props.onSuccessfullyAuthenticated && this.props.onSuccessfullyAuthenticated();
        } else {
          Alert.alert('wrong pin');
          this.setState({
            pin: '',
          });
        }
      }
    });
  };

  openKeyboard = () => {
    if (this.inputRef.current && this.props.navigation && this.props.navigation.getParam('flowType') === 'password') {
      this.inputRef.current.inputItemRef.current.focus();
    }
  };

  render() {
    const isPassword = this.props.navigation && !!this.props.navigation.getParam('flowType');
    return (
      <KeyboardAvoidingView style={styles.container} behavior="height">
        <Image source={images.portraitLogo} style={styles.logo} resizeMode="contain" />
        {isPassword ? (
          <InputItem label="password" value={this.state.pin} setValue={this.updatePassword} ref={this.inputRef} />
        ) : (
          this.state.showInput && <PinInput value={this.state.pin} onTextChange={pin => this.updatePin(pin)} />
        )}
      </KeyboardAvoidingView>
    );
  }
}

const mapStateToProps = (state: ApplicationState) => ({
  appSettings: state.appSettings,
});

export default connect(mapStateToProps)(UnlockScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100%',
    backgroundColor: palette.white,
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 235,
  },
});
