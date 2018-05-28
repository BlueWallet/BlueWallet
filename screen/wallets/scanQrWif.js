/* global alert */
import React from 'react';
import {
  Text,
  ActivityIndicator,
  Button,
  View,
  TouchableOpacity,
} from 'react-native';
import { BlueText, SafeBlueArea, BlueButton } from '../../BlueComponents';
import { Camera, Permissions } from 'expo';
import { SegwitP2SHWallet, LegacyWallet } from '../../class';
import Ionicons from 'react-native-vector-icons/Ionicons';
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
    tabBarIcon: ({ tintColor, focused }) => (
      <Ionicons
        name={focused ? 'ios-briefcase' : 'ios-briefcase-outline'}
        size={26}
        style={{ color: tintColor }}
      />
    ),
  };

  state = {
    isLoading: false,
    hasCameraPermission: null,
    type: Camera.Constants.Type.back,
  };

  async onBarCodeRead(ret) {
    if (+new Date() - this.lastTimeIveBeenHere < 3000) {
      this.lastTimeIveBeenHere = +new Date();
      return;
    }
    this.lastTimeIveBeenHere = +new Date();

    console.log('onBarCodeRead', ret);
    if (ret.data[0] === '6') {
      // password-encrypted, need to ask for password and decrypt
      console.log('trying to decrypt...');

      this.setState({
        message: loc.wallets.scanQrWif.decoding,
      });
      shold_stop_bip38 = undefined; // eslint-disable-line
      let password = await prompt(
        loc.wallets.scanQrWif.input_password,
        loc.wallets.scanQrWif.password_explain,
      );
      if (!password) {
        return;
      }
      let that = this;
      try {
        let decryptedKey = await bip38.decrypt(ret.data, password, function(
          status,
        ) {
          that.setState({
            message:
              loc.wallets.scanQrWif.decoding +
              '... ' +
              status.percent.toString().substr(0, 4) +
              ' %',
          });
        });
        ret.data = wif.encode(
          0x80,
          decryptedKey.privateKey,
          decryptedKey.compressed,
        );
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

    let newWallet = new SegwitP2SHWallet();
    newWallet.setSecret(ret.data);
    let newLegacyWallet = new LegacyWallet();
    newLegacyWallet.setSecret(ret.data);

    if (
      newWallet.getAddress() === false ||
      newLegacyWallet.getAddress() === false
    ) {
      alert(loc.wallets.scanQrWif.bad_wif);
      return;
    }

    this.setState({ isLoading: true });
    await newLegacyWallet.fetchBalance();
    console.log('newLegacyWallet == ', newLegacyWallet.getBalance());

    if (newLegacyWallet.getBalance()) {
      newLegacyWallet.setLabel(loc.wallets.scanQrWif.imported_legacy);
      BlueApp.wallets.push(newLegacyWallet);
      alert(
        loc.wallets.scanQrWif.imported_wif +
          ret.data +
          loc.wallets.scanQrWif.with_address +
          newLegacyWallet.getAddress(),
      );
    } else {
      newWallet.setLabel(loc.wallets.scanQrWif.imported_segwit);
      BlueApp.wallets.push(newWallet);
      alert(
        loc.wallets.scanQrWif.imported_wif +
          ret.data +
          loc.wallets.scanQrWif.with_address +
          newWallet.getAddress(),
      );
    }
    await BlueApp.saveToDisk();
    this.props.navigation.navigate('WalletsList');
    setTimeout(() => EV(EV.enum.WALLETS_COUNT_CHANGED), 500);
  } // end

  async componentWillMount() {
    const { status } = await Permissions.askAsync(Permissions.CAMERA);
    this.setState({
      hasCameraPermission: status === 'granted',
      onCameraReady: function() {
        alert('onCameraReady');
      },
      barCodeTypes: [Camera.Constants.BarCodeType.qr],
    });
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
                <Camera
                  style={{ flex: 1 }}
                  type={this.state.type}
                  onBarCodeRead={ret => this.onBarCodeRead(ret)}
                >
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
                      onPress={() => {
                        this.setState({
                          type:
                            this.state.type === Camera.Constants.Type.back
                              ? Camera.Constants.Type.front
                              : Camera.Constants.Type.back,
                        });
                      }}
                    >
                      <Button
                        style={{ fontSize: 18, marginBottom: 10 }}
                        title={loc.wallets.scanQrWif.go_back}
                        onPress={() => this.props.navigation.goBack()}
                      />
                    </TouchableOpacity>
                  </View>
                </Camera>
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
    navigate: PropTypes.func,
  }),
};
