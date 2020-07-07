import { StackNavigationProp } from '@react-navigation/stack';
import React, { PureComponent } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { Header, PinInput, ScreenTemplate } from 'app/components';
import { Route, CONST, FlowType, MainCardStackNavigatorParams } from 'app/consts';
import { SecureStorageService } from 'app/services';
import { palette, typography } from 'app/styles';

const i18n = require('../../../loc');

interface Props {
  navigation: StackNavigationProp<MainCardStackNavigatorParams, Route.CurrentPin>;
  appSettings: {
    isPinSet: boolean;
  };
}

interface State {
  pin: string;
  error: string;
}

export class CurrentPinScreen extends PureComponent<Props, State> {
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
            flowType: FlowType.newPin,
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
        header={<Header navigation={this.props.navigation} isBackArrow title={i18n.onboarding.changePin} />}
      >
        <View style={styles.infoContainer}>
          <Text style={typography.headline4}>{i18n.onboarding.currentPin}</Text>
        </View>
        <View style={styles.pinContainer}>
          <PinInput value={this.state.pin} onTextChange={this.updatePin} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </ScreenTemplate>
    );
  }
}

const styles = StyleSheet.create({
  pinContainer: {
    alignItems: 'center',
  },
  infoContainer: {
    alignItems: 'center',
    marginBottom: 72,
  },
  errorText: {
    marginVertical: 10,
    color: palette.textRed,
    ...typography.headline6,
  },
});
