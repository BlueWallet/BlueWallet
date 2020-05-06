import bip21 from 'bip21';
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
import { loadWallets, WalletsActionType } from 'app/state/wallets/actions';
import { getStatusBarHeight } from 'app/styles';

import {
  SegwitP2SHWallet,
  LegacyWallet,
  WatchOnlyWallet,
  HDLegacyP2PKHWallet,
  HDSegwitBech32Wallet,
  HDSegwitP2SHWallet,
} from '../../class';

const wif = require('wif');

const BlueApp = require('../../BlueApp');
const i18n = require('../../loc');

const { width } = Dimensions.get('window');

const SCAN_CODE_AFTER_MS = 2 * 1000; // in miliseconds

const now = (): number => new Date().getTime();

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
  lastTimeIveBeenHere = now();

  state = {
    isLoading: false,
    message: '',
  };

  onBarCodeScanned = async (event: BarCodeScanEvent) => {
    if (now() - this.lastTimeIveBeenHere < SCAN_CODE_AFTER_MS) {
      this.lastTimeIveBeenHere = now();
      return;
    }
    this.lastTimeIveBeenHere = now();
    this.setState({ isLoading: true });
    if (event.data[0] === '6') {
      // password-encrypted, need to ask for password and decrypt
      console.log('trying to decrypt...');

      this.setState({
        message: loc.wallets.scanQrWif.decoding,
      });
      // shold_stop_bip38 = undefined; // eslint-disable-line
      const password = await prompt(loc.wallets.scanQrWif.input_password, loc.wallets.scanQrWif.password_explain);
      if (!password) {
        return;
      }
      try {
        const decryptedKey = await bip38.decrypt(event.data, password, (status: any) => {
          this.setState({
            message: loc.wallets.scanQrWif.decoding + '... ' + status.percent.toString().substr(0, 4) + ' %',
          });
        });
        event.data = wif.encode(0x80, decryptedKey.privateKey, decryptedKey.compressed);
      } catch (e) {
        this.setState({ message: '', isLoading: false });
        return Alert.alert(loc.wallets.scanQrWif.bad_password);
      }
      this.setState({ message: '', isLoading: false });
    }

    for (const w of BlueApp.wallets) {
      if (w.getSecret() === event.data) {
        // lookig for duplicates
        this.setState({ isLoading: false });
        return Alert.alert(loc.wallets.scanQrWif.wallet_already_exists); // duplicate, not adding
      }
    }

    // is it just address..?
    const watchOnly = new WatchOnlyWallet();
    let watchAddr = event.data;

    // Is it BIP21 format?
    if (event.data.indexOf('bitcoin:') === 0 || event.data.indexOf('BITCOIN:') === 0) {
      try {
        watchAddr = bip21.decode(event.data).address;
      } catch (err) {
        console.log(err);
      }
    }

    // Or is it a bare address?
    // TODO: remove these hardcodes
    if (event.data.indexOf('Y') === 0 || event.data.indexOf('R') === 0 || event.data.indexOf('royale') === 0) {
      try {
        watchAddr = event.data;
      } catch (err) {
        console.log(err.message);
      }
    }
    this.setState({ isLoading: true });
  };

    if (watchOnly.setSecret(watchAddr) && watchOnly.valid()) {
      watchOnly.setLabel(loc.wallets.scanQrWif.imported_watchonly);
      BlueApp.wallets.push(watchOnly);
      Alert.alert(
        loc.wallets.scanQrWif.imported_watchonly + loc.wallets.scanQrWif.with_address + watchOnly.getAddress(),
      );
      await watchOnly.fetchBalance();
      await watchOnly.fetchTransactions();
      await BlueApp.saveToDisk();
      this.props.navigation.popToTop();
      setTimeout(() => EV(EV.enum.WALLETS_COUNT_CHANGED), 500);
      this.setState({ isLoading: false });
      return;
    }
    // nope

    // is it HD BIP84 mnemonic?
    let hd;
    hd = new HDSegwitBech32Wallet();
    hd.setSecret(event.data);
    if (hd.validateMnemonic()) {
      for (const w of BlueApp.wallets) {
        if (w.getSecret() === hd.getSecret()) {
          // lookig for duplicates
          this.setState({ isLoading: false });
          return Alert.alert(loc.wallets.scanQrWif.wallet_already_exists); // duplicate, not adding
        }
      }
      this.setState({ isLoading: true });
      hd.setLabel(loc.wallets.import.imported + ' ' + hd.typeReadable);
      await hd.fetchBalance();
      if (hd.getBalance() !== 0) {
        await hd.fetchTransactions();
        BlueApp.wallets.push(hd);
        await BlueApp.saveToDisk();
        Alert.alert(loc.wallets.import.success);
        this.props.navigation.popToTop();
        setTimeout(() => EV(EV.enum.WALLETS_COUNT_CHANGED), 500);
        this.setState({ isLoading: false });
        return;
      }
    }
    // nope

    // is it HD legacy (BIP44) mnemonic?
    hd = new HDLegacyP2PKHWallet();
    hd.setSecret(event.data);
    if (hd.validateMnemonic()) {
      for (const w of BlueApp.wallets) {
        if (w.getSecret() === hd.getSecret()) {
          // lookig for duplicates
          this.setState({ isLoading: false });
          return Alert.alert(loc.wallets.scanQrWif.wallet_already_exists); // duplicate, not adding
        }
      }
      await hd.fetchTransactions();
      if (hd.getTransactions().length !== 0) {
        await hd.fetchBalance();
        hd.setLabel(loc.wallets.import.imported + ' ' + hd.typeReadable);
        BlueApp.wallets.push(hd);
        await BlueApp.saveToDisk();
        Alert.alert(loc.wallets.import.success);
        this.props.navigation.popToTop();
        setTimeout(() => EV(EV.enum.WALLETS_COUNT_CHANGED), 500);
        this.setState({ isLoading: false });
        return;
      }
    }
    // nope

    // is it HD mnemonic?
    hd = new HDSegwitP2SHWallet();
    hd.setSecret(event.data);
    if (hd.validateMnemonic()) {
      for (const w of BlueApp.wallets) {
        if (w.getSecret() === hd.getSecret()) {
          // lookig for duplicates
          this.setState({ isLoading: false });
          return Alert.alert(loc.wallets.scanQrWif.wallet_already_exists); // duplicate, not adding
        }
      }
      this.setState({ isLoading: true });
      hd.setLabel(loc.wallets.import.imported + ' ' + hd.typeReadable);
      BlueApp.wallets.push(hd);
      await hd.fetchBalance();
      await hd.fetchTransactions();
      await BlueApp.saveToDisk();
      Alert.alert(loc.wallets.import.success);
      this.props.navigation.popToTop();
      setTimeout(() => EV(EV.enum.WALLETS_COUNT_CHANGED), 500);
      this.setState({ isLoading: false });
      return;
    }
    // nope

    const newWallet = new SegwitP2SHWallet();
    newWallet.setSecret(event.data);
    const newLegacyWallet = new LegacyWallet();
    newLegacyWallet.setSecret(event.data);

    if (newWallet.getAddress() === false && newLegacyWallet.getAddress() === false) {
      Alert.alert(loc.wallets.scanQrWif.bad_wif);
      this.setState({ isLoading: false });
      return;
    }

    if (newWallet.getAddress() === false && newLegacyWallet.getAddress() !== false) {
      // case - WIF is valid, just has uncompressed pubkey
      newLegacyWallet.setLabel(loc.wallets.scanQrWif.imported_legacy);
      BlueApp.wallets.push(newLegacyWallet);
      Alert.alert(
        loc.wallets.scanQrWif.imported_wif +
          event.data +
          loc.wallets.scanQrWif.with_address +
          newLegacyWallet.getAddress(),
      );
      await newLegacyWallet.fetchBalance();
      await newLegacyWallet.fetchTransactions();
      await BlueApp.saveToDisk();
      this.props.navigation.popToTop();
      setTimeout(() => EV(EV.enum.WALLETS_COUNT_CHANGED), 500);
      return;
    }

    this.setState({ isLoading: true });
    await newLegacyWallet.fetchBalance();
    console.log('newLegacyWallet == ', newLegacyWallet.getBalance());

    if (newLegacyWallet.getBalance()) {
      newLegacyWallet.setLabel(loc.wallets.scanQrWif.imported_legacy);
      BlueApp.wallets.push(newLegacyWallet);
      Alert.alert(
        loc.wallets.scanQrWif.imported_wif +
          event.data +
          loc.wallets.scanQrWif.with_address +
          newLegacyWallet.getAddress(),
      );
      await newLegacyWallet.fetchTransactions();
    } else {
      await newWallet.fetchBalance();
      await newWallet.fetchTransactions();
      newWallet.setLabel(loc.wallets.scanQrWif.imported_segwit);
      BlueApp.wallets.push(newWallet);
      Alert.alert(
        loc.wallets.scanQrWif.imported_wif + event.data + loc.wallets.scanQrWif.with_address + newWallet.getAddress(),
      );
    }
    await BlueApp.saveToDisk();
    this.props.navigation.popToTop();
    setTimeout(() => EV(EV.enum.WALLETS_COUNT_CHANGED), 500);
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
const mapDispatchToProps = {
  loadWallets,
};

export default connect(null, mapDispatchToProps)(ImportWalletQRCodeScreen);

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
