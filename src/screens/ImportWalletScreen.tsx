import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as bip39 from 'bip39';
import React, { PureComponent } from 'react';
import { View, StyleSheet, Text, Keyboard, Alert } from 'react-native';
import { connect } from 'react-redux';

import { Header, TextAreaItem, FlatButton, ScreenTemplate, InputItem } from 'app/components';
import { Button } from 'app/components/Button';
import { Route, Wallet, MainCardStackNavigatorParams } from 'app/consts';
import { CreateMessage, MessageType } from 'app/helpers/MessageCreator';
import { isWalletLableInUse } from 'app/helpers/helpers';
import { loadWallets, WalletsActionType } from 'app/state/wallets/actions';
import { typography, palette } from 'app/styles';

import BlueApp from '../../BlueApp';
import {
  SegwitP2SHWallet,
  LegacyWallet,
  WatchOnlyWallet,
  HDSegwitP2SHWallet,
  HDLegacyP2PKHWallet,
  HDSegwitP2SHArWallet,
  HDSegwitBech32Wallet,
  HDSegwitP2SHAirWallet,
} from '../../class';
import { isElectrumVaultMnemonic } from '../../utils/crypto';

const i18n = require('../../loc');

interface Props {
  navigation: StackNavigationProp<MainCardStackNavigatorParams, Route.ImportWallet>;
  route: RouteProp<MainCardStackNavigatorParams, Route.ImportWallet>;
  loadWallets: () => Promise<WalletsActionType>;
}

interface State {
  text: string;
  label: string;
  validationError: string;
}

export class ImportWalletScreen extends PureComponent<Props, State> {
  state = {
    text: '',
    label: '',
    validationError: '',
  };

  showErrorMessageScreen = ({
    title = i18n.message.somethingWentWrong,
    description = i18n.message.somethingWentWrongWhileCreatingWallet,
    onPress = () => this.props.navigation.navigate(Route.ImportWalletChooseType),
    buttonTitle = i18n.message.returnToWalletChoose,
  }: {
    title?: string;
    description?: string;
    onPress?: () => void;
    buttonTitle?: string;
  }) =>
    CreateMessage({
      title,
      description,
      type: MessageType.error,
      buttonProps: {
        title: buttonTitle,
        onPress,
      },
    });

  showSuccessImportMessageScreen = () =>
    CreateMessage({
      title: i18n.message.hooray,
      description: i18n.message.successfullWalletImport,
      type: MessageType.success,
      buttonProps: {
        title: i18n.message.returnToDashboard,
        onPress: () => this.props.navigation.navigate(Route.Dashboard),
      },
    });

  onImportButtonPress = () => {
    Keyboard.dismiss();
    this.importMnemonic(this.state.text);
  };

  onChangeText = (mnemonic: string) => {
    this.setState({ text: mnemonic });
  };

  onLabelChange = (value: string) => {
    const validationError = isWalletLableInUse(value) ? i18n.wallets.importWallet.walletInUseValidationError : '';
    this.setState({
      label: value,
      validationError,
    });
  };

  onScanQrCodeButtonPress = () => {
    return this.props.navigation.navigate(Route.ScanQrCode, {
      onBarCodeScan: (mnemonic: string) => this.importMnemonic(mnemonic),
    });
  };

  saveWallet = async (newWallet: any) => {
    if (BlueApp.getWallets().some((wallet: Wallet) => wallet.getSecret() === newWallet.secret)) {
      this.showErrorMessageScreen({
        title: i18n.wallets.importWallet.walletInUseValidationError,
        description: i18n.wallets.importWallet.walletInUseValidationError,
        onPress: () => this.navigateToImportWallet(),
        buttonTitle: i18n.message.returnToWalletImport,
      });
    } else {
      newWallet.setLabel(this.state.label || i18n.wallets.import.imported + ' ' + newWallet.typeReadable);
      BlueApp.wallets.push(newWallet);
      await BlueApp.saveToDisk();
      this.props.loadWallets();
      this.showSuccessImportMessageScreen();
    }
  };

  showAlert = (error: string) => {
    Alert.alert('Error', error, [
      {
        text: 'OK',
      },
    ]);
  };

  createWalletMessage = (asyncTask: () => void) => {
    CreateMessage({
      title: i18n.message.creatingWallet,
      description: i18n.message.creatingWalletDescription,
      type: MessageType.processingState,
      asyncTask,
    });
  };

  createARWallet = (mnemonic: string) => {
    try {
      const wallet = new HDSegwitP2SHArWallet();
      wallet.setMnemonic(mnemonic);
      this.props.navigation.navigate(Route.IntegrateKey, {
        onBarCodeScan: (key: string) => {
          try {
            wallet.addPublicKey(key);
            this.createWalletMessage(() => {
              this.saveVaultWallet(wallet);
            });
          } catch (e) {
            this.showAlert(e.message);
          }
        },
        headerTitle: i18n.wallets.importWallet.header,
        title: i18n.wallets.importWallet.scanCancelPubKey,
        description: i18n.wallets.importWallet.scanPublicKeyDescription,
        withLink: false,
      });
    } catch (e) {
      this.showAlert(e.message);
    }
  };

