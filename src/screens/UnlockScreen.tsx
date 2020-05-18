import React, { PureComponent } from 'react';
import { StyleSheet, KeyboardAvoidingView, Alert } from 'react-native';
import { NavigationScreenProps, NavigationInjectedProps } from 'react-navigation';
import { connect } from 'react-redux';

import { images } from 'app/assets';
import { Header, PinInput, Image } from 'app/components';
import { CONST } from 'app/consts';
import { BiometricService, SecureStorageService } from 'app/services';
import { ApplicationState } from 'app/state';
import { palette } from 'app/styles';

const BlueApp = require('../../BlueApp');
const i18n = require('../../loc');

interface Props extends NavigationInjectedProps<{ onSuccess: () => void }> {
  onSuccessfullyAuthenticated?: () => void;
  isBiometricEnabledByUser: boolean;
}

class UnlockScreen extends PureComponent<Props> {
  static navigationOptions = (props: NavigationScreenProps) => ({
    header: <Header navigation={props.navigation} title={i18n.unlock.title} />,
  });
  state = {
    pin: '',
    showInput: true,
  };

  async componentDidMount() {
    await BlueApp.startAndDecrypt();

    if (this.props.isBiometricEnabledByUser || this.props.appSettings.isBiometricsEnabled) {
      await this.unlockWithBiometrics();
    }
  }

  unlockWithBiometrics = async () => {
    const onSuccessFn = this.props.onSuccessfullyAuthenticated || this.props.navigation.getParam('onSuccess');
    if (!!BiometricService.biometryType) {
      this.setState(
        {
          showInput: false,
        },
        async () => {
          const result = await BiometricService.unlockWithBiometrics();
          if (result) {
            onSuccessFn();
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
    const onSuccessFn = this.props.onSuccessfullyAuthenticated || this.props.navigation.getParam('onSuccess');

    this.setState({ pin }, async () => {
      if (this.state.pin.length === CONST.pinCodeLength) {
        const setPin = await SecureStorageService.getSecuredValue('pin');
        if (setPin === this.state.pin) {
          onSuccessFn();
        } else {
          Alert.alert('wrong pin');
          this.setState({
            pin: '',
          });
        }
      }
    });
  };

  render() {
    return (
      <KeyboardAvoidingView style={styles.container} behavior="height">
        <Image source={images.portraitLogo} style={styles.logo} resizeMode="contain" />
        {this.state.showInput && <PinInput value={this.state.pin} onTextChange={pin => this.updatePin(pin)} />}
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
