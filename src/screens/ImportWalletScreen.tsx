import { CompositeNavigationProp, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { PureComponent } from 'react';
import { View, StyleSheet, Text, Keyboard } from 'react-native';
import { connect } from 'react-redux';

import { Header, TextAreaItem, FlatButton, ScreenTemplate, InputItem } from 'app/components';
import { Button } from 'app/components/Button';
import { Route, Wallet, MainCardStackNavigatorParams, MainTabNavigatorParams } from 'app/consts';
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

const i18n = require('../../loc');

interface Props {
  navigation: CompositeNavigationProp<
    StackNavigationProp<MainTabNavigatorParams, Route.Dashboard>,
    StackNavigationProp<MainCardStackNavigatorParams, Route.ImportWallet>
  >;
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

  showErrorMessageScreen = () =>
    CreateMessage({
      title: i18n.message.somethingWentWrong,
      description: i18n.message.somethingWentWrongWhileCreatingWallet,
      type: MessageType.error,
      buttonProps: {
        title: i18n.message.returnToDashboard,
        onPress: () => this.props.navigation.navigate(Route.ImportWalletChooseType),
      },
    });

  showSuccessImportMessageScreen = () =>
    CreateMessage({
      title: i18n.message.success,
      description: i18n.message.successfullWalletImport,
      type: MessageType.success,
      buttonProps: {
        title: i18n.message.returnToDashboard,
        onPress: () => this.props.navigation.navigate(Route.Dashboard),
      },
    });

  onImportButtonPress = async () => {
    Keyboard.dismiss();
    CreateMessage({
      title: i18n.message.creatingWallet,
      description: i18n.message.creatingWalletDescription,
      type: MessageType.processingState,
      asyncTask: () => this.importMnemonic(this.state.text),
    });
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
      onBarCodeScan: (mnemonic: string) => {
        CreateMessage({
          title: i18n.message.creatingWallet,
          description: i18n.message.creatingWalletDescription,
          type: MessageType.processingState,
          asyncTask: () => this.importMnemonic(mnemonic),
        });
      },
    });
  };

  saveWallet = async (newWallet: any) => {
    if (BlueApp.getWallets().some((wallet: Wallet) => wallet.getSecret() === newWallet.secret)) {
      this.setState({ validationError: i18n.wallets.importWallet.walletInUseValidationError });
    } else {
      newWallet.setLabel(this.state.label || i18n.wallets.import.imported + ' ' + newWallet.typeReadable);
      BlueApp.wallets.push(newWallet);
      await BlueApp.saveToDisk();
      this.props.loadWallets();
      this.showSuccessImportMessageScreen();
    }
  };

  createARWallet = (mnemonic: string) => {
    try {
      const wallet = new HDSegwitP2SHArWallet();
      wallet.setMnemonic(mnemonic);
      this.props.navigation.navigate(Route.IntegrateKey, {
        onBarCodeScan: key => {
          CreateMessage({
            title: i18n.message.creatingWallet,
            description: i18n.message.creatingWalletDescription,
            type: MessageType.processingState,
            asyncTask: () => this.saveARWallet(wallet, key),
          });
        },
        title: i18n.wallets.importWallet.scanWalletAddress,
        description: i18n.wallets.importWallet.scanWalletAddressDescription,
        withLink: false,
      });
    } catch (_) {
      this.showErrorMessageScreen();
    }
  };

  createAIRWallet = (mnemonic: string) => {
    try {
      const wallet = new HDSegwitP2SHAirWallet();
      wallet.setMnemonic(mnemonic);
      this.props.navigation.navigate(Route.IntegrateKey, {
        onBarCodeScan: instantPublicKey => {
          try {
            wallet.addPublicKey(instantPublicKey);
            this.addRecoveryKey(wallet);
          } catch (_) {
            this.showErrorMessageScreen();
          }
        },
        title: i18n.wallets.importWallet.scanWalletAddress,
        description: i18n.wallets.importWallet.scanWalletAddressDescription,
        withLink: false,
      });
    } catch (_) {
      this.showErrorMessageScreen();
    }
  };

  saveARWallet = async (wallet: HDSegwitP2SHArWallet, pubKeyHex: string) => {
    try {
      wallet.addPublicKey(pubKeyHex);
      await wallet.generateAddresses();
      await wallet.fetchBalance();
      await wallet.fetchTransactions();
      if (wallet.getBalance() > 0 || wallet.getTransactions().length !== 0) {
        this.saveWallet(wallet);
      } else {
        this.showErrorMessageScreen();
      }
    } catch (error) {
      this.showErrorMessageScreen();
    }
  };

  saveAIRWallet = async (wallet: HDSegwitP2SHAirWallet, recoveryPublicKey: string) => {
    try {
      wallet.addPublicKey(recoveryPublicKey);
      await wallet.generateAddresses();
      await wallet.fetchBalance();
      await wallet.fetchTransactions();
      if (wallet.getBalance() > 0 || wallet.getTransactions().length !== 0) {
        this.saveWallet(wallet);
      } else {
        this.showErrorMessageScreen();
      }
    } catch (error) {
      this.showErrorMessageScreen();
    }
  };

  renderSubtitle = () => {
    const { walletType } = this.props?.route.params;
    if (walletType === HDSegwitP2SHArWallet.type || walletType === HDSegwitP2SHAirWallet.type) {
      return (
        <>
          <View style={styles.arSubtitleContainer}>
            <Text style={styles.subtitle}>{i18n.wallets.importWallet.importARDescription1}</Text>
            <Text style={styles.subtitle}>{i18n._.or}</Text>
            <Text style={styles.subtitle}>{i18n.wallets.importWallet.importARDescription2}</Text>
          </View>
          <InputItem
            error={this.state.validationError}
            setValue={this.onLabelChange}
            label={i18n.wallets.add.inputLabel}
          />
        </>
      );
    }
    return <Text style={styles.subtitle}>{i18n.wallets.importWallet.subtitle}</Text>;
  };

  addRecoveryKey = (wallet: HDSegwitP2SHAirWallet) => {
    this.props.navigation.navigate(Route.IntegrateKey, {
      onBarCodeScan: (recoveryPublicKey: string) => {
        CreateMessage({
          title: i18n.message.creatingWallet,
          description: i18n.message.creatingWalletDescription,
          type: MessageType.processingState,
          asyncTask: () => {
            this.saveAIRWallet(wallet, recoveryPublicKey);
          },
        });
      },
      withLink: false,
      title: i18n.wallets.importWallet.scanPublicKey,
      description: i18n.wallets.importWallet.scanPublicKeyDescription,
    });
  };

  importMnemonic = async (mnemonic: string) => {
    const trimmedMemonic = mnemonic.trim();

    if (this.props?.route.params.walletType === HDSegwitP2SHArWallet.type) {
      return this.createARWallet(trimmedMemonic);
    }
    if (this.props?.route.params.walletType === HDSegwitP2SHAirWallet.type) {
      return this.createAIRWallet(trimmedMemonic);
    }

    try {
      // trying other wallet types
      const segwitWallet = new SegwitP2SHWallet();
      segwitWallet.setSecret(trimmedMemonic);
      if (segwitWallet.getAddress()) {
        // ok its a valid WIF

        const legacyWallet = new LegacyWallet();
        legacyWallet.setSecret(trimmedMemonic);

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
      legacyWallet.setSecret(trimmedMemonic);
      if (legacyWallet.getAddress()) {
        await legacyWallet.fetchBalance();
        await legacyWallet.fetchTransactions();
        return this.saveWallet(legacyWallet);
      }

      // if we're here - nope, its not a valid WIF

      const hd2 = new HDSegwitP2SHWallet();
      await hd2.setSecret(trimmedMemonic);
      if (hd2.validateMnemonic()) {
        await hd2.fetchBalance();
        if (hd2.getBalance() > 0) {
          await hd2.fetchTransactions();
          return this.saveWallet(hd2);
        }
      }

      const hd4 = new HDSegwitBech32Wallet();
      await hd4.setSecret(trimmedMemonic);
      if (hd4.validateMnemonic()) {
        await hd4.fetchBalance();
        if (hd4.getBalance() > 0) {
          await hd4.fetchTransactions();
          return this.saveWallet(hd4);
        }
      }

      const hd3 = new HDLegacyP2PKHWallet();
      await hd3.setSecret(trimmedMemonic);
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
      watchOnly.setSecret(trimmedMemonic);
      if (watchOnly.valid()) {
        await watchOnly.fetchTransactions();
        await watchOnly.fetchBalance();
        return this.saveWallet(watchOnly);
      }

      // nope?

      // TODO: try a raw private key
    } catch (Err) {
      this.showErrorMessageScreen();
    }
    this.showErrorMessageScreen();
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
