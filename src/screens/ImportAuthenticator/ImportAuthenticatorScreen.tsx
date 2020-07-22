import { StackNavigationProp } from '@react-navigation/stack';
import React, { Component } from 'react';
import { Text, StyleSheet, Alert, View } from 'react-native';
import { connect } from 'react-redux';

import { Header, ScreenTemplate, TextAreaItem, FlatButton, Button, InputItem } from 'app/components';
import { Route, CONST, MainCardStackNavigatorParams } from 'app/consts';
import { CreateMessage, MessageType } from 'app/helpers/MessageCreator';
import { actions } from 'app/state/authenticators';
import { palette, typography } from 'app/styles';

const i18n = require('../../../loc');

interface ActionProps {
  createAuthenticator: Function;
}

interface State {
  name: string;
  mnemonic: string;
  nameError: string;
  mnemonicError: string;
}

interface Props extends ActionProps {
  navigation: StackNavigationProp<MainCardStackNavigatorParams, Route.ImportAuthenticator>;
}

type DynamicState = Pick<State, keyof State>;

class ImportAuthenticatorScreen extends Component<Props, State> {
  state = {
    name: '',
    mnemonic: '',
    nameError: '',
    mnemonicError: '',
  };

  onFieldChange = (fieldName: string, validate: Function) => (val: string) => {
    const trimedVal = val.trim();
    this.setState({ [fieldName]: trimedVal } as DynamicState);

    const fieldNameError = `${fieldName}Error`;

    if (!validate(trimedVal)) {
      this.setState({ [fieldNameError]: i18n._.invalid } as DynamicState);
      return;
    }

    this.setState({ [fieldNameError]: '' } as DynamicState);
  };

  validateMnemonic = (mnemonic: string) => mnemonic.split(' ').length === CONST.mnemonicWordsAmount;

  validateName = (name: string) => !!name;

  scanQRCode = () => {
    const { navigation } = this.props;
    navigation.navigate(Route.ScanQrCode, {
      onBarCodeScan: (data: string) => {
        navigation.goBack();
        this.createImportMessage(() => this.createAuthenticatorScan(data));
      },
    });
  };

  onCreateAuthenticatorFailure = (error: string) => {
    const { navigation } = this.props;

    Alert.alert('Error', error, [
      {
        text: 'OK',
        onPress: () => {
          navigation.navigate(Route.ImportAuthenticator);
        },
      },
    ]);
  };

  createImportMessage = (asyncTask: () => void) => {
    CreateMessage({
      title: i18n.message.importingAuthenticator,
      description: i18n.message.importingAuthenticatorDescription,
      type: MessageType.processingState,
      asyncTask,
    });
  };

  createAuthenticator = (data: { name: string; mnemonic?: string; entropy?: string }) => {
    const { navigation, createAuthenticator } = this.props;
    createAuthenticator(data, {
      onSuccess: () => {
        CreateMessage({
          title: i18n.message.success,
          description: i18n.authenticators.import.success,
          type: MessageType.success,
          buttonProps: {
            title: i18n.message.returnToAuthenticators,
            onPress: () => navigation.navigate(Route.AuthenticatorList),
          },
        });
      },
      onFailure: (error: string) => this.onCreateAuthenticatorFailure(error),
    });
  };

  createAuthenticatorScan = (json: string) => {
    try {
      const data = JSON.parse(json);
      if (!data.entropy || !data.name) {
        throw new Error('Invalid data');
      }
      this.createAuthenticator(data);
    } catch (_) {
      this.onCreateAuthenticatorFailure(i18n.wallets.errors.invalidPrivateKey);
    }
  };

  createAuthenticatorForm = () => {
    const { name, mnemonic } = this.state;
    this.createImportMessage(() => this.createAuthenticator({ name, mnemonic }));
  };

  hasErrors = () => {
    const { mnemonicError, nameError } = this.state;
    return !!(nameError || mnemonicError);
  };

  canSubmit = () => {
    const { name, mnemonic } = this.state;
    return !!(name && mnemonic && !this.hasErrors());
  };

  render() {
    const { mnemonicError, nameError } = this.state;

    return (
      <ScreenTemplate
        footer={
          <>
            <Button
              disabled={!this.canSubmit()}
              title={i18n.wallets.importWallet.import}
              onPress={this.createAuthenticatorForm}
            />
            <FlatButton
              containerStyle={styles.scanQRCodeButtonContainer}
              title={i18n.wallets.importWallet.scanQrCode}
              onPress={this.scanQRCode}
            />
          </>
        }
        header={<Header navigation={this.props.navigation} isBackArrow title={i18n.authenticators.import.title} />}
      >
        <View style={styles.inputItemContainer}>
          <Text style={styles.title}>{i18n.authenticators.import.subtitle}</Text>
          <Text style={styles.subtitle}>{i18n.authenticators.import.desc1}</Text>
          <Text style={styles.subtitle}>{i18n._.or}</Text>
          <Text style={styles.subtitle}>{i18n.authenticators.import.desc2}</Text>

          <InputItem
            error={nameError}
            setValue={this.onFieldChange('name', this.validateName)}
            label={i18n.wallets.add.inputLabel}
          />
          <TextAreaItem
            error={mnemonicError}
            onChangeText={this.onFieldChange('mnemonic', this.validateMnemonic)}
            placeholder={i18n.authenticators.import.textAreaPlaceholder}
            style={styles.textArea}
          />
        </View>
      </ScreenTemplate>
    );
  }
}

const mapDispatchToProps: ActionProps = {
  createAuthenticator: actions.createAuthenticator,
};

export default connect(null, mapDispatchToProps)(ImportAuthenticatorScreen);

const styles = StyleSheet.create({
  inputItemContainer: {
    paddingTop: 16,
    width: '100%',
    flexGrow: 1,
  },
  title: {
    ...typography.headline4,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.caption,
    color: palette.textGrey,
    paddingTop: 14,
    textAlign: 'center',
  },
  textArea: {
    marginTop: '3%',
    height: 111,
  },
  scanQRCodeButtonContainer: {
    marginTop: 12,
  },
});
