import React, { PureComponent } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView } from 'react-native';
import { NavigationScreenProps, NavigationInjectedProps } from 'react-navigation';

import { Header, PinInput } from 'app/components';
import { Route, CONST } from 'app/consts';
import { CreateMessage, MessageType } from 'app/helpers/MessageCreator';
import { SecureStorageService } from 'app/services';
import { palette, typography } from 'app/styles';

const i18n = require('../../../loc');

type Props = NavigationInjectedProps;

type State = {
  pin: string;
  error: string;
  flowType: string;
};

export class ConfirmPinScreen extends PureComponent<Props, State> {
  static navigationOptions = (props: NavigationScreenProps) => ({
    header: (
      <Header
        navigation={props.navigation}
        isBackArrow
        title={props.navigation.getParam('flowType') === 'newPin' ? i18n.onboarding.changePin : i18n.onboarding.pin}
      />
    ),
  });

  state = {
    pin: '',
    error: '',
    flowType: '',
  };

  componentDidMount() {
    this.setState({
      flowType: this.props.navigation.getParam('flowType'),
    });
  }

  updatePin = (pin: string) => {
    this.setState({ pin }, async () => {
      if (this.state.pin.length === CONST.pinCodeLength) {
        const setPin = this.props.navigation.getParam('pin');
        if (setPin === this.state.pin) {
          await SecureStorageService.setSecuredValue('pin', this.state.pin);
          CreateMessage({
            title: i18n.contactCreate.successTitle,
            description:
              this.state.flowType === 'newPin'
                ? i18n.onboarding.successDescriptionChangedPin
                : i18n.onboarding.successDescription,
            type: MessageType.success,
            buttonProps: {
              title:
                this.state.flowType === 'newPin'
                  ? i18n.onboarding.successButtonChangedPin
                  : i18n.onboarding.successButton,
              onPress: () => {
                this.state.flowType === 'newPin'
                  ? this.props.navigation.navigate(Route.Settings)
                  : this.props.navigation.navigate(Route.Dashboard);
              },
            },
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
        <Text style={typography.headline4}>
          {this.state.flowType === 'newPin' ? i18n.onboarding.confirmNewPin : i18n.onboarding.confirmPin}
        </Text>
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
