import { StackNavigationProp } from '@react-navigation/stack';
import React, { Component } from 'react';
import { Text, StyleSheet, Alert, View, TouchableHighlight } from 'react-native';
import { connect } from 'react-redux';

import { Header, ScreenTemplate, TextAreaItem, FlatButton, Button, InputItem } from 'app/components';
import { Route, CONST, MainCardStackNavigatorParams, Authenticator as IAuthenticator } from 'app/consts';
import { maxAuthenticatorNameLength } from 'app/consts/text';
import { CreateMessage, MessageType } from 'app/helpers/MessageCreator';
import { matchAlphanumericCharacters } from 'app/helpers/string';
import { preventScreenshots, allowScreenshots } from 'app/services/ScreenshotsService';
import { ApplicationState } from 'app/state';
import { actions, selectors } from 'app/state/authenticators';
import { palette, typography } from 'app/styles';

const i18n = require('../../../loc');

interface MapStateProps {
  authenticators: IAuthenticator[];
}

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
  authenticators: IAuthenticator[];
}

class ImportAuthenticatorScreen extends Component<Props, State> {
  state = {
    name: '',
    mnemonic: '',
    nameError: '',
    mnemonicError: '',
  };

  componentDidMount() {
    preventScreenshots();
  }

  componentWillUnmount() {
    allowScreenshots();
  }

  setMnemonic = (mnemonic: string) => {
    const trimmedMnemonic = mnemonic.trim();

    this.setState({ mnemonicError: '', mnemonic });

    if (!!!trimmedMnemonic) {
      this.setState({ mnemonicError: i18n.authenticators.errors.noEmpty });
    }

    if (trimmedMnemonic.split(' ').length !== CONST.mnemonicWordsAmount) {
      this.setState({ mnemonicError: i18n.authenticators.import.mnemonicLength });
    }
  };

  setName = (name: string) => {
    this.setState({ nameError: '', name });
    if (!!!name.trim()) {
      this.setState({ nameError: i18n.authenticators.errors.noEmpty });
    }

    if (matchAlphanumericCharacters(name)) {
      this.setState({ nameError: i18n.contactCreate.nameCannotContainSpecialCharactersError });
    }
  };

  scanQRCode = () => {
    const { navigation } = this.props;
    navigation.navigate(Route.ScanQrCode, {
      onBarCodeScan: (data: string) => {
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

  createAuthenticator = (mnemonic: string) => {
    const { navigation, createAuthenticator } = this.props;
    const { name } = this.state;
    createAuthenticator(
      { mnemonic, name: name.trim() },
      {
        onSuccess: () => {
          CreateMessage({
            title: i18n.message.hooray,
            description: i18n.authenticators.import.success,
            type: MessageType.success,
            buttonProps: {
              title: i18n.message.returnToAuthenticators,
              onPress: () => navigation.navigate(Route.AuthenticatorList),
            },
          });
        },
        onFailure: (error: string) => this.onCreateAuthenticatorFailure(error),
      },
    );
  };

  createAuthenticatorScan = (mnemonic: string) => {
    try {
      if (!mnemonic) {
        throw new Error('Invalid data');
      }
      this.createAuthenticator(mnemonic);
    } catch (_) {
      this.onCreateAuthenticatorFailure(i18n.wallets.errors.invalidPrivateKey);
    }
  };

  createAuthenticatorForm = () => {
    const { mnemonic } = this.state;
    this.createImportMessage(() => this.createAuthenticator(mnemonic));
  };

  get validationError(): string | undefined {
    const { authenticators } = this.props;
    const { name, nameError } = this.state;
    if (nameError) {
      return nameError;
    }
    const authenticatorsLabels = authenticators.map(a => a.name);
    if (authenticatorsLabels.includes(name.trim())) {
      return i18n.authenticators.import.inUseValidationError;
    }
  }

  hasErrors = () => {
    const { mnemonicError } = this.state;
    return !!(this.validationError || mnemonicError);
  };

  canSubmit = () => {
    const { name, mnemonic } = this.state;
    return !!(name && mnemonic && !this.hasErrors());
  };

  sendFeedback = () => {
    const { name } = this.state;
    if (!!!name.trim()) {
      this.setState({ nameError: i18n.authenticators.errors.noEmpty });
    }
  };

  render() {
    const { mnemonicError, name } = this.state;
    return (
      <ScreenTemplate
        footer={
          <>
            <TouchableHighlight onPress={this.sendFeedback} activeOpacity={0} underlayColor={'transparent'}>
              <Button
                testID="submit-import-authenticator-name"
                disabled={!this.canSubmit()}
                title={i18n.wallets.importWallet.import}
                onPress={this.createAuthenticatorForm}
              />
            </TouchableHighlight>
            <TouchableHighlight onPress={this.sendFeedback} activeOpacity={0} underlayColor={'transparent'}>
              <FlatButton
                testID="scan-import-authenticator-qr-code"
                containerStyle={styles.scanQRCodeButtonContainer}
                title={i18n.wallets.importWallet.scanQrCode}
                onPress={this.scanQRCode}
                disabled={!name || !!this.validationError}
              />
            </TouchableHighlight>
          </>
        }
        header={<Header isBackArrow title={i18n.authenticators.import.title} />}
      >
        <View style={styles.inputItemContainer}>
          <Text style={styles.title}>{i18n.authenticators.import.subtitle}</Text>
          <Text style={styles.subtitle}>{i18n.authenticators.import.desc1}</Text>
          <Text style={styles.subtitle}>{i18n._.or}</Text>
          <Text style={styles.subtitle}>{i18n.authenticators.import.desc2}</Text>

          <InputItem
            testID="import-authenticator-name"
            error={this.validationError}
            setValue={this.setName}
            label={i18n.wallets.add.inputLabel}
            maxLength={maxAuthenticatorNameLength}
          />
          <TextAreaItem
            testID="import-authenticator-seed-phrase"
            autoCapitalize={'none'}
            error={mnemonicError}
            onChangeText={this.setMnemonic}
            placeholder={i18n.authenticators.import.textAreaPlaceholder}
            style={styles.textArea}
          />
        </View>
      </ScreenTemplate>
    );
  }
}

const mapStateToProps = (state: ApplicationState): MapStateProps => ({
  authenticators: selectors.list(state),
});

const mapDispatchToProps: ActionProps = {
  createAuthenticator: actions.createAuthenticator,
};

export default connect(mapStateToProps, mapDispatchToProps)(ImportAuthenticatorScreen);

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
