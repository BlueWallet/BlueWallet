import React from 'react';
import {
  ActivityIndicator,
  Image,
  View,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import { RNCamera } from 'react-native-camera';
import { NavigationInjectedProps } from 'react-navigation';

import { images } from 'app/assets';
import { Wallet, Route } from 'app/consts';
import { CreateMessage, MessageType } from 'app/helpers/MessageCreator';
import { sleep } from 'app/helpers/helpers';
import { NavigationService } from 'app/services';
import { getStatusBarHeight } from 'app/styles';

import {
  SegwitP2SHWallet,
  LegacyWallet,
  WatchOnlyWallet,
  HDLegacyP2PKHWallet,
  HDSegwitBech32Wallet,
  HDSegwitP2SHWallet,
} from '../../class';

const BlueApp = require('../../BlueApp');
const EV = require('../../events');
const i18n = require('../../loc');

const { width } = Dimensions.get('window');

interface BarCodeScanEvent {
  data: string;
  rawData?: string;
  type: string;
}

type Props = NavigationInjectedProps;

interface State {
  isLoading: boolean;
  message: string;
}

export default class ImportWalletQRCodeScreen extends React.Component<Props, State> {
  static navigationOptions = {
    header: null,
  };

  cameraRef = React.createRef<RNCamera>();

  state = {
    isLoading: false,
    message: '',
  };

  showErrorMessageScreen = () => {
    this.setState({ isLoading: false });
    CreateMessage({
      title: i18n.message.somethingWentWrong,
      description: i18n.message.somethingWentWrongWhileCreatingWallet,
      type: MessageType.error,
      buttonProps: {
        title: i18n.message.returnToDashboard,
        onPress: () => NavigationService.navigateWithReset(Route.MainCardStackNavigator),
      },
    });
  };

  showSuccessImportMessageScreen = () =>
    CreateMessage({
      title: i18n.message.success,
      description: i18n.message.successfullWalletImport,
      type: MessageType.success,
      buttonProps: {
        title: i18n.message.returnToDashboard,
        onPress: () => NavigationService.navigateWithReset(Route.MainCardStackNavigator),
      },
    });

  onBarCodeScanned = (event: BarCodeScanEvent) => {
    CreateMessage({
      title: i18n.message.creatingWallet,
      description: i18n.message.creatingWalletDescription,
      type: MessageType.processingState,
      asyncTask: () => this.importMnemonic(event.data),
    });
  };

  saveWallet = async (w: any) => {
    if (BlueApp.getWallets().some((wallet: Wallet) => wallet.getSecret() === w.secret)) {
      Alert.alert(i18n.wallets.importWallet.walletInUseValidationError);
    } else {
      w.setLabel(i18n.wallets.import.imported + ' ' + w.typeReadable);
      BlueApp.wallets.push(w);
      await BlueApp.saveToDisk();
      EV(EV.enum.WALLETS_COUNT_CHANGED);
      this.props.navigation.popToTop();

      this.showSuccessImportMessageScreen();
      // this.props.navigation.dismiss();
    }
    this.setState({ isLoading: true });
  };

  importMnemonic = async (text: string) => {
    if (this.state.isLoading) {
      return;
    }
    this.setState({ isLoading: true }, async () => {
      // make sure it re-renders
      await sleep(100);
      try {
        // trying other wallet types
        const segwitWallet = new SegwitP2SHWallet();
        segwitWallet.setSecret(text);
        if (segwitWallet.getAddress()) {
          // ok its a valid WIF

          const legacyWallet = new LegacyWallet();
          legacyWallet.setSecret(text);

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
        legacyWallet.setSecret(text);
        if (legacyWallet.getAddress()) {
          await legacyWallet.fetchBalance();
          await legacyWallet.fetchTransactions();
          return this.saveWallet(legacyWallet);
        }

        // if we're here - nope, its not a valid WIF

        const hd2 = new HDSegwitP2SHWallet();
        hd2.setSecret(text);
        if (hd2.validateMnemonic()) {
          hd2.generateAddresses();
          await hd2.fetchBalance();
          if (hd2.getBalance() > 0) {
            await hd2.fetchTransactions();
            return this.saveWallet(hd2);
          }
        }

        const hd4 = new HDSegwitBech32Wallet();
        hd4.setSecret(text);
        if (hd4.validateMnemonic()) {
          hd4.generateAddresses();
          await hd4.fetchBalance();
          if (hd4.getBalance() > 0) {
            await hd4.fetchTransactions();
            return this.saveWallet(hd4);
          }
        }

        const hd3 = new HDLegacyP2PKHWallet();
        hd3.setSecret(text);
        if (hd3.validateMnemonic()) {
          hd3.generateAddresses();
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

        // is it even valid? if yes we will import as:
        if (hd4.validateMnemonic()) {
          return this.saveWallet(hd4);
        }

        // not valid? maybe its a watch-only address?

        const watchOnly = new WatchOnlyWallet();
        watchOnly.setSecret(text);
        if (watchOnly.valid()) {
          await watchOnly.fetchTransactions();
          await watchOnly.fetchBalance();
          return this.saveWallet(watchOnly);
        }

        // nope?

        // TODO: try a raw private key
      } catch (err) {
        return this.showErrorMessageScreen();
      }
      return this.showErrorMessageScreen();
    });
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

  navigateBack = () => this.props.navigation.goBack();

  render() {
    if (this.state.isLoading) {
      return (
        <View style={styles.activityIndicatorContainer}>
          <ActivityIndicator />
        </View>
      );
    }
    return (
      <View style={styles.container}>
        <StatusBar hidden />
        <RNCamera
          captureAudio={false}
          androidCameraPermissionOptions={{
            title: 'Permission to use camera',
            message: 'We need your permission to use your camera',
            buttonPositive: 'OK',
            buttonNegative: 'Cancel',
          }}
          style={styles.camera}
          onBarCodeRead={this.onBarCodeScanned}
          ref={this.cameraRef}
          barCodeTypes={[RNCamera.Constants.BarCodeType.qr]}
        />
        <View style={styles.crosshairContainer}>
          <Image style={styles.crosshair} source={images.scanQRcrosshair} />
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={this.navigateBack}>
          <Image source={images.close} />
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  activityIndicatorContainer: {
    flex: 1,
    paddingTop: 20,
    justifyContent: 'center',
    alignContent: 'center',
  },
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
    justifyContent: 'space-between',
  },
  crosshairContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crosshair: {
    width: width * 0.58,
    height: width * 0.58,
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    borderRadius: 20,
    position: 'absolute',
    top: getStatusBarHeight(),
    right: 20,
  },
});
