import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { compose, range, map, reverse } from 'lodash/fp';
import React, { Component } from 'react';
import { Text, StyleSheet, View, Alert } from 'react-native';

import { Header, ScreenTemplate, Button, FlatButton, InputItem } from 'app/components';
import { MainCardStackNavigatorParams, Route, CONST } from 'app/consts';
import { palette, typography } from 'app/styles';

import { mnemonicToKeyPair, privateKeyToKeyPair } from '../../../utils/crypto';

const i18n = require('../../../loc');

interface Props {
  navigation: StackNavigationProp<MainCardStackNavigatorParams, Route.RecoverySeed>;
  route: RouteProp<MainCardStackNavigatorParams, Route.RecoverySeed>;
}

interface State {
  mnemonic: string[];
  isLoading: boolean;
}

class RecoverySeedScreen extends Component<Props, State> {
  state = {
    mnemonic: compose(
      map(() => ''),
      range(CONST.mnemonicWordsAmount),
    )(0),
    isLoading: false,
  };

  setWordInMnemonic = (word: string, index: number) => {
    const { mnemonic } = this.state;
    const newMnemonic = [...mnemonic];
    newMnemonic[index - 1] = word.trim().toLocaleLowerCase();
    this.setState({ mnemonic: newMnemonic });
  };

  renderInputs = () => {
    const { mnemonic } = this.state;
    return compose(
      map((index: number) => (
        <InputItem
          key={index}
          label={`${index}.`}
          value={mnemonic[index - 1]}
          setValue={word => this.setWordInMnemonic(word, index)}
        />
      )),
      reverse,
      range(CONST.mnemonicWordsAmount),
    )(0);
  };

  canSubmit = () => {
    const { mnemonic } = this.state;
    return mnemonic.every(word => word !== '');
  };

  scanQRCode = () => {
    const {
      navigation,
      route: {
        params: { onSubmit },
      },
    } = this.props;

    return navigation.navigate(Route.ScanQrCode, {
      onBarCodeScan: (privateKey: string) => {
        try {
          const keyPair = privateKeyToKeyPair(privateKey);

          onSubmit(keyPair);
        } catch (_) {
          Alert.alert(i18n.wallets.errors.invalidPrivateKey);
        }
      },
    });
  };

  submit = async () => {
    const { mnemonic } = this.state;
    const { onSubmit } = this.props.route.params;

    try {
      this.setState({ isLoading: true });
      const keyPair = await mnemonicToKeyPair(mnemonic.join(' '));
      this.setState({ isLoading: false });

      onSubmit(keyPair);
    } catch (e) {
      this.setState({ isLoading: false });
      Alert.alert(e.message);
    }
  };

  render() {
    const { navigation } = this.props;
    const { subtitle, buttonText, description, onBackArrow } = this.props.route.params;

    const { isLoading } = this.state;
    return (
      <ScreenTemplate
        header={
          <Header onBackArrow={onBackArrow} navigation={navigation} isBackArrow title={i18n.send.recovery.recover} />
        }
        footer={
          <>
            <Button loading={isLoading} disabled={!this.canSubmit()} title={buttonText} onPress={this.submit} />
            <FlatButton
              containerStyle={styles.scanQRCodeButtonContainer}
              title={i18n.wallets.importWallet.scanQrCode}
              onPress={this.scanQRCode}
            />
          </>
        }
      >
        <View style={styles.inputItemContainer}>
          <Text style={styles.title}>{subtitle}</Text>
          <Text style={styles.subtitle}>{description}</Text>
          {this.renderInputs()}
        </View>
      </ScreenTemplate>
    );
  }
}

export default RecoverySeedScreen;

const styles = StyleSheet.create({
  scanQRCodeButtonContainer: {
    marginTop: 12,
  },
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
});
