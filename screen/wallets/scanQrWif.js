/* global alert */
import React from 'react';
import { Text, ActivityIndicator, Button, View, TouchableOpacity } from 'react-native';
import { BlueText, SafeBlueArea, BlueButton } from '../../BlueComponents';
import { Permissions, BarCodeScanner } from 'expo';
import { SegwitP2SHWallet, LegacyWallet, WatchOnlyWallet } from '../../class';
import PropTypes from 'prop-types';
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
    if (+new Date() - this.lastTimeIveBeenHere < 3000) {
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
        this.setState({ message: false });
        return alert(loc.wallets.scanQrWif.bad_password);
      }

      this.setState({ message: false });
    }

    for (let w of BlueApp.wallets) {
      // lookig for duplicates
      if (w.getSecret() === ret.data) {
        alert(loc.wallets.scanQrWif.wallet_already_exists);
        return; // duplicate, not adding
      }
    }

    // is it just address..?
    let watchOnly = new WatchOnlyWallet();
    if (watchOnly.isAddressValid(ret.data)) {
      watchOnly.setSecret(ret.data);
      watchOnly.setLabel(loc.wallets.scanQrWif.imported_watchonly);
      BlueApp.wallets.push(watchOnly);
      alert(loc.wallets.scanQrWif.imported_watchonly + loc.wallets.scanQrWif.with_address + watchOnly.getAddress());
      this.props.navigation.popToTop();
      await watchOnly.fetchBalance();
      await watchOnly.fetchTransactions();
      await BlueApp.saveToDisk();
      setTimeout(() => EV(EV.enum.WALLETS_COUNT_CHANGED), 500);
      return;
    }
    // nope

    let newWallet = new SegwitP2SHWallet();
    newWallet.setSecret(ret.data);
    let newLegacyWallet = new LegacyWallet();
    newLegacyWallet.setSecret(ret.data);

    if (newWallet.getAddress() === false || newLegacyWallet.getAddress() === false) {
      alert(loc.wallets.scanQrWif.bad_wif);
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
    const { status } = await Permissions.askAsync(Permissions.CAMERA);
    this.setState({ hasCameraPermission: status === 'granted' });
  }

  render() {
    if (this.state.isLoading) {
      return (
        <View style={{ flex: 1, paddingTop: 20 }}>
          <ActivityIndicator />
        </View>
      );
    }

    const { hasCameraPermission } = this.state;
    if (hasCameraPermission === null) {
      return <View />;
    } else if (hasCameraPermission === false) {
      return <Text>No access to camera</Text>;
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
                <BarCodeScanner style={{ flex: 1 }} onBarCodeScanned={ret => this.onBarCodeScanned(ret)}>
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: 'transparent',
                      flexDirection: 'row',
                    }}
                  >
                    <TouchableOpacity
                      style={{
                        flex: 0.2,
                        alignSelf: 'flex-end',
                        alignItems: 'center',
                      }}
                    >
                      <Button
                        style={{ fontSize: 18, marginBottom: 10 }}
                        title={loc.wallets.scanQrWif.go_back}
                        onPress={() => this.props.navigation.goBack()}
                      />
                    </TouchableOpacity>
                  </View>
                </BarCodeScanner>
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
