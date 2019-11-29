/* global alert */
import React, { Component } from 'react';
import { ActivityIndicator, TouchableOpacity, View, Dimensions, Image, TextInput, Clipboard, Linking } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Icon, Text } from 'react-native-elements';
import {
  BlueButton,
  BlueText,
  SafeBlueArea,
  BlueCard,
  BlueNavigationStyle,
  BlueSpacing20,
  BlueCopyToClipboardButton,
} from '../../BlueComponents';
import PropTypes from 'prop-types';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { RNCamera } from 'react-native-camera';
let loc = require('../../loc');
let EV = require('../../events');
let BlueElectrum = require('../../BlueElectrum');
/** @type {AppStorage} */
const BlueApp = require('../../BlueApp');
const bitcoin = require('bitcoinjs-lib');
const { height, width } = Dimensions.get('window');

export default class PsbtWithHardwareWallet extends Component {
  static navigationOptions = () => ({
    ...BlueNavigationStyle(null, false),
    title: loc.send.header,
  });

  cameraRef = null;

  onBarCodeRead = ret => {
    if (RNCamera.Constants.CameraStatus === RNCamera.Constants.CameraStatus.READY) this.cameraRef.pausePreview();
    this.setState({ renderScanner: false }, () => {
      console.log(ret.data);
      try {
        let Tx = this.state.fromWallet.combinePsbt(this.state.psbt.toBase64(), ret.data);
        this.setState({ txhex: Tx.toHex() });
      } catch (Err) {
        alert(Err);
      }
    });
  };

  constructor(props) {
    super(props);

    this.state = {
      isLoading: false,
      renderScanner: false,
      qrCodeHeight: height > width ? width - 40 : width / 2,
      memo: props.navigation.getParam('memo'),
      psbt: props.navigation.getParam('psbt'),
      fromWallet: props.navigation.getParam('fromWallet'),
    };
  }

  async componentDidMount() {
    console.log('send/psbtWithHardwareWallet - componentDidMount');
  }

  broadcast = () => {
    this.setState({ isLoading: true }, async () => {
      try {
        await BlueElectrum.ping();
        await BlueElectrum.waitTillConnected();
        let result = await this.state.fromWallet.broadcastTx(this.state.txhex);
        if (result) {
          console.log('broadcast result = ', result);
          EV(EV.enum.REMOTE_TRANSACTIONS_COUNT_CHANGED); // someone should fetch txs
          this.setState({ success: true, isLoading: false });
          if (this.state.memo) {
            let txDecoded = bitcoin.Transaction.fromHex(this.state.txhex);
            const txid = txDecoded.getId();
            BlueApp.tx_metadata[txid] = { memo: this.state.memo };
          }
        } else {
          ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
          this.setState({ isLoading: false });
          alert('Broadcast failed');
        }
      } catch (error) {
        ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
        this.setState({ isLoading: false });
        alert(error.message);
      }
    });
  };

  _renderScanner() {
    return (
      <SafeBlueArea style={{ flex: 1 }}>
        <RNCamera
          captureAudio={false}
          androidCameraPermissionOptions={{
            title: 'Permission to use camera',
            message: 'We need your permission to use your camera',
            buttonPositive: 'OK',
            buttonNegative: 'Cancel',
          }}
          ref={ref => (this.cameraRef = ref)}
          style={{ flex: 1, justifyContent: 'space-between' }}
          onBarCodeRead={this.onBarCodeRead}
          barCodeTypes={[RNCamera.Constants.BarCodeType.qr]}
        />
        <TouchableOpacity
          style={{
            width: 40,
            height: 40,
            backgroundColor: 'rgba(0,0,0,0.4)',
            justifyContent: 'center',
            borderRadius: 20,
            position: 'absolute',
            right: 16,
            top: 64,
          }}
          onPress={() => this.setState({ renderScanner: false })}
        >
          <Image style={{ alignSelf: 'center' }} source={require('../../img/close-white.png')} />
        </TouchableOpacity>
      </SafeBlueArea>
    );
  }

