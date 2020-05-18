import React, { PureComponent } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Alert } from 'react-native';
import { NavigationScreenProps, NavigationInjectedProps } from 'react-navigation';

import { Header, PinInput } from 'app/components';
import { Route, CONST } from 'app/consts';
import { SecureStorageService } from 'app/services';
import { palette, typography } from 'app/styles';

const i18n = require('../../../loc');

interface Props extends NavigationInjectedProps {
  appSettings: {
    isPinSet: boolean;
  };
}

interface State {
  pin: string;
  error: string;
}

export class CurrentPinScreen extends PureComponent<Props, State> {
  static navigationOptions = (props: NavigationScreenProps) => ({
    header: <Header navigation={props.navigation} isBackArrow title={i18n.onboarding.changePin} />,
  });

  state = {
    pin: '',
    error: '',
  };

  updatePin = (pin: string) => {
    this.setState({ pin }, async () => {
      if (this.state.pin.length === CONST.pinCodeLength) {
        const setPin = await SecureStorageService.getSecuredValue('pin');
        if (setPin === this.state.pin) {
          this.props.navigation.navigate(Route.CreatePin, {
            flowType: 'newPin',
          });
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
    const { error } = this.state;
    return (
      <KeyboardAvoidingView style={styles.container} behavior="height">
        <Text style={typography.headline4}>{i18n.onboarding.currentPin}</Text>
        <View style={styles.input}>
          <PinInput value={this.state.pin} onTextChange={pin => this.updatePin(pin)} />

          <Text style={styles.errorText}>{error}</Text>
        </View>
      </KeyboardAvoidingView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  input: {
    alignItems: 'center',
  },
  errorText: {
    marginVertical: 30,
    color: palette.textRed,
    ...typography.headline6,
  },
});
