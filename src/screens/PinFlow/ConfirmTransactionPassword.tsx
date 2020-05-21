import React, { PureComponent } from 'react';
import { Text, StyleSheet, KeyboardAvoidingView, TouchableOpacity, View } from 'react-native';
import { NavigationScreenProps, NavigationInjectedProps, NavigationEvents } from 'react-navigation';

import { icons } from 'app/assets';
import { Header, InputItem, Image } from 'app/components';
import { Route, CONST } from 'app/consts';
import { CreateMessage, MessageType } from 'app/helpers/MessageCreator';
import { SecureStorageService } from 'app/services';
import { typography, palette } from 'app/styles';

const i18n = require('../../../loc');

type Props = NavigationInjectedProps;

type State = {
  password: string;
  error: string;
  isVisible: boolean;
};

export class ConfirmTransactionPassword extends PureComponent<Props, State> {
  static navigationOptions = (props: NavigationScreenProps) => ({
    header: <Header navigation={props.navigation} isBackArrow title={i18n.onboarding.confirmPassword} />,
  });

  state = {
    password: '',
    error: '',
    isVisible: false,
  };

  inputRef: any = React.createRef();

  componentDidMount() {
    this.openKeyboard();
  }

  updatePassword = (password: string) => {
    this.setState({ password }, async () => {
      if (this.state.password.length === CONST.transactionPasswordLength) {
        const setPassword = this.props.navigation.getParam('password');
        if (setPassword === this.state.password) {
          await SecureStorageService.setSecuredValue('transactionPassword', this.state.password, true);
          CreateMessage({
            title: i18n.contactCreate.successTitle,
            description: i18n.onboarding.successDescription,
            type: MessageType.success,
            buttonProps: {
              title: i18n.onboarding.successButton,
              onPress: () => {
                this.props.navigation.navigate(Route.Dashboard);
              },
            },
          });
        } else {
          this.setState({
            error: i18n.onboarding.pinDoesNotMatch,
            password: '',
          });
        }
      }
    });
  };

  openKeyboard = () => {
    if (this.inputRef.current) {
      this.inputRef.current.inputItemRef.current.focus();
    }
  };

  changeVisability = () => {
    this.setState({
      isVisible: !this.state.isVisible,
    });
  };

  render() {
    const { password, error, isVisible } = this.state;
    return (
      <KeyboardAvoidingView style={styles.container} behavior="height">
        <NavigationEvents onDidFocus={this.openKeyboard} />
        <View style={styles.infoContainer}>
          <Text style={typography.headline4}>{i18n.onboarding.confirmPassword}</Text>
          <Text style={styles.pinDescription}>{i18n.onboarding.createPasswordDescription}</Text>
        </View>
        <View style={styles.inputContainer}>
          <InputItem
            value={password}
            setValue={this.updatePassword}
            ref={this.inputRef}
            error={error}
            secureTextEntry={!isVisible}
          />
          <TouchableOpacity style={styles.visibilityIcon} onPress={this.changeVisability}>
            <Image style={styles.icon} source={!isVisible ? icons.visibilityOn : icons.visibilityOff} />
          </TouchableOpacity>
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
  infoContainer: {
    alignItems: 'center',
  },
  pinDescription: {
    ...typography.caption,
    color: palette.textGrey,
    margin: 20,
    textAlign: 'center',
  },
  inputContainer: { width: '90%' },
  visibilityIcon: { position: 'absolute', right: 0, bottom: 36 },
  icon: {
    width: 24,
    height: 24,
    padding: 8,
  },
});
