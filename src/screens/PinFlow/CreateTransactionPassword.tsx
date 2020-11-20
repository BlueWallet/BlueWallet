import { StackNavigationProp } from '@react-navigation/stack';
import React, { PureComponent } from 'react';
import { Text, StyleSheet, View, TouchableOpacity, BackHandler, NativeEventSubscription } from 'react-native';

import { icons } from 'app/assets';
import { Header, InputItem, Image, ScreenTemplate, Button } from 'app/components';
import { Route, CONST, PasswordNavigatorParams } from 'app/consts';
import { noop } from 'app/helpers/helpers';
import { palette, typography } from 'app/styles';

const i18n = require('../../../loc');

interface Props {
  navigation: StackNavigationProp<PasswordNavigatorParams, Route.CreateTransactionPassword>;
}

interface State {
  password: string;
  isVisible: boolean;
}

export class CreateTransactionPassword extends PureComponent<Props, State> {
  state = {
    password: '',
    isVisible: false,
  };
  backHandler?: NativeEventSubscription;
  inputRef = React.createRef<InputItem>();
  focusListener: Function = noop;

  updatePassword = (password: string) => {
    this.setState({ password });
  };

  componentDidMount() {
    this.backHandler = BackHandler.addEventListener('hardwareBackPress', this.backAction);
    this.focusListener = this.props.navigation.addListener('focus', this.openKeyboard);
  }

  componentWillUnmount() {
    this.backHandler && this.backHandler.remove();
    this.focusListener();
  }

  backAction = () => {
    BackHandler.exitApp();
    return true;
  };

  onSave = () => {
    this.props.navigation.navigate(Route.ConfirmTransactionPassword, {
      setPassword: this.state.password,
    });
    this.setState({ password: '' });
  };

  openKeyboard = () => {
    this.inputRef.current?.focus();
  };

  changeVisability = () => {
    this.setState({
      isVisible: !this.state.isVisible,
    });
  };

  render() {
    const { isVisible, password } = this.state;
    return (
      <ScreenTemplate
        keyboardShouldPersistTaps="always"
        footer={
          <Button
            title={i18n._.save}
            testID="submit-create-transaction-password"
            onPress={this.onSave}
            disabled={password.length < CONST.transactionMinPasswordLength}
          />
        }
        // @ts-ignore
        header={<Header navigation={this.props.navigation} title={i18n.onboarding.onboarding} />}
      >
        <View style={styles.infoContainer}>
          <Text style={typography.headline4}>{i18n.onboarding.createPassword}</Text>
          <Text style={styles.pinDescription}>{i18n.onboarding.createPasswordDescription}</Text>
        </View>
        <View style={styles.inputItemContainer}>
          <TouchableOpacity style={styles.visibilityIcon} onPress={this.changeVisability}>
            <Image style={styles.icon} source={!isVisible ? icons.visibilityOn : icons.visibilityOff} />
          </TouchableOpacity>
          <InputItem
            value={password}
            testID="create-transaction-password"
            ref={this.inputRef}
            setValue={this.updatePassword}
            autoFocus
            secureTextEntry={!isVisible}
          />
        </View>
      </ScreenTemplate>
    );
  }
}

const styles = StyleSheet.create({
  infoContainer: {
    alignItems: 'center',
  },
  pinDescription: {
    ...typography.caption,
    color: palette.textGrey,
    margin: 20,
    textAlign: 'center',
  },
  inputItemContainer: {
    paddingTop: 20,
    width: '100%',
    height: 100,
  },
  visibilityIcon: { position: 'absolute', right: 0, top: 48, zIndex: 3 },
  icon: {
    width: 24,
    height: 24,
    padding: 8,
    zIndex: 100,
  },
});
