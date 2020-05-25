import React, { PureComponent } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
import { NavigationScreenProps, NavigationInjectedProps } from 'react-navigation';

import { icons } from 'app/assets';
import { Header, InputItem, ScreenTemplate, Button } from 'app/components';
import { CONST } from 'app/consts';
import { SecureStorageService } from 'app/services';
import { palette, typography } from 'app/styles';

const i18n = require('../../loc');

type Props = NavigationInjectedProps<{ onSuccess: () => void }>;

interface State {
  password: string;
  error: string;
  isVisible: boolean;
}

export class UnlockTransaction extends PureComponent<Props, State> {
  static navigationOptions = (props: NavigationScreenProps) => ({
    header: <Header navigation={props.navigation} title={i18n.unlockTransaction.headerText} isBackArrow />,
  });

  state = {
    password: '',
    error: '',
    isVisible: false,
  };

  inputRef: any = React.createRef();

  onConfirm = async () => {
    const onSuccessFn = this.props.navigation.getParam('onSuccess');
    if (await SecureStorageService.checkSecuredPassword('transactionPassword', this.state.password)) {
      onSuccessFn();
    } else {
      this.setState({
        password: '',
        error: i18n.onboarding.passwordDoesNotMatch,
      });
    }
  };

  changeVisability = () => {
    this.setState({
      isVisible: !this.state.isVisible,
    });
  };

  updatePassword = (password: string) => this.setState({ password });

  render() {
    const { error, password, isVisible } = this.state;
    return (
      <ScreenTemplate
        contentContainer={styles.container}
        footer={
          <Button
            title="Confirm"
            onPress={this.onConfirm}
            disabled={password.length < CONST.transactionMinPasswordLength}
          />
        }
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
  container: {
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.headline4,
    alignSelf: 'center',
    marginTop: 10,
  },
  inputContainer: {
    width: '100%',
  },
  visibilityIcon: { position: 'absolute', right: 0, bottom: 36, zIndex: 3 },

  description: {
    ...typography.caption,
    color: palette.textGrey,
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 40,
    marginHorizontal: 15,
    textAlign: 'center',
  },
  icon: {
    width: 24,
    height: 24,
    padding: 8,
  },
});