  navigateToImportWallet = () => {
    const { navigation, route } = this.props;
    navigation.navigate(Route.ImportWallet, { walletType: route.params.walletType });
  };

  addInstantPublicKey = (wallet: HDSegwitP2SHAirWallet) => {
    this.props.navigation.navigate(Route.IntegrateKey, {
      onBarCodeScan: (instantPublicKey: string) => {
        try {
          wallet.addPublicKey(instantPublicKey);
          this.addRecoveryKey(wallet);
        } catch (e) {
          this.showAlert(e.message);
        }
      },
      headerTitle: i18n.wallets.importWallet.header,
      title: i18n.wallets.importWallet.scanFastPubKey,
      description: i18n.wallets.importWallet.scanPublicKeyDescription,
      withLink: false,
      onBackArrow: () => {
        this.navigateToImportWallet();
      },
    });
  };

  createAIRWallet = (mnemonic: string) => {
    try {
      const wallet = new HDSegwitP2SHAirWallet();
      wallet.setMnemonic(mnemonic);
      this.addInstantPublicKey(wallet);
    } catch (e) {
      this.showAlert(e.message);
    }
  };

  saveVaultWallet = async (wallet: HDSegwitP2SHArWallet | HDSegwitP2SHAirWallet) => {
    try {
      await wallet.generateAddresses();
      await wallet.fetchBalance();
      await wallet.fetchTransactions();
      if (wallet.getBalance() > 0 || wallet.getTransactions().length !== 0) {
        this.saveWallet(wallet);
      } else {
        this.showErrorMessageScreen({
          title: i18n.message.noTransactions,
          description: i18n.message.noTransactionsDesc,
        });
      }
    } catch (error) {
      this.showErrorMessageScreen({
        title: i18n.message.generateAddressesError,
        description: error.message,
      });
    }
  };

  renderSubtitle = () => (
    <>
      <View style={styles.arSubtitleContainer}>
        <Text style={styles.subtitle}>{i18n.wallets.importWallet.importARDescription1}</Text>
        <Text style={styles.subtitle}>{i18n._.or}</Text>
        <Text style={styles.subtitle}>{i18n.wallets.importWallet.importARDescription2}</Text>
      </View>
      <InputItem error={this.state.validationError} setValue={this.onLabelChange} label={i18n.wallets.add.inputLabel} />
    </>
  );

  addRecoveryKey = (wallet: HDSegwitP2SHAirWallet) => {
    this.props.navigation.navigate(Route.IntegrateKey, {
      onBarCodeScan: (recoveryPublicKey: string) => {
        try {
          wallet.addPublicKey(recoveryPublicKey);
          this.createWalletMessage(() => {
            this.saveVaultWallet(wallet);
          });
        } catch (error) {
          this.showAlert(error.message);
        }
      },
      withLink: false,
      headerTitle: i18n.wallets.importWallet.header,
      title: i18n.wallets.importWallet.scanCancelPubKey,
      description: i18n.wallets.importWallet.scanPublicKeyDescription,
      onBackArrow: () => {
        wallet.clearPublickKeys();
        this.addInstantPublicKey(wallet);
      },
    });
  };

