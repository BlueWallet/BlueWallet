import { RouteProp, CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { PureComponent } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { connect } from 'react-redux';

import { Header, PinInput, ScreenTemplate } from 'app/components';
import { Route, CONST, FlowType, MainCardStackNavigatorParams, RootStackParams } from 'app/consts';
import { CreateMessage, MessageType } from 'app/helpers/MessageCreator';
import { createPin as createPinAction } from 'app/state/authentication/actions';
import { palette, typography } from 'app/styles';

const i18n = require('../../../loc');

type State = {
  pin: string;
  error: string;
  flowType: string;
};

interface Props {
  navigation: CompositeNavigationProp<
    StackNavigationProp<RootStackParams, Route.MainCardStackNavigator>,
    StackNavigationProp<MainCardStackNavigatorParams, Route.ConfirmPin>
  >;
  createPin: Function;
  route: RouteProp<MainCardStackNavigatorParams, Route.ConfirmPin>;
}

class ConfirmPinScreen extends PureComponent<Props, State> {
  state = {
    pin: '',
    error: '',
    flowType: '',
  };

  componentDidMount() {
    this.setState({
      flowType: this.props.route.params?.flowType,
    });
  }

  updatePin = (pin: string) => {
    const { createPin } = this.props;
    this.setState({ pin }, async () => {
      if (this.state.pin.length === CONST.pinCodeLength) {
        const setPin = this.props.route.params.pin;
        if (setPin === this.state.pin) {
          createPin(setPin, {
            onSuccess: () => {
              if (this.state.flowType === FlowType.newPin) {
                CreateMessage({
                  title: i18n.contactCreate.successTitle,
                  description: i18n.onboarding.successDescriptionChangedPin,
                  type: MessageType.success,
                  buttonProps: {
                    title: i18n.onboarding.successButtonChangedPin,
                    onPress: () => {
                      this.props.navigation.navigate(Route.MainCardStackNavigator);
                    },
                  },
                });
              } else {
                this.props.navigation.navigate(Route.CreateTransactionPassword);
              }
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
      <ScreenTemplate
        noScroll
        header={
          <Header
            // @ts-ignore
            navigation={this.props.navigation}
            isBackArrow
            title={
              this.props.route.params?.flowType === FlowType.newPin
                ? i18n.onboarding.changePin
                : i18n.onboarding.onboarding
            }
          />
        }
      >
        <View style={styles.infoContainer}>
          <Text style={typography.headline4}>
            {this.state.flowType === FlowType.newPin ? i18n.onboarding.confirmNewPin : i18n.onboarding.confirmPin}
          </Text>
          <Text style={styles.pinDescription}>{i18n.onboarding.createPinDescription}</Text>
        </View>
        <View style={styles.pinContainer}>
          <PinInput
            value={this.state.pin}
            testID="confirm-pin"
            onTextChange={this.updatePin}
            // @ts-ignore - TODO: fix it later
            navigation={this.props.navigation}
          />
          <Text testID="invalid-pin-message" style={styles.errorText}>
            {error}
          </Text>
        </View>
      </ScreenTemplate>
    );
  }
}

const mapDispatchToProps = {
  createPin: createPinAction,
};

export default connect(null, mapDispatchToProps)(ConfirmPinScreen);

const styles = StyleSheet.create({
  pinContainer: {
    alignItems: 'center',
    marginTop: 24,
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
  errorText: {
    marginVertical: 10,
    color: palette.textRed,
    ...typography.headline6,
  },
});
