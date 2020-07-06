import React, { useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { NavigationInjectedProps } from 'react-navigation';
import { connect } from 'react-redux';

import { Header, TextAreaItem, FlatButton, ScreenTemplate } from 'app/components';
import { Button } from 'app/components/Button';
import { Route, Wallet } from 'app/consts';
import { CreateMessage, MessageType } from 'app/helpers/MessageCreator';
import { NavigationService } from 'app/services';
import { loadWallets, WalletsActionType } from 'app/state/wallets/actions';
import { typography, palette } from 'app/styles';

import BlueApp from '../../BlueApp';
import {
  SegwitP2SHWallet,
  LegacyWallet,
  WatchOnlyWallet,
  HDSegwitP2SHWallet,
  HDLegacyP2PKHWallet,
  HDSegwitBech32Wallet,
} from '../../class';

const i18n = require('../../loc');

interface Props extends NavigationInjectedProps {
  loadWallets: () => Promise<WalletsActionType>;
}

export const ImportWalletScreen: React.FunctionComponent<Props> = (props: Props) => {
  const [isButtonDisabled, setIsButtonDisabled] = useState(true);
  const [text, setText] = useState('');
  const [validationError, setValidationError] = useState('');

  const showErrorMessageScreen = () =>
    CreateMessage({
      title: i18n.message.somethingWentWrong,
      description: i18n.message.somethingWentWrongWhileCreatingWallet,
      type: MessageType.error,
      buttonProps: {
        title: i18n.message.returnToDashboard,
        onPress: () => NavigationService.navigateWithReset(Route.MainCardStackNavigator),
      },
    });

  const showSuccessImportMessageScreen = () =>
    CreateMessage({
      title: i18n.message.success,
      description: i18n.message.successfullWalletImport,
      type: MessageType.success,
      buttonProps: {
        title: i18n.message.returnToDashboard,
        onPress: () => NavigationService.navigateWithReset(Route.MainCardStackNavigator),
      },
    });

  const onImportButtonPress = async () => {
    CreateMessage({
      title: i18n.message.creatingWallet,
      description: i18n.message.creatingWalletDescription,
      type: MessageType.processingState,
      asyncTask: () => importMnemonic(text),
    });
  };

  const onChangeText = (mnemonic: string) => {
    setText(mnemonic);
    setValidationError('');
    if (isButtonDisabled !== (mnemonic.length === 0)) {
      setIsButtonDisabled(!isButtonDisabled);
    }
  };

  const onScanQrCodeButtonPress = () => {
    NavigationService.navigate(Route.ImportWalletQRCode);
  };

  const saveWallet = async (newWallet: any) => {
    if (BlueApp.getWallets().some((wallet: Wallet) => wallet.getSecret() === newWallet.secret)) {
      NavigationService.navigate(Route.ImportWallet);
      setValidationError(i18n.wallets.importWallet.walletInUseValidationError);
    } else {
      ReactNativeHapticFeedback.trigger('notificationSuccess', {
        ignoreAndroidSystemSettings: false,
      });
      newWallet.setLabel(i18n.wallets.import.imported + ' ' + newWallet.typeReadable);
      BlueApp.wallets.push(newWallet);
      await BlueApp.saveToDisk();
      props.loadWallets();
      showSuccessImportMessageScreen();
      // this.props.navigation.dismiss();
    }
  };

  const importMnemonic = async (mnemonic: string) => {
    try {
      // trying other wallet types
      const segwitWallet = new SegwitP2SHWallet();
      segwitWallet.setSecret(mnemonic);
      if (segwitWallet.getAddress()) {
        // ok its a valid WIF

        const legacyWallet = new LegacyWallet();
        legacyWallet.setSecret(mnemonic);

        await legacyWallet.fetchBalance();
        if (legacyWallet.getBalance() > 0) {
          // yep, its legacy we're importing
          await legacyWallet.fetchTransactions();
          return saveWallet(legacyWallet);
        } else {
          // by default, we import wif as Segwit P2SH
          await segwitWallet.fetchBalance();
          await segwitWallet.fetchTransactions();
          return saveWallet(segwitWallet);
        }
      }

      // case - WIF is valid, just has uncompressed pubkey

      const legacyWallet = new LegacyWallet();
      legacyWallet.setSecret(mnemonic);
      if (legacyWallet.getAddress()) {
        await legacyWallet.fetchBalance();
        await legacyWallet.fetchTransactions();
        return saveWallet(legacyWallet);
      }

      // if we're here - nope, its not a valid WIF

      const hd2 = new HDSegwitP2SHWallet();
      await hd2.setSecret(mnemonic);
      if (hd2.validateMnemonic()) {
        await hd2.fetchBalance();
        if (hd2.getBalance() > 0) {
          await hd2.fetchTransactions();
          return saveWallet(hd2);
        }
      }

      const hd4 = new HDSegwitBech32Wallet();
      await hd4.setSecret(mnemonic);
      if (hd4.validateMnemonic()) {
        await hd4.fetchBalance();
        if (hd4.getBalance() > 0) {
          await hd4.fetchTransactions();
          return saveWallet(hd4);
        }
      }

      const hd3 = new HDLegacyP2PKHWallet();
      await hd3.setSecret(mnemonic);
      if (hd3.validateMnemonic()) {
        await hd3.fetchBalance();
        if (hd3.getBalance() > 0) {
          await hd3.fetchTransactions();
          return saveWallet(hd3);
        }
      }

      // no balances? how about transactions count?

      if (hd2.validateMnemonic()) {
        await hd2.fetchTransactions();
        if (hd2.getTransactions().length !== 0) {
          return saveWallet(hd2);
        }
      }
      if (hd3.validateMnemonic()) {
        await hd3.fetchTransactions();
        if (hd3.getTransactions().length !== 0) {
          return saveWallet(hd3);
        }
      }
      if (hd4.validateMnemonic()) {
        await hd4.fetchTransactions();
        if (hd4.getTransactions().length !== 0) {
          return saveWallet(hd4);
        }
      }

      // not valid? maybe its a watch-only address?

      const watchOnly = new WatchOnlyWallet();
      watchOnly.setSecret(mnemonic);
      if (watchOnly.valid()) {
        await watchOnly.fetchTransactions();
        await watchOnly.fetchBalance();
        return saveWallet(watchOnly);
      }

      // nope?

      // TODO: try a raw private key
    } catch (Err) {
      showErrorMessageScreen();
    }
    showErrorMessageScreen();
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

  return (
    <ScreenTemplate
      footer={
        <>
          <Button disabled={isButtonDisabled} title={i18n.wallets.importWallet.import} onPress={onImportButtonPress} />
          <FlatButton
            containerStyle={styles.scanQRCodeButtonContainer}
            title={i18n.wallets.importWallet.scanQrCode}
            onPress={onScanQrCodeButtonPress}
          />
        </>
      }
    >
      <View style={styles.inputItemContainer}>
        <Text style={styles.title}>{i18n.wallets.importWallet.title}</Text>
        <Text style={styles.subtitle}>{i18n.wallets.importWallet.subtitle}</Text>
        <TextAreaItem
          error={validationError}
          onChangeText={onChangeText}
          placeholder={i18n.wallets.importWallet.placeholder}
          style={styles.textArea}
        />
      </View>
    </ScreenTemplate>
  );
};

// @ts-ignore
ImportWalletScreen.navigationOptions = (props: Props) => ({
  header: <Header navigation={props.navigation} isBackArrow={true} title={i18n.wallets.importWallet.header} />,
});

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
});
