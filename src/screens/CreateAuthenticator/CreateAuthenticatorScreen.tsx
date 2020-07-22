import { CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { Component } from 'react';
import { Text, StyleSheet, Alert } from 'react-native';
import { connect } from 'react-redux';

import { Header, ScreenTemplate, FlatButton, Button } from 'app/components';
import {
  Route,
  Authenticator as IAuthenticator,
  MainTabNavigatorParams,
  MainCardStackNavigatorParams,
} from 'app/consts';
import { CreateMessage, MessageType } from 'app/helpers/MessageCreator';
import { actions } from 'app/state/authenticators';
import { palette, typography } from 'app/styles';

const i18n = require('../../../loc');

interface ActionProps {
  createAuthenticator: Function;
}
interface Props extends ActionProps {
  navigation: CompositeNavigationProp<
    StackNavigationProp<MainTabNavigatorParams, Route.AuthenticatorList>,
    StackNavigationProp<MainCardStackNavigatorParams, Route.CreateAuthenticator>
  >;
}

class CreateAuthenticatorScreen extends Component<Props> {
  scanQRCode = () => {
    const { navigation } = this.props;
    navigation.navigate(Route.ScanQrCode, {
      onBarCodeScan: (data: string) => {
        navigation.goBack();
        CreateMessage({
          title: i18n.message.creatingAuthenticator,
          description: i18n.message.creatingAuthenticatorDescription,
          type: MessageType.processingState,
          asyncTask: () => this.createAuthenticator(data),
        });
      },
    });
  };

  onCreateAuthenticatorFailure = (error: string) => {
    const { navigation } = this.props;

    Alert.alert('Error', error, [
      {
        text: 'OK',
        onPress: () => {
          navigation.navigate(Route.CreateAuthenticator);
        },
      },
    ]);
  };

  createAuthenticator = (json: string) => {
    const { navigation, createAuthenticator } = this.props;
    try {
      const data = JSON.parse(json);
      if (!data.entropy || !data.name) {
        throw new Error('Invalid data');
      }
      createAuthenticator(data, {
        onSuccess: (authenticator: IAuthenticator) => navigation.navigate(Route.EnterPIN, { id: authenticator.id }),
        onFailure: (error: string) => this.onCreateAuthenticatorFailure(error),
      });
    } catch (_) {
      this.onCreateAuthenticatorFailure(i18n.wallets.errors.invalidPrivateKey);
    }
  };

  navigateToImport = () => {
    const { navigation } = this.props;
    navigation.navigate(Route.ImportAuthenticator);
  };

  render() {
    return (
      <ScreenTemplate
        header={<Header navigation={this.props.navigation} isBackArrow title={i18n.authenticators.add.title} />}
        footer={
          <>
            <Button onPress={this.scanQRCode} title={i18n.wallets.publicKey.scan} />
            <FlatButton
              onPress={this.navigateToImport}
              containerStyle={styles.importButtonContainer}
              title={i18n.authenticators.import.title}
            />
          </>
        }
      >
        <Text style={styles.subtitle}>{i18n.authenticators.add.subtitle}</Text>
        <Text style={styles.description}>{i18n.authenticators.add.description}</Text>
        <Text style={styles.description}>{i18n._.or}</Text>
        <Text style={styles.description}>{i18n.authenticators.add.subdescription}</Text>
      </ScreenTemplate>
    );
  }
}

const mapDispatchToProps: ActionProps = {
  createAuthenticator: actions.createAuthenticator,
};

export default connect(null, mapDispatchToProps)(CreateAuthenticatorScreen);

const styles = StyleSheet.create({
  subtitle: {
    marginTop: 12,
    marginBottom: 18,
    ...typography.headline4,
    textAlign: 'center',
  },
  description: {
    marginBottom: 14,
    color: palette.textGrey,
    ...typography.caption,
    textAlign: 'center',
  },
  importButtonContainer: {
    marginTop: 12,
  },
});
