import React, { PureComponent } from 'react';
import { Text, StyleSheet, BackHandler, View } from 'react-native';
import { NavigationScreenProps, NavigationEvents, NavigationInjectedProps } from 'react-navigation';

import { Header, PinInput, ScreenTemplate } from 'app/components';
import { Route, CONST, FlowType } from 'app/consts';
import { typography, palette } from 'app/styles';

const i18n = require('../../../loc');

interface Props extends NavigationInjectedProps {
  appSettings: {
    isPinSet: boolean;
  };
}

interface State {
  pin: string;
  focused: boolean;
  flowType: string;
}

export class CreatePinScreen extends PureComponent<Props, State> {
  static navigationOptions = (props: NavigationScreenProps) => ({
    header: (
      <Header
        navigation={props.navigation}
        isBackArrow={props.navigation.getParam('flowType') === FlowType.newPin}
        onBackArrow={() => props.navigation.navigate(Route.Settings)}
        title={
          props.navigation.getParam('flowType') === FlowType.newPin
            ? i18n.onboarding.changePin
            : i18n.onboarding.onboarding
        }
      />
    ),
    gesturesEnabled: false,
  });

  state = {
    pin: '',
    focused: false,
    flowType: '',
  };

  pinInputRef = React.createRef<PinInput>();
  backHandler: any;

  componentDidMount() {
    this.setState({
      flowType: this.props.navigation.getParam('flowType'),
    });
    this.backHandler = BackHandler.addEventListener('hardwareBackPress', this.backAction);
  }

  componentWillUnmount() {
    this.backHandler.remove();
  }

  backAction = () => {
    this.state.flowType === FlowType.newPin ? this.props.navigation.navigate(Route.Settings) : BackHandler.exitApp();
    return true;
  };

  updatePin = (pin: string) => {
    this.setState({ pin }, async () => {
      if (this.state.pin.length === CONST.pinCodeLength) {
        this.props.navigation.navigate(Route.ConfirmPin, {
          flowType: this.state.flowType,
          pin: this.state.pin,
        });
        this.setState({
          pin: '',
        });
      }
    });
  };

  openKeyboard = () => {
    this.pinInputRef.current?.pinCodeRef.current?.inputRef.current?.focus();
  };

  render() {
    const { flowType, pin } = this.state;
    return (
      <ScreenTemplate noScroll>
        <NavigationEvents onDidFocus={this.openKeyboard} />
        <View style={styles.infoContainer}>
          <Text style={typography.headline4}>
            {flowType === FlowType.newPin ? i18n.onboarding.createNewPin : i18n.onboarding.createPin}
          </Text>
          <Text style={styles.pinDescription}>{i18n.onboarding.createPinDescription}</Text>
        </View>
        <View style={styles.pinContainer}>
          <PinInput value={pin} onTextChange={this.updatePin} ref={this.pinInputRef} />
        </View>
      </ScreenTemplate>
    );
  }
}

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
});
