/* global alert */
import React from 'react';
import { ActivityIndicator, Image, View, TouchableOpacity } from 'react-native';
import { BlueText, SafeBlueArea, BlueButton } from '../../BlueComponents';
import Camera from 'react-native-camera';
import Permissions from 'react-native-permissions';
import { SegwitP2SHWallet, LegacyWallet, WatchOnlyWallet, HDLegacyP2PKHWallet } from '../../class';
import PropTypes from 'prop-types';
import { HDSegwitP2SHWallet } from '../../class/hd-segwit-p2sh-wallet';
import { LightningCustodianWallet } from '../../class/lightning-custodian-wallet';
import bip21 from 'bip21';
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let EV = require('../../events');
let bip38 = require('../../bip38');
let wif = require('wif');
let prompt = require('../../prompt');
let loc = require('../../loc');

export default class ScanQrWif extends React.Component {
  static navigationOptions = {
    header: null,
  };

  state = {
    isLoading: false,
    hasCameraPermission: null,
  };

  async onBarCodeScanned(ret) {
    this.setState({ isLoading: true });
    if (+new Date() - this.lastTimeIveBeenHere < 6000) {
      this.lastTimeIveBeenHere = +new Date();
      return;
    }
    this.lastTimeIveBeenHere = +new Date();

    console.log('onBarCodeScanned', ret);
    if (ret.data[0] === '6') {
      // password-encrypted, need to ask for password and decrypt
      console.log('trying to decrypt...');

      this.setState({
        message: loc.wallets.scanQrWif.decoding,
      });
      shold_stop_bip38 = undefined; // eslint-disable-line
      let password = await prompt(loc.wallets.scanQrWif.input_password, loc.wallets.scanQrWif.password_explain);
      if (!password) {
        return;
      }
      let that = this;
      try {
        let decryptedKey = await bip38.decrypt(ret.data, password, function(status) {
          that.setState({
            message: loc.wallets.scanQrWif.decoding + '... ' + status.percent.toString().substr(0, 4) + ' %',
          });
        });
        ret.data = wif.encode(0x80, decryptedKey.privateKey, decryptedKey.compressed);
      } catch (e) {
        console.log(e.message);
        this.setState({ message: false, isLoading: false });
        return alert(loc.wallets.scanQrWif.bad_password);
      }

      this.setState({ message: false, isLoading: false });
    }

    for (let w of BlueApp.wallets) {
      if (w.getSecret() === ret.data) {
        // lookig for duplicates
        this.setState({ isLoading: false });
        return alert(loc.wallets.scanQrWif.wallet_already_exists); // duplicate, not adding
      }
    }

    // is it HD legacy (BIP44) mnemonic?
    let hd = new HDLegacyP2PKHWallet();
    hd.setSecret(ret.data);
    if (hd.validateMnemonic()) {
      for (let w of BlueApp.wallets) {
        if (w.getSecret() === hd.getSecret()) {
          // lookig for duplicates
          this.setState({ isLoading: false });
          return alert(loc.wallets.scanQrWif.wallet_already_exists); // duplicate, not adding
        }
      }
      await hd.fetchTransactions();
      if (hd.getTransactions().length !== 0) {
        await hd.fetchBalance();
        hd.setLabel(loc.wallets.import.imported + ' ' + hd.typeReadable);
        BlueApp.wallets.push(hd);
        await BlueApp.saveToDisk();
        alert(loc.wallets.import.success);
        this.props.navigation.popToTop();
        setTimeout(() => EV(EV.enum.WALLETS_COUNT_CHANGED), 500);
        this.setState({ isLoading: false });
        return;
      }
    }
    // nope

    // is it HD mnemonic?
    hd = new HDSegwitP2SHWallet();
    hd.setSecret(ret.data);
    if (hd.validateMnemonic()) {
      for (let w of BlueApp.wallets) {
        if (w.getSecret() === hd.getSecret()) {
          // lookig for duplicates
          this.setState({ isLoading: false });
          return alert(loc.wallets.scanQrWif.wallet_already_exists); // duplicate, not adding
        }
      }
      this.setState({ isLoading: true });
      hd.setLabel(loc.wallets.import.imported + ' ' + hd.typeReadable);
      BlueApp.wallets.push(hd);
      await hd.fetchBalance();
      await hd.fetchTransactions();
      await BlueApp.saveToDisk();
      alert(loc.wallets.import.success);
      this.props.navigation.popToTop();
      setTimeout(() => EV(EV.enum.WALLETS_COUNT_CHANGED), 500);
      this.setState({ isLoading: false });
      return;
    }
    // nope

    // is it lndhub?
    if (ret.data.indexOf('blitzhub://') !== -1 || ret.data.indexOf('lndhub://') !== -1) {
      this.setState({ isLoading: true });
      let lnd = new LightningCustodianWallet();
      lnd.setSecret(ret.data);
      try {
        await lnd.authorize();
        await lnd.fetchTransactions();
        await lnd.fetchBalance();
      } catch (Err) {
        console.log(Err);
        this.setState({ isLoading: false });
        return;
      }

      BlueApp.wallets.push(lnd);
      lnd.setLabel(loc.wallets.import.imported + ' ' + lnd.typeReadable);
      this.props.navigation.popToTop();
      alert(loc.wallets.import.success);
      setTimeout(() => EV(EV.enum.WALLETS_COUNT_CHANGED), 500);
      this.setState({ isLoading: false });
      return;
    }
    // nope

    // is it just address..?
    let watchOnly = new WatchOnlyWallet();
    let watchAddr = ret.data;

    // Is it BIP21 format?
    if (ret.data.indexOf('bitcoin:') === 0 || ret.data.indexOf('BITCOIN:') === 0) {
      try {
        watchAddr = bip21.decode(ret.data).address;
      } catch (err) {
        console.log(err);
      }
    }

    if (watchOnly.isAddressValid(watchAddr)) {
      watchOnly.setSecret(watchAddr);
      watchOnly.setLabel(loc.wallets.scanQrWif.imported_watchonly);
      BlueApp.wallets.push(watchOnly);
      alert(loc.wallets.scanQrWif.imported_watchonly + loc.wallets.scanQrWif.with_address + watchOnly.getAddress());
      this.props.navigation.popToTop();
      await watchOnly.fetchBalance();
      await watchOnly.fetchTransactions();
      await BlueApp.saveToDisk();
      setTimeout(() => EV(EV.enum.WALLETS_COUNT_CHANGED), 500);
      this.setState({ isLoading: false });
      return;
    }
    // nope

    let newWallet = new SegwitP2SHWallet();
    newWallet.setSecret(ret.data);
    let newLegacyWallet = new LegacyWallet();
    newLegacyWallet.setSecret(ret.data);

    if (newWallet.getAddress() === false || newLegacyWallet.getAddress() === false) {
      alert(loc.wallets.scanQrWif.bad_wif);
      this.setState({ isLoading: false });
      return;
    }

    this.setState({ isLoading: true });
    await newLegacyWallet.fetchBalance();
    console.log('newLegacyWallet == ', newLegacyWallet.getBalance());

    if (newLegacyWallet.getBalance()) {
      newLegacyWallet.setLabel(loc.wallets.scanQrWif.imported_legacy);
      BlueApp.wallets.push(newLegacyWallet);
      alert(loc.wallets.scanQrWif.imported_wif + ret.data + loc.wallets.scanQrWif.with_address + newLegacyWallet.getAddress());
      await newLegacyWallet.fetchTransactions();
    } else {
      await newWallet.fetchBalance();
      await newWallet.fetchTransactions();
      newWallet.setLabel(loc.wallets.scanQrWif.imported_segwit);
      BlueApp.wallets.push(newWallet);
      alert(loc.wallets.scanQrWif.imported_wif + ret.data + loc.wallets.scanQrWif.with_address + newWallet.getAddress());
    }
    await BlueApp.saveToDisk();
    this.props.navigation.popToTop();
    setTimeout(() => EV(EV.enum.WALLETS_COUNT_CHANGED), 500);
  } // end

