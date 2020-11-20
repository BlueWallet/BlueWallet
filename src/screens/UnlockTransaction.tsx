import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { PureComponent } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';

import { icons } from 'app/assets';
import { Header, InputItem, ScreenTemplate, Button } from 'app/components';
import { CONST, RootStackParams, Route } from 'app/consts';
import { SecureStorageService } from 'app/services';
import { palette, typography } from 'app/styles';

const i18n = require('../../loc');

type Props = {
  navigation: StackNavigationProp<RootStackParams, Route.UnlockTransaction>;
  route: RouteProp<RootStackParams, Route.UnlockTransaction>;
};

interface State {
  password: string;
  error: string;
  isVisible: boolean;
  isLoading: boolean;
}

export class UnlockTransaction extends PureComponent<Props, State> {
  state = {
    password: '',
    error: '',
    isVisible: false,
    isLoading: false,
  };

  inputRef: any = React.createRef();

  onConfirm = () => {
    const { onSuccess } = this.props.route.params;
    this.setState(
      {
        isLoading: true,
      },
      async () => {
        if (await SecureStorageService.checkSecuredPassword(CONST.transactionPassword, this.state.password)) {
          onSuccess();
        } else {
          this.setState({
            isLoading: false,
            password: '',
            error: i18n.onboarding.passwordDoesNotMatch,
          });
        }
      },
    );
  };

  changeVisability = () => {
    this.setState({
      isVisible: !this.state.isVisible,
    });
  };

  updatePassword = (password: string) => this.setState({ password });

  render() {
    const { error, password, isVisible, isLoading } = this.state;
    return (
      <ScreenTemplate
        keyboardShouldPersistTaps="always"
        footer={
          <Button
            title={i18n._.confirm}
            loading={isLoading}
            onPress={this.onConfirm}
            disabled={isLoading || password.length < CONST.transactionMinPasswordLength}
          />
        }
        header={<Header navigation={this.props.navigation} title={i18n.unlockTransaction.headerText} isBackArrow />}
      >
        <Text style={styles.title}>{i18n.unlockTransaction.title}</Text>
        <Text style={styles.description}>{i18n.unlockTransaction.description}</Text>
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.visibilityIcon} onPress={this.changeVisability}>
            <Image style={styles.icon} source={!isVisible ? icons.visibilityOn : icons.visibilityOff} />
          </TouchableOpacity>
          <InputItem
            value={password}
            ref={this.inputRef}
            setValue={this.updatePassword}
            autoFocus={true}
            secureTextEntry={!isVisible}
            error={error}
          />
        </View>
      </ScreenTemplate>
    );
  }
}

const styles = StyleSheet.create({
  title: {
    ...typography.headline4,
    alignSelf: 'center',
    marginTop: 10,
  },
  inputContainer: {
    width: '100%',
    height: 80,
  },
  visibilityIcon: { position: 'absolute', right: 0, top: 30, zIndex: 3 },
  description: {
    ...typography.caption,
    color: palette.textGrey,
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 44,
    marginHorizontal: 15,
    textAlign: 'center',
  },
  icon: {
    width: 24,
    height: 24,
    padding: 8,
  },
});
