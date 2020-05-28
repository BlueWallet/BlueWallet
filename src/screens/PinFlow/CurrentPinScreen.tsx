import React, { PureComponent } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationScreenProps, NavigationInjectedProps } from 'react-navigation';

import { Header, PinInput, ScreenTemplate } from 'app/components';
import { Route, CONST, FlowType } from 'app/consts';
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
        contentContainer={styles.container}
        footer={
          <View style={styles.pinContainer}>
            <PinInput value={this.state.pin} onTextChange={this.updatePin} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        }
      >
        <Text style={typography.headline4}>{i18n.onboarding.currentPin}</Text>
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
});