  async componentWillMount() {
    Permissions.request('camera').then(response => {
      // Response is one of: 'authorized', 'denied', 'restricted', or 'undetermined'
      this.setState({ hasCameraPermission: response === 'authorized' });
    });
  }

  render() {
    if (this.state.isLoading) {
      return (
        <View style={{ flex: 1, paddingTop: 20, justifyContent: 'center', alignContent: 'center' }}>
          <ActivityIndicator />
        </View>
      );
    }

    const { hasCameraPermission } = this.state;
    if (hasCameraPermission === null) {
      return <View />;
    } else if (hasCameraPermission === false) {
      alert('BlueWallet does not have permission to use your camera.');
      this.props.navigation.goBack(null);
      return <View />;
    } else {
      return (
        <View style={{ flex: 1 }}>
          {(() => {
            if (this.state.message) {
              return (
                <SafeBlueArea>
                  <View
                    style={{
                      flex: 1,
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <BlueText>{this.state.message}</BlueText>
                    <BlueButton
                      icon={{ name: 'stop', type: 'octicon' }}
                      onPress={async () => {
                        this.setState({ message: false });
                        shold_stop_bip38 = true; // eslint-disable-line
                      }}
                      title={loc.wallets.scanQrWif.cancel}
                    />
                  </View>
                </SafeBlueArea>
              );
            } else {
              return (
                <SafeBlueArea style={{ flex: 1 }}>
                  <Camera style={{ flex: 1 }} onBarCodeRead={ret => this.onBarCodeScanned(ret)}>
                    <TouchableOpacity
                      style={{ width: 80, height: 80, padding: 14, marginTop: 32 }}
                      onPress={() => this.props.navigation.goBack(null)}
                    >
                      <Image style={{ alignSelf: 'center' }} source={require('../../img/close.png')} />
                    </TouchableOpacity>
                  </Camera>
                </SafeBlueArea>
              );
            }
          })()}
        </View>
      );
    }
  }
}

ScanQrWif.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func,
    popToTop: PropTypes.func,
    navigate: PropTypes.func,
  }),
};
