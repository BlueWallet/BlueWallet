/* global alert */
import React, { Component } from 'react';
import {
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  View,
  Dimensions,
  TextInput,
  Linking,
  Platform,
  PermissionsAndroid,
  Text,
  StyleSheet,
} from 'react-native';
import ImagePicker from 'react-native-image-picker';
import Clipboard from '@react-native-community/clipboard';
import {
  BlueButton,
  SecondButton,
  BlueText,
  SafeBlueArea,
  BlueCard,
  BlueNavigationStyle,
  BlueSpacing20,
  BlueCopyToClipboardButton,
  BlueBigCheckmark,
  DynamicQRCode,
} from '../../BlueComponents';
import PropTypes from 'prop-types';
import Share from 'react-native-share';
import { getSystemName } from 'react-native-device-info';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import RNFS from 'react-native-fs';
import DocumentPicker from 'react-native-document-picker';
import loc from '../../loc';
import { BlueCurrentTheme } from '../../components/themes';
import ScanQRCode from './ScanQRCode';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import Notifications from '../../blue_modules/notifications';
const BlueElectrum = require('../../blue_modules/BlueElectrum');
/** @type {AppStorage} */
const bitcoin = require('bitcoinjs-lib');
const LocalQRCode = require('@remobile/react-native-qrcode-local-image');
const { height, width } = Dimensions.get('window');
const isDesktop = getSystemName() === 'Mac OS X';
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BlueCurrentTheme.colors.elevated,
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
    backgroundColor: BlueCurrentTheme.colors.elevated,
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
    backgroundColor: BlueCurrentTheme.colors.elevated,
  },
  hexLabel: {
    color: BlueCurrentTheme.colors.foregroundColor,
    fontWeight: '500',
  },
  hexInput: {
    borderColor: BlueCurrentTheme.colors.formBorder,
    backgroundColor: BlueCurrentTheme.colors.inputBackgroundColor,
    borderRadius: 4,
    marginTop: 20,
    color: BlueCurrentTheme.colors.foregroundColor,
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
    color: BlueCurrentTheme.colors.foregroundColor,
    fontSize: 15,
    fontWeight: '500',
    alignSelf: 'center',
  },
  copyToClipboard: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  hidden: {
    width: 0,
    height: 0,
  },
});

export default class PsbtWithHardwareWallet extends Component {
  cameraRef = null;
  static contextType = BlueStorageContext;

  _combinePSBT = receivedPSBT => {
    return this.state.fromWallet.combinePsbt(this.state.psbt, receivedPSBT);
  };

  onBarScanned = ret => {
    if (ret && !ret.data) ret = { data: ret };
    if (ret.data.toUpperCase().startsWith('UR')) {
      alert('BC-UR not decoded. This should never happen');
    }
    if (ret.data.indexOf('+') === -1 && ret.data.indexOf('=') === -1 && ret.data.indexOf('=') === -1) {
      // this looks like NOT base64, so maybe its transaction's hex
      this.setState({ txhex: ret.data });
      return;
    }
    try {
      const Tx = this._combinePSBT(ret.data);
      this.setState({ txhex: Tx.toHex() });
    } catch (Err) {
      alert(Err);
    }
  };

