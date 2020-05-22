import React, { PureComponent } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationScreenProps, NavigationInjectedProps } from 'react-navigation';

import { Header, PinInput, ScreenTemplate } from 'app/components';
import { Route, CONST, FlowType } from 'app/consts';
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
        title={
          props.navigation.getParam('flowType') === FlowType.newPin
            ? i18n.onboarding.changePin
            : i18n.onboarding.onboarding
        }
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
          if (this.state.flowType === FlowType.newPin) {
            CreateMessage({
              title: i18n.contactCreate.successTitle,
              description: i18n.onboarding.successDescriptionChangedPin,
              type: MessageType.success,
              buttonProps: {
                title: i18n.onboarding.successButtonChangedPin,
                onPress: () => {
                  this.props.navigation.navigate(Route.Settings);
                },
              },
            });
          } else {
            this.props.navigation.navigate(Route.CreateTransactionPassword);
          }
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
      <ScreenTemplate
        contentContainer={styles.container}
        footer={
          <View style={styles.pinContainer}>
            <PinInput value={this.state.pin} onTextChange={this.updatePin} />

            <Text style={styles.errorText}>{error}</Text>
          </View>
        }
      >
        <View style={styles.infoContainer}>
          <Text style={typography.headline4}>
            {this.state.flowType === FlowType.newPin ? i18n.onboarding.confirmNewPin : i18n.onboarding.confirmPin}
          </Text>
          <Text style={styles.pinDescription}>{i18n.onboarding.createPinDescription}</Text>
        </View>
      </ScreenTemplate>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  pinContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  errorText: {
    marginVertical: 10,
    color: palette.textRed,
    ...typography.headline6,
  },
  infoContainer: {
    alignItems: 'center',
  },
  pinDescription: {
    ...typography.caption,
    color: palette.textGrey,
    margin: 20,
    textAlign: 'center',
  },
});