  _renderSuccess() {
    return (
      <SafeBlueArea style={{ flex: 1 }}>
        <View
          style={{
            backgroundColor: '#ccddf9',
            width: 120,
            height: 120,
            borderRadius: 60,
            alignSelf: 'center',
            justifyContent: 'center',
            marginTop: 143,
            marginBottom: 53,
          }}
        >
          <Icon name="check" size={50} type="font-awesome" color="#0f5cc0" />
        </View>
        <BlueCard>
          <BlueButton onPress={this.props.navigation.dismiss} title={loc.send.success.done} />
        </BlueCard>
      </SafeBlueArea>
    );
  }

  _renderBroadcastHex() {
    return (
      <View style={{ flex: 1, paddingTop: 20 }}>
        <BlueCard style={{ alignItems: 'center', flex: 1 }}>
          <BlueText style={{ color: '#0c2550', fontWeight: '500' }}>{loc.send.create.this_is_hex}</BlueText>
          <TextInput
            style={{
              borderColor: '#ebebeb',
              backgroundColor: '#d2f8d6',
              borderRadius: 4,
              marginTop: 20,
              color: '#37c0a1',
              fontWeight: '500',
              fontSize: 14,
              paddingHorizontal: 16,
              paddingBottom: 16,
              paddingTop: 16,
            }}
            height={112}
            multiline
            editable
            value={this.state.txhex}
          />

          <TouchableOpacity style={{ marginVertical: 24 }} onPress={() => Clipboard.setString(this.state.txhex)}>
            <Text style={{ color: '#9aa0aa', fontSize: 15, fontWeight: '500', alignSelf: 'center' }}>Copy and broadcast later</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ marginVertical: 24 }} onPress={() => Linking.openURL('https://coinb.in/?verify=' + this.state.txhex)}>
            <Text style={{ color: '#9aa0aa', fontSize: 15, fontWeight: '500', alignSelf: 'center' }}>Verify on coinb.in</Text>
          </TouchableOpacity>
          <BlueSpacing20 />
          <BlueButton onPress={this.broadcast} title={loc.send.confirm.sendNow} />
        </BlueCard>
      </View>
    );
  }

  render() {
    if (this.state.isLoading) {
      return (
        <View style={{ flex: 1, paddingTop: 20 }}>
          <ActivityIndicator />
        </View>
      );
    }

    if (this.state.success) return this._renderSuccess();
    if (this.state.renderScanner) return this._renderScanner();
    if (this.state.txhex) return this._renderBroadcastHex();

    return (
      <SafeBlueArea style={{ flex: 1 }}>
        <View style={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'center', paddingTop: 16, paddingBottom: 16 }}>
            <BlueCard>
              <BlueText>This is partially signed bitcoin transaction (PSBT). Please finish signing it with your hardware wallet.</BlueText>
              <BlueSpacing20 />
              <QRCode
                value={this.state.psbt.toBase64()}
                size={this.state.qrCodeHeight}
                color={BlueApp.settings.foregroundColor}
                logoBackgroundColor={BlueApp.settings.brandingColor}
                ecl={'L'}
              />
              <BlueSpacing20 />
              <BlueButton onPress={() => this.setState({ renderScanner: true })} title={'Scan signed transaction'} />
              <BlueSpacing20 />
              <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                <BlueCopyToClipboardButton stringToCopy={this.state.psbt.toBase64()} displayText={'Copy to Clipboard'} />
              </View>
            </BlueCard>
          </View>
        </View>
      </SafeBlueArea>
    );
  }
}

PsbtWithHardwareWallet.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func,
    getParam: PropTypes.func,
    navigate: PropTypes.func,
    dismiss: PropTypes.func,
    state: PropTypes.shape({
      params: PropTypes.shape({
        memo: PropTypes.string,
        fromWallet: PropTypes.shape({
          fromAddress: PropTypes.string,
          fromSecret: PropTypes.string,
        }),
      }),
    }),
  }),
};