  constructor(props) {
    super(props);
    this.state = {
      isLoading: false,
      qrCodeHeight: height > width ? width - 40 : width / 3,
      memo: props.route.params.memo,
      psbt: props.route.params.psbt,
      fromWallet: props.route.params.fromWallet,
      isSecondPSBTAlreadyBase64: false,
      deepLinkPSBT: undefined,
      txhex: props.route.params.txhex || undefined,
      animatedQRCodeData: [],
    };
    this.fileName = `${Date.now()}.psbt`;
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    if (!prevState.psbt && !nextProps.route.params.txhex) {
      alert('There is no transaction signing in progress');
      return {
        ...prevState,
        isLoading: true,
      };
    }

    const deepLinkPSBT = nextProps.route.params.deepLinkPSBT;
    const txhex = nextProps.route.params.txhex;
    if (deepLinkPSBT) {
      const psbt = bitcoin.Psbt.fromBase64(deepLinkPSBT);
      try {
        const Tx = prevState.fromWallet.combinePsbt(prevState.psbt, psbt);
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
        const result = await this.state.fromWallet.broadcastTx(this.state.txhex);
        if (result) {
          this.setState({ success: true, isLoading: false });
          const txDecoded = bitcoin.Transaction.fromHex(this.state.txhex);
          const txid = txDecoded.getId();
          Notifications.majorTomToGroundControl([], [], [txid]);
          if (this.state.memo) {
            this.context.txMetadata[txid] = { memo: this.state.memo };
          }
        } else {
          ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
          this.setState({ isLoading: false });
          alert(loc.errors.broadcast);
        }
      } catch (error) {
        ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
        this.setState({ isLoading: false });
        alert(error.message);
      }
    });
  };

  _renderSuccess() {
    return (
      <SafeBlueArea style={styles.root}>
        <BlueBigCheckmark style={styles.blueBigCheckmark} />
        <BlueCard>
          <BlueButton onPress={() => this.props.navigation.dangerouslyGetParent().pop()} title={loc.send.success_done} />
        </BlueCard>
      </SafeBlueArea>
    );
  }

  _renderBroadcastHex() {
    return (
      <View style={styles.rootPadding}>
        <BlueCard style={styles.hexWrap}>
          <BlueText style={styles.hexLabel}>{loc.send.create_this_is_hex}</BlueText>
          <TextInput style={styles.hexInput} height={112} multiline editable value={this.state.txhex} />

          <TouchableOpacity style={styles.hexTouch} onPress={() => Clipboard.setString(this.state.txhex)}>
            <Text style={styles.hexText}>{loc.send.create_copy}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.hexTouch} onPress={() => Linking.openURL('https://coinb.in/?verify=' + this.state.txhex)}>
            <Text style={styles.hexText}>{loc.send.create_verify}</Text>
          </TouchableOpacity>
          <BlueSpacing20 />
          <SecondButton
            onPress={this.broadcast}
            title={loc.send.confirm_sendNow}
            testID="PsbtWithHardwareWalletBroadcastTransactionButton"
          />
        </BlueCard>
      </View>
    );
  }

  exportPSBT = async () => {
    if (Platform.OS === 'ios') {
      const filePath = RNFS.TemporaryDirectoryPath + `/${this.fileName}`;
      await RNFS.writeFile(filePath, typeof this.state.psbt === 'string' ? this.state.psbt : this.state.psbt.toBase64());
      Share.open({
        url: 'file://' + filePath,
        saveToFiles: isDesktop,
      })
        .catch(error => {
          console.log(error);
          alert(error.message);
        })
        .finally(() => {
          RNFS.unlink(filePath);
        });
    } else if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE, {
        title: loc.send.permission_storage_title,
        message: loc.send.permission_storage_message,
        buttonNeutral: loc.send.permission_storage_later,
        buttonNegative: loc._.cancel,
        buttonPositive: loc._.ok,
      });

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('Storage Permission: Granted');
        const filePath = RNFS.DownloadDirectoryPath + `/${this.fileName}`;
        await RNFS.writeFile(filePath, typeof this.state.psbt === 'string' ? this.state.psbt : this.state.psbt.toBase64());
        alert(loc.formatString(loc.send.txSaved, { filePath: this.fileName }));
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
        this.setState({ isSecondPSBTAlreadyBase64: true }, () => this.onBarScanned({ data: file }));
      } else {
        this.setState({ isSecondPSBTAlreadyBase64: false });
        throw new Error();
      }
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        alert(loc.send.details_no_signed_tx);
      }
    }
  };

  openScanner = () => {
    if (isDesktop) {
      ImagePicker.launchCamera(
        {
          title: null,
          mediaType: 'photo',
          takePhotoButtonTitle: null,
        },
        response => {
          if (response.uri) {
            const uri = Platform.OS === 'ios' ? response.uri.toString().replace('file://', '') : response.path.toString();
            LocalQRCode.decode(uri, (error, result) => {
              if (!error) {
                this.onBarScanned(result);
              } else {
                alert(loc.send.qr_error_no_qrcode);
              }
            });
          } else if (response.error) {
            ScanQRCode.presentCameraNotAuthorizedAlert(response.error);
          }
        },
      );
    } else {
      this.props.navigation.navigate('ScanQRCodeRoot', {
        screen: 'ScanQRCode',
        params: {
          launchedBy: this.props.route.name,
          showFileImportButton: false,
          onBarScanned: this.onBarScanned,
        },
      });
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
    if (this.state.txhex) return this._renderBroadcastHex();

    return (
      <SafeBlueArea style={styles.root}>
        <ScrollView centerContent contentContainerStyle={styles.scrollViewContent} testID="PsbtWithHardwareScrollView">
          <View style={styles.container}>
            <BlueCard>
              <BlueText testID="TextHelperForPSBT">{loc.send.psbt_this_is_psbt}</BlueText>
              <BlueSpacing20 />
              <Text testID="PSBTHex" style={styles.hidden}>
                {this.state.psbt.toHex()}
              </Text>
              <DynamicQRCode value={this.state.psbt.toHex()} capacity={200} />
              <BlueSpacing20 />
              <SecondButton
                testID="PsbtTxScanButton"
                icon={{
                  name: 'qrcode',
                  type: 'font-awesome',
                  color: BlueCurrentTheme.colors.buttonTextColor,
                }}
                onPress={this.openScanner}
                title={loc.send.psbt_tx_scan}
              />
              <BlueSpacing20 />
              <SecondButton
                icon={{
                  name: 'file-import',
                  type: 'material-community',
                  color: BlueCurrentTheme.colors.buttonTextColor,
                }}
                onPress={this.openSignedTransaction}
                title={loc.send.psbt_tx_open}
              />
              <BlueSpacing20 />
              <SecondButton
                icon={{
                  name: 'share-alternative',
                  type: 'entypo',
                  color: BlueCurrentTheme.colors.buttonTextColor,
                }}
                onPress={this.exportPSBT}
                title={loc.send.psbt_tx_export}
              />
              <BlueSpacing20 />
              <View style={styles.copyToClipboard}>
                <BlueCopyToClipboardButton
                  stringToCopy={typeof this.state.psbt === 'string' ? this.state.psbt : this.state.psbt.toBase64()}
                  displayText={loc.send.psbt_clipboard}
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
    name: PropTypes.string,
  }),
};

PsbtWithHardwareWallet.navigationOptions = () => ({
  ...BlueNavigationStyle(null, false),
  title: loc.send.header,
});
