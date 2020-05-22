import React, { PureComponent } from 'react';
import { Text, StyleSheet, View, TouchableOpacity } from 'react-native';
import { NavigationScreenProps, NavigationInjectedProps, NavigationEvents } from 'react-navigation';

import { icons } from 'app/assets';
import { Header, InputItem, Image, ScreenTemplate, Button } from 'app/components';
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
  isVisible: boolean;
}

export class CreateTransactionPassword extends PureComponent<Props, State> {
  static navigationOptions = (props: NavigationScreenProps) => ({
    header: <Header navigation={props.navigation} title={i18n.onboarding.onboarding} />,
  });

  state = {
    password: '',
    isVisible: false,
  };

  inputRef: any = React.createRef();
  updatePassword = (password: string) => {
    this.setState({ password });
  };

  onSave = () => {
    this.props.navigation.navigate(Route.ConfirmTransactionPassword, {
      password: this.state.password,
    });
    this.setState({ password: '' });
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
      <ScreenTemplate
        footer={
          <Button title="Save" onPress={this.onSave} disabled={password.length < CONST.transactionMinPasswordLength} />
        }
      >
        <NavigationEvents onDidFocus={this.openKeyboard} />
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
            ref={this.inputRef}
            setValue={this.updatePassword}
            autoFocus={true}
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
  },
  visibilityIcon: { position: 'absolute', right: 0, bottom: 36, zIndex: 3 },
  icon: {
    width: 24,
    height: 24,
    padding: 8,
  },
});
