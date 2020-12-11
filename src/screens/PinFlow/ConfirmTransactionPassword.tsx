import { RouteProp, CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { PureComponent } from 'react';
import { Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { connect } from 'react-redux';

import { icons, images } from 'app/assets';
import { Header, InputItem, Image, ScreenTemplate, Button } from 'app/components';
import { Route, CONST, PasswordNavigatorParams, MainTabNavigatorParams } from 'app/consts';
import {
  createTxPassword as createTxPasswordAction,
  setIsAuthenticated as setIsAuthenticatedAction,
  createTc as createTcAction,
  SetIsAuthenticatedAction,
} from 'app/state/authentication/actions';
import { typography, palette } from 'app/styles';

const i18n = require('../../../loc');

interface Props {
  navigation: CompositeNavigationProp<
    StackNavigationProp<MainTabNavigatorParams, Route.ContactList>,
    StackNavigationProp<PasswordNavigatorParams, Route.ConfirmTransactionPassword>
  >;
  createTxPassword: Function;
  setIsAuthenticated: (isAuthenticated: boolean) => SetIsAuthenticatedAction;
  route: RouteProp<PasswordNavigatorParams, Route.ConfirmTransactionPassword>;
  createTc: () => void;
}

type State = {
  password: string;
  error: string;
  isVisible: boolean;
};

class ConfirmTransactionPasswordScreen extends PureComponent<Props, State> {
  state = {
    password: '',
    error: '',
    isVisible: false,
  };

  onSave = async () => {
    const { createTxPassword, navigation, createTc } = this.props;
    const { setPassword } = this.props.route.params;
    if (setPassword === this.state.password) {
      createTc();
      createTxPassword(setPassword, {
        onSuccess: () => {
          navigation.navigate(Route.Message, {
            title: i18n.contactCreate.successTitle,
            description: i18n.onboarding.successDescription,
            testID: 'success-message',
            source: images.success,
            buttonProps: {
              title: i18n.onboarding.successButton,
              onPress: () => {
                navigation.pop();
              },
            },
          });
        },
      });
    } else {
      this.setState({
        error: i18n.onboarding.passwordDoesNotMatch,
        password: '',
      });
    }
  };

  updatePassword = (password: string) => {
    this.setState({ password });
  };

  changeVisability = () => {
    this.setState({
      isVisible: !this.state.isVisible,
    });
  };

  render() {
    const { password, error, isVisible } = this.state;
    return (
      <ScreenTemplate
        keyboardShouldPersistTaps="always"
        footer={
          <Button
            testID="submit-transaction-password-confirmation"
            title={i18n._.save}
            onPress={this.onSave}
            disabled={password.length < CONST.transactionMinPasswordLength}
          />
        }
        header={<Header isBackArrow title={i18n.onboarding.onboarding} />}
      >
        <View style={styles.infoContainer}>
          <Text style={typography.headline4}>{i18n.onboarding.confirmPassword}</Text>
          <Text style={styles.pinDescription}>{i18n.onboarding.createPasswordDescription}</Text>
        </View>
        <View style={styles.inputItemContainer}>
          <TouchableOpacity style={styles.visibilityIcon} onPress={this.changeVisability}>
            <Image style={styles.icon} source={!isVisible ? icons.visibilityOn : icons.visibilityOff} />
          </TouchableOpacity>
          <InputItem
            testID="confirm-transaction-password"
            value={password}
            setValue={this.updatePassword}
            autoFocus={true}
            error={error}
            secureTextEntry={!isVisible}
          />
        </View>
      </ScreenTemplate>
    );
  }
}

const mapDispatchToProps = {
  createTxPassword: createTxPasswordAction,
  createTc: createTcAction,
  setIsAuthenticated: setIsAuthenticatedAction,
};

export default connect(null, mapDispatchToProps)(ConfirmTransactionPasswordScreen);

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
  },
});
