/* global alert */
import React, { Component } from 'react';
import {
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  View,
  Dimensions,
  Image,
  TextInput,
  Clipboard,
  Linking,
  Platform,
  PermissionsAndroid,
  StyleSheet,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Text } from 'react-native-elements';
import {
  BlueButton,
  BlueText,
  SafeBlueArea,
  BlueCard,
  BlueNavigationStyle,
  BlueSpacing20,
  BlueCopyToClipboardButton,
  BlueBigCheckmark,
} from '../../BlueComponents';
import PropTypes from 'prop-types';
import Share from 'react-native-share';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { RNCamera } from 'react-native-camera';
import RNFS from 'react-native-fs';
import DocumentPicker from 'react-native-document-picker';
let loc = require('../../loc');
let EV = require('../../events');
let BlueElectrum = require('../../BlueElectrum');
/** @type {AppStorage} */
const BlueApp = require('../../BlueApp');
const bitcoin = require('bitcoinjs-lib');
const { height, width } = Dimensions.get('window');

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 16,
    paddingBottom: 16,
  },
  rootCamera: {
    flex: 1,
    justifyContent: 'space-between',
  },
  rootPadding: {
    flex: 1,
    paddingTop: 20,
  },
  closeCamera: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    borderRadius: 20,
    position: 'absolute',
    right: 16,
    top: 64,
  },
  closeCameraImage: {
    alignSelf: 'center',
  },
  blueBigCheckmark: {
    marginTop: 143,
    marginBottom: 53,
  },
  hexWrap: {
    alignItems: 'center',
    flex: 1,
  },
  hexLabel: {
    color: '#0c2550',
    fontWeight: '500',
  },
  hexInput: {
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
  },
  hexTouch: {
    marginVertical: 24,
  },
  hexText: {
    color: '#9aa0aa',
    fontSize: 15,
    fontWeight: '500',
    alignSelf: 'center',
  },
  copyToClipboard: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default class PsbtWithHardwareWallet extends Component {
  static navigationOptions = () => ({
    ...BlueNavigationStyle(null, false),
    title: loc.send.header,
  });

  cameraRef = null;

  onBarCodeRead = ret => {
    if (RNCamera.Constants.CameraStatus === RNCamera.Constants.CameraStatus.READY) this.cameraRef.pausePreview();

    if (ret.data.indexOf('+') === -1 && ret.data.indexOf('=') === -1 && ret.data.indexOf('=') === -1) {
      // this looks like NOT base64, so maybe its transaction's hex
      this.setState({ renderScanner: false, txhex: ret.data });
      return;
    }

    this.setState({ renderScanner: false }, () => {
      try {
        let Tx = this.state.fromWallet.combinePsbt(
          this.state.isFirstPSBTAlreadyBase64 ? this.state.psbt : this.state.psbt.toBase64(),
          ret.data,
        );
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
      qrCodeHeight: height > width ? width - 40 : width / 3,
      memo: props.route.params.memo,
      psbt: props.route.params.psbt,
      fromWallet: props.route.params.fromWallet,
      isFirstPSBTAlreadyBase64: props.route.params.isFirstPSBTAlreadyBase64,
      isSecondPSBTAlreadyBase64: false,
      deepLinkPSBT: undefined,
      txhex: props.route.params.txhex || undefined,
    };
    this.fileName = `${Date.now()}.psbt`;
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    const deepLinkPSBT = nextProps.route.params.deepLinkPSBT;
    const txhex = nextProps.route.params.txhex;
    if (deepLinkPSBT) {
      try {
        let Tx = prevState.fromWallet.combinePsbt(
          prevState.isFirstPSBTAlreadyBase64 ? prevState.psbt : prevState.psbt.toBase64(),
          deepLinkPSBT,
        );
        return {
          ...prevState,
          txhex: Tx.toHex(),
        };
      } catch (Err) {
        alert(Err);
      }
    } else if (txhex) {
      return {
        ...prevState,
        txhex: txhex,
      };
    }
    return prevState;
  }

  componentDidMount() {
    console.log('send/psbtWithHardwareWallet - componentDidMount');
  }

  broadcast = () => {
    this.setState({ isLoading: true }, async () => {
      try {
        await BlueElectrum.ping();
        await BlueElectrum.waitTillConnected();
        let result = await this.state.fromWallet.broadcastTx(this.state.txhex);
        if (result) {
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
      <SafeBlueArea style={styles.root}>
        <RNCamera
          captureAudio={false}
          androidCameraPermissionOptions={{
            title: 'Permission to use camera',
            message: 'We need your permission to use your camera',
            buttonPositive: 'OK',
            buttonNegative: 'Cancel',
          }}
          ref={ref => (this.cameraRef = ref)}
          style={styles.rootCamera}
          onBarCodeRead={this.onBarCodeRead}
          barCodeTypes={[RNCamera.Constants.BarCodeType.qr]}
        />
        <TouchableOpacity style={styles.closeCamera} onPress={() => this.setState({ renderScanner: false })}>
          <Image style={styles.closeCameraImage} source={require('../../img/close-white.png')} />
        </TouchableOpacity>
      </SafeBlueArea>
    );
  }

  _renderSuccess() {
    return (
      <SafeBlueArea style={styles.root}>
        <BlueBigCheckmark style={styles.blueBigCheckmark} />
        <BlueCard>
          <BlueButton onPress={this.props.navigation.dangerouslyGetParent().pop} title={loc.send.success.done} />
        </BlueCard>
      </SafeBlueArea>
    );
  }

  _renderBroadcastHex() {
    return (
      <View style={styles.rootPadding}>
        <BlueCard style={styles.hexWrap}>
          <BlueText style={styles.hexLabel}>{loc.send.create.this_is_hex}</BlueText>
          <TextInput style={styles.hexInput} height={112} multiline editable value={this.state.txhex} />

          <TouchableOpacity style={styles.hexTouch} onPress={() => Clipboard.setString(this.state.txhex)}>
            <Text style={styles.hexText}>Copy and broadcast later</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.hexTouch} onPress={() => Linking.openURL('https://coinb.in/?verify=' + this.state.txhex)}>
            <Text style={styles.hexText}>Verify on coinb.in</Text>
          </TouchableOpacity>
          <BlueSpacing20 />
          <BlueButton onPress={this.broadcast} title={loc.send.confirm.sendNow} />
        </BlueCard>
      </View>
    );
  }

  exportPSBT = async () => {
    if (Platform.OS === 'ios') {
      const filePath = RNFS.TemporaryDirectoryPath + `/${this.fileName}`;
      await RNFS.writeFile(filePath, this.state.isFirstPSBTAlreadyBase64 ? this.state.psbt : this.state.psbt.toBase64());
      Share.open({
        url: 'file://' + filePath,
      })
        .catch(error => console.log(error))
        .finally(() => {
          RNFS.unlink(filePath);
        });
    } else if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE, {
        title: 'BlueWallet Storage Access Permission',
        message: 'BlueWallet needs your permission to access your storage to save this transaction.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      });

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('Storage Permission: Granted');
        const filePath = RNFS.ExternalCachesDirectoryPath + `/${this.fileName}`;
        await RNFS.writeFile(filePath, this.state.isFirstPSBTAlreadyBase64 ? this.state.psbt : this.state.psbt.toBase64());
        alert(`This transaction has been saved in ${filePath}`);
      } else {
        console.log('Storage Permission: Denied');
      }
    }
  };

  openSignedTransaction = async () => {
    try {
      const res = await DocumentPicker.pick({
        type: Platform.OS === 'ios' ? ['io.bluewallet.psbt', 'io.bluewallt.psbt.txn'] : [DocumentPicker.types.allFiles],
      });
      const file = await RNFS.readFile(res.uri);
      if (file) {
        this.setState({ isSecondPSBTAlreadyBase64: true }, () => this.onBarCodeRead({ data: file }));
      } else {
        this.setState({ isSecondPSBTAlreadyBase64: false });
        throw new Error();
      }
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        alert('The selected file does not contain a signed transaction that can be imported.');
      }
    }
  };

  render() {
    if (this.state.isLoading) {
      return (
        <View style={styles.rootPadding}>
          <ActivityIndicator />
        </View>
      );
    }

    if (this.state.success) return this._renderSuccess();
    if (this.state.renderScanner) return this._renderScanner();
    if (this.state.txhex) return this._renderBroadcastHex();

    return (
      <SafeBlueArea style={styles.root}>
        <ScrollView centerContent contentContainerStyle={styles.scrollViewContent}>
          <View style={styles.container}>
            <BlueCard>
              <BlueText testID={'TextHelperForPSBT'}>
                This is partially signed bitcoin transaction (PSBT). Please finish signing it with your hardware wallet.
              </BlueText>
              <BlueSpacing20 />
              <QRCode
                value={this.state.isFirstPSBTAlreadyBase64 ? this.state.psbt : this.state.psbt.toBase64()}
                size={this.state.qrCodeHeight}
                color={BlueApp.settings.foregroundColor}
                logoBackgroundColor={BlueApp.settings.brandingColor}
                ecl={'L'}
              />
              <BlueSpacing20 />
              <BlueButton
                icon={{
                  name: 'qrcode',
                  type: 'font-awesome',
                  color: BlueApp.settings.buttonTextColor,
                }}
                onPress={() => this.setState({ renderScanner: true })}
                title={'Scan Signed Transaction'}
              />
              <BlueSpacing20 />
              <BlueButton
                icon={{
                  name: 'file-import',
                  type: 'material-community',
                  color: BlueApp.settings.buttonTextColor,
                }}
                onPress={this.openSignedTransaction}
                title={'Open Signed Transaction'}
              />
              <BlueSpacing20 />
              <BlueButton
                icon={{
                  name: 'share-alternative',
                  type: 'entypo',
                  color: BlueApp.settings.buttonTextColor,
                }}
                onPress={this.exportPSBT}
                title={'Export to file'}
              />
              <BlueSpacing20 />
              <View style={styles.copyToClipboard}>
                <BlueCopyToClipboardButton
                  stringToCopy={this.state.isFirstPSBTAlreadyBase64 ? this.state.psbt : this.state.psbt.toBase64()}
                  displayText={'Copy to Clipboard'}
                />
              </View>
            </BlueCard>
          </View>
        </ScrollView>
      </SafeBlueArea>
    );
  }
}

PsbtWithHardwareWallet.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func,
    navigate: PropTypes.func,
    dangerouslyGetParent: PropTypes.func,
  }),
  route: PropTypes.shape({
    params: PropTypes.object,
  }),
};
