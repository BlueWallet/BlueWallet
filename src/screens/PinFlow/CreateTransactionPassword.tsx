import React, { PureComponent } from 'react';
import { Text, StyleSheet, KeyboardAvoidingView, View, TouchableOpacity } from 'react-native';
import { NavigationScreenProps, NavigationEvents, NavigationInjectedProps } from 'react-navigation';

import { icons } from 'app/assets';
import { Header, InputItem, Image } from 'app/components';
import { Route, CONST } from 'app/consts';
import { palette, typography } from 'app/styles';

const i18n = require('../../../loc');

interface Props extends NavigationInjectedProps {
  appSettings: {
    isPinSet: boolean;
  };
}

interface State {
  password: string;
  focused: boolean;
  isVisible: boolean;
}

export class CreateTransactionPassword extends PureComponent<Props, State> {
  static navigationOptions = (props: NavigationScreenProps) => ({
    header: <Header navigation={props.navigation} title={i18n.onboarding.onboarding} />,
  });

  state = {
    password: '',
    focused: false,
    isVisible: false,
  };

  inputRef: any = React.createRef();

  updatePassword = (password: string) => {
    this.setState({ password }, () => {
      if (this.state.password.length === CONST.transactionPasswordLength) {
        this.props.navigation.navigate(Route.ConfirmTransactionPassword, {
          password: this.state.password,
        });
        this.setState({ password: '' });
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
    const { isVisible, password } = this.state;
    return (
      <KeyboardAvoidingView style={styles.container} behavior="height">
        <NavigationEvents onDidFocus={this.openKeyboard} />
        <View style={styles.infoContainer}>
          <Text style={typography.headline4}>{i18n.onboarding.createPassword}</Text>
          <Text style={styles.pinDescription}>{i18n.onboarding.createPasswordDescription}</Text>
        </View>
        <View style={styles.inputContainer}>
          <InputItem value={password} setValue={this.updatePassword} ref={this.inputRef} secureTextEntry={!isVisible} />
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