  importLegacyWallet = async (trimmedMnemonic: string) => {
    try {
      // trying other wallet types
      const segwitWallet = new SegwitP2SHWallet();
      segwitWallet.setSecret(trimmedMnemonic);
      if (segwitWallet.getAddress()) {
        // ok its a valid WIF

        const legacyWallet = new LegacyWallet();
        legacyWallet.setSecret(trimmedMnemonic);

        await legacyWallet.fetchBalance();
        if (legacyWallet.getBalance() > 0) {
          // yep, its legacy we're importing
          await legacyWallet.fetchTransactions();
          return this.saveWallet(legacyWallet);
        } else {
          // by default, we import wif as Segwit P2SH
          await segwitWallet.fetchBalance();
          await segwitWallet.fetchTransactions();
          return this.saveWallet(segwitWallet);
        }
      }

      // case - WIF is valid, just has uncompressed pubkey

      const legacyWallet = new LegacyWallet();
      legacyWallet.setSecret(trimmedMnemonic);
      if (legacyWallet.getAddress()) {
        await legacyWallet.fetchBalance();
        await legacyWallet.fetchTransactions();
        return this.saveWallet(legacyWallet);
      }

      // if we're here - nope, its not a valid WIF

      const hd2 = new HDSegwitP2SHWallet();
      await hd2.setSecret(trimmedMnemonic);
      if (hd2.validateMnemonic()) {
        await hd2.fetchBalance();
        if (hd2.getBalance() > 0) {
          await hd2.fetchTransactions();
          return this.saveWallet(hd2);
        }
      }

      const hd4 = new HDSegwitBech32Wallet();
      await hd4.setSecret(trimmedMnemonic);
      if (hd4.validateMnemonic()) {
        await hd4.fetchBalance();
        if (hd4.getBalance() > 0) {
          await hd4.fetchTransactions();
          return this.saveWallet(hd4);
        }
      }

      const hd3 = new HDLegacyP2PKHWallet();
      await hd3.setSecret(trimmedMnemonic);
      if (hd3.validateMnemonic()) {
        await hd3.fetchBalance();
        if (hd3.getBalance() > 0) {
          await hd3.fetchTransactions();
          return this.saveWallet(hd3);
        }
      }

      // no balances? how about transactions count?

      if (hd2.validateMnemonic()) {
        await hd2.fetchTransactions();
        if (hd2.getTransactions().length !== 0) {
          return this.saveWallet(hd2);
        }
      }
      if (hd3.validateMnemonic()) {
        await hd3.fetchTransactions();
        if (hd3.getTransactions().length !== 0) {
          return this.saveWallet(hd3);
        }
      }
      if (hd4.validateMnemonic()) {
        await hd4.fetchTransactions();
        if (hd4.getTransactions().length !== 0) {
          return this.saveWallet(hd4);
        }
      }

      // not valid? maybe its a watch-only address?

      const watchOnly = new WatchOnlyWallet();
      watchOnly.setSecret(trimmedMnemonic);
      if (watchOnly.valid()) {
        await watchOnly.fetchTransactions();
        await watchOnly.fetchBalance();
        return this.saveWallet(watchOnly);
      }

      // nope?

      // TODO: try a raw private key
    } catch (e) {
      this.showErrorMessageScreen({ description: e.message });
    }
    this.showErrorMessageScreen({ title: i18n.message.wrongMnemonic, description: i18n.message.wrongMnemonicDesc });
    // ReactNativeHapticFeedback.trigger('notificationError', {
    //   ignoreAndroidSystemSettings: false,
    // });
    // Plan:
    // 0. check if its HDSegwitBech32Wallet (BIP84)
    // 1. check if its HDSegwitP2SHWallet (BIP49)
    // 2. check if its HDLegacyP2PKHWallet (BIP44)
    // 3. check if its HDLegacyBreadwalletWallet (no BIP, just "m/0")
    // 4. check if its Segwit WIF (P2SH)
    // 5. check if its Legacy WIF
    // 6. check if its address (watch-only wallet)
    // 7. check if its private key (segwit address P2SH) TODO
    // 7. check if its private key (legacy address) TODO
  };

  importMnemonic = (mnemonic: string) => {
    const trimmedMnemonic = mnemonic.trim().replace(/ +/g, ' ');

    if (isElectrumVaultMnemonic(trimmedMnemonic) && !bip39.validateMnemonic(trimmedMnemonic)) {
      this.showErrorMessageScreen({ description: i18n.wallets.importWallet.unsupportedElectrumVaultMnemonic });
      return;
    }

    if (this.props?.route.params.walletType === HDSegwitP2SHArWallet.type) {
      return this.createARWallet(trimmedMnemonic);
    }
    if (this.props?.route.params.walletType === HDSegwitP2SHAirWallet.type) {
      return this.createAIRWallet(trimmedMnemonic);
    }
    this.createWalletMessage(() => {
      this.importLegacyWallet(trimmedMnemonic);
    });
  };
  render() {
    const { validationError, text } = this.state;
    return (
      <ScreenTemplate
        footer={
          <>
            <Button
              disabled={!text || !!validationError}
              title={i18n.wallets.importWallet.import}
              onPress={this.onImportButtonPress}
            />
            <FlatButton
              containerStyle={styles.scanQRCodeButtonContainer}
              title={i18n.wallets.importWallet.scanQrCode}
              onPress={this.onScanQrCodeButtonPress}
            />
          </>
        }
        header={
          <Header navigation={this.props.navigation} isBackArrow={true} title={i18n.wallets.importWallet.header} />
        }
      >
        <View style={styles.inputItemContainer}>
          <Text style={styles.title}>{i18n.wallets.importWallet.title}</Text>
          {this.renderSubtitle()}
          <TextAreaItem
            error={validationError}
            onChangeText={this.onChangeText}
            placeholder={i18n.wallets.importWallet.placeholder}
            style={styles.textArea}
          />
        </View>
      </ScreenTemplate>
    );
  }
}

const mapDispatchToProps = {
  loadWallets,
};

export default connect(null, mapDispatchToProps)(ImportWalletScreen);

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
    paddingTop: 18,
    textAlign: 'center',
  },
  textArea: {
    marginTop: 24,
    height: 250,
  },
  scanQRCodeButtonContainer: {
    marginTop: 12,
  },
  arSubtitleContainer: {
    paddingHorizontal: 30,
    marginBottom: 30,
  },
});
