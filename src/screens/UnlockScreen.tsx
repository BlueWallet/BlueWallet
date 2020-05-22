import React, { PureComponent } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NavigationScreenProps, NavigationInjectedProps } from 'react-navigation';
import { connect } from 'react-redux';

import { images } from 'app/assets';
import { Header, PinInput, Image, InputItem, ScreenTemplate, Button } from 'app/components';
import { CONST, FlowType } from 'app/consts';
import { BiometricService, SecureStorageService } from 'app/services';
import { ApplicationState } from 'app/state';
import { palette, typography } from 'app/styles';

const BlueApp = require('../../BlueApp');
const i18n = require('../../loc');

interface Props extends NavigationInjectedProps<{ onSuccess: () => void; flowType: string }> {
  onSuccessfullyAuthenticated?: () => void;
  isBiometricEnabledByUser: boolean;
  appSettings?: any;
}

interface State {
  pin: string;
  error: string;
  showInput: boolean;
}

class UnlockScreen extends PureComponent<Props, State> {
  static navigationOptions = (props: NavigationScreenProps) => ({
    header: (
      <Header
        navigation={props.navigation}
        title={i18n.unlock.title}
        isBackArrow={props.navigation && props.navigation.getParam('flowType') === FlowType.password}
      />
    ),
  });
  state = {
    pin: '',
    error: '',
    showInput: true,
  };

  inputRef: any = React.createRef();

  async componentDidMount() {
    await BlueApp.startAndDecrypt();
    if (this.props.navigation && this.props.navigation.getParam('flowType') === FlowType.password) {
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

  onSave = async () => {
    const onSuccessFn = this.props.navigation.getParam('onSuccess');
    if (await SecureStorageService.checkSecuredPassword('transactionPassword', this.state.pin)) {
      onSuccessFn();
    } else {
      this.setState({
        pin: '',
        error: i18n.onboarding.passwordDoesNotMatch,
      });
    }
  };

  updatePassword = (password: string) => this.setState({ pin: password });

  updatePin = (pin: string) => {
    this.setState({ pin }, async () => {
      if (this.state.pin.length === CONST.pinCodeLength) {
        const setPin = await SecureStorageService.getSecuredValue('pin');
        if (setPin === this.state.pin) {
          this.props.onSuccessfullyAuthenticated && this.props.onSuccessfullyAuthenticated();
        } else {
          this.setState({
            error: i18n.onboarding.passwordDoesNotMatch,
            pin: '',
          });
        }
      }
    });
  };

  openKeyboard = () => {
    if (
      this.inputRef.current &&
      this.props.navigation &&
      this.props.navigation.getParam('flowType') === FlowType.password
    ) {
      this.inputRef.current.inputItemRef.current.focus();
    }
  };

  render() {
    const { error, pin, showInput } = this.state;
    const isPassword = this.props.navigation && !!this.props.navigation.getParam('flowType');
    return (
      <ScreenTemplate
        contentContainer={styles.container}
        footer={
          isPassword ? (
            <Button title="Save" onPress={this.onSave} disabled={pin.length < CONST.transactionMinPasswordLength} />
          ) : (
            showInput && (
              <View style={styles.pinContainer}>
                <PinInput value={pin} onTextChange={pin => this.updatePin(pin)} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )
          )
        }
      >
        <Image source={images.portraitLogo} style={styles.logo} resizeMode="contain" />
        {isPassword && (
          <View style={styles.inputItemContainer}>
            <InputItem label="password" value={pin} setValue={this.updatePassword} ref={this.inputRef} error={error} />
          </View>
        )}
      </ScreenTemplate>
    );
  }
}

const mapStateToProps = (state: ApplicationState) => ({
  appSettings: state.appSettings,
});

export default connect(mapStateToProps)(UnlockScreen);

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputItemContainer: {
    width: '100%',
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
