/* global alert */
import React, { Component } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  BlueButton,
  BlueButtonLink,
  BlueCard,
  BlueNavigationStyle,
  BlueSpacing20,
  BlueText,
  SafeBlueArea,
  SecondButton,
} from '../../BlueComponents';
import { DynamicQRCode } from '../../components/DynamicQRCode';
import { SquareButton } from '../../components/SquareButton';
import PropTypes from 'prop-types';
import { getSystemName } from 'react-native-device-info';
import { decodeUR, extractSingleWorkload } from 'bc-ur/dist';
import loc from '../../loc';
import { BlueCurrentTheme } from '../../components/themes';
import { Icon } from 'react-native-elements';
import ImagePicker from 'react-native-image-picker';
import ScanQRCode from './ScanQRCode';

const BlueApp = require('../../BlueApp');
const bitcoin = require('bitcoinjs-lib');
const currency = require('../../blue_modules/currency');
const fs = require('../../blue_modules/fs');
const LocalQRCode = require('@remobile/react-native-qrcode-local-image');
const { height, width } = Dimensions.get('window');
const isDesktop = getSystemName() === 'Mac OS X';
const BigNumber = require('bignumber.js');

export default class PsbtMultisig extends Component {
  cameraRef = null;

  static shortenAddress(addr) {
    return addr.substr(0, Math.floor(addr.length / 2) - 1) + '\n' + addr.substr(Math.floor(addr.length / 2) - 1, addr.length);
  }

  constructor(props) {
    super(props);

    const walletId = props.route.params.walletId;
    const psbtBase64 = props.route.params.psbtBase64;
    const memo = props.route.params.memo;

    /** @type MultisigHDWallet */
    const wallet = BlueApp.getWallets().find(w => w.getID() === walletId);
    const psbt = bitcoin.Psbt.fromBase64(psbtBase64);
    let destination = [];
    let totalSat = 0;
    const targets = [];
    for (const output of psbt.txOutputs) {
      if (output.address && !wallet.weOwnAddress(output.address)) {
        totalSat += output.value;
        destination.push(output.address);
        targets.push({ address: output.address, value: output.value });
      }
    }
    destination = PsbtMultisig.shortenAddress(destination.join(', '));
    const totalBtc = new BigNumber(totalSat).dividedBy(100000000).toNumber();
    const totalFiat = currency.satoshiToLocalCurrency(totalSat);

    this.state = {
      isLoading: false,
      qrCodeHeight: height > width ? width - 40 : width / 3,
      animatedQRCodeData: [],
      wallet,
      psbt,
      memo,
      totalBtc,
      totalFiat,
      destination,
      targets,
      isModalVisible: false,
    };
    this.fileName = `${Date.now()}.psbt`;
  }

  componentDidMount() {
    console.log('send/PsbtMultisig - componentDidMount');
  }

  howManySignaturesWeHave() {
    let sigsHave = 0;
    for (const inp of this.state.psbt.data.inputs) {
      sigsHave = Math.max(sigsHave, inp?.partialSig?.length || 0);
      if (inp.finalScriptSig || inp.finalScriptWitness) sigsHave = this.state.wallet.getM(); // hacky
    }

    return sigsHave;
  }

  getFee() {
    let goesIn = 0;
    for (const inp of this.state.psbt.data.inputs) {
      if (inp.witnessUtxo && inp.witnessUtxo.value) goesIn += inp.witnessUtxo.value;
    }

    let goesOut = 0;
    for (const output of this.state.psbt.txOutputs) {
      goesOut += output.value;
    }

    return goesIn - goesOut;
  }

  _renderItem = el => {
    if (el.index >= this.howManySignaturesWeHave()) return this._renderItemUnsigned(el);
    else return this._renderItemSigned(el);
  };

  _renderItemUnsigned = el => {
    const renderExportImport = el.index === this.howManySignaturesWeHave();
    return (
      <View>
        <View style={{ flexDirection: 'row', paddingTop: 10 }}>
          <View
            style={{ backgroundColor: '#EEF0F4', width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' }}
          >
            <Text style={{ fontSize: 18, color: '#9AA0AA' }}>{el.index + 1}</Text>
          </View>
          <View style={{ justifyContent: 'center', alignItems: 'center', paddingLeft: 15 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#9AA0AA' }}>Vault key {el.index + 1}</Text>
          </View>
        </View>

        {renderExportImport && (
          <View>
            <TouchableOpacity
              style={{
                marginTop: 20,
                backgroundColor: '#EEF0F4',
                height: 60,
                borderRadius: 10,
                flex: 1,
                justifyContent: 'center',
                paddingLeft: 15,
                marginBottom: 30,
              }}
              onPress={() => {
                this.setState({ isModalVisible: true });
              }}
            >
              <Text style={{ color: '#0C2550', fontWeight: 'normal', fontSize: 18 }}>Provide signature</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  _renderItemSigned = el => {
    return (
      <View style={{ flexDirection: 'row' }}>
        <Icon size={58} name="check-circle" type="font-awesome" color="#37C0A1" />
        <View style={{ justifyContent: 'center', alignItems: 'center', paddingLeft: 15 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#37C0A1' }}>Vault key {el.index + 1}</Text>
        </View>
      </View>
    );
  };

  _onReadUniformResource = ur => {
    try {
      const [index, total] = extractSingleWorkload(ur);
      const { animatedQRCodeData } = this.state;
      if (animatedQRCodeData.length > 0) {
        const currentTotal = animatedQRCodeData[0].total;
        if (total !== currentTotal) {
          alert('invalid animated QRCode');
        }
      }
      if (!animatedQRCodeData.find(i => i.index === index)) {
        this.setState(
          state => ({
            animatedQRCodeData: [
              ...state.animatedQRCodeData,
              {
                index,
                total,
                data: ur,
              },
            ],
          }),
          () => {
            if (this.state.animatedQRCodeData.length === total) {
              const payload = decodeUR(this.state.animatedQRCodeData.map(i => i.data));
              const psbtB64 = Buffer.from(payload, 'hex').toString('base64');
              this._combinePSBT(psbtB64);
            }
          },
        );
      }
    } catch (Err) {
      alert('invalid animated QRCode fragment, please try again');
    }
  };

  _combinePSBT = receivedPSBTBase64 => {
    const receivedPSBT = bitcoin.Psbt.fromBase64(receivedPSBTBase64);
    const newPsbt = this.state.psbt.combine(receivedPSBT);
    this.props.navigation.dangerouslyGetParent().pop();
    this.setState({
      psbt: newPsbt,
      isModalVisible: false,
    });
  };

  onBarScanned = ret => {
    if (ret && !ret.data) ret = { data: ret };
    if (ret.data.toUpperCase().startsWith('UR')) {
      return this._onReadUniformResource(ret.data);
    } else if (ret.data.indexOf('+') === -1 && ret.data.indexOf('=') === -1 && ret.data.indexOf('=') === -1) {
      // this looks like NOT base64, so maybe its transaction's hex
      this.setState({ txhex: ret.data });
    } else {
      // psbt base64?
      this._combinePSBT(ret.data);
    }
  };

  onConfirm = () => {
    try {
      this.state.psbt.finalizeAllInputs();
    } catch (_) {} // ignore if it is already finalized

    try {
      const tx = this.state.psbt.extractTransaction().toHex();
      const satoshiPerByte = Math.round(this.getFee() / (tx.length / 2));
      this.props.navigation.navigate('Confirm', {
        fee: new BigNumber(this.getFee()).dividedBy(100000000).toNumber(), // fixme
        memo: this.state.memo,
        fromWallet: this.state.wallet,
        tx,
        recipients: this.state.targets,
        satoshiPerByte,
        // payjoinUrl: this.state.payjoinUrl,
        // psbt: this.state.psbt, // not really needed // fixme
      });
    } catch (error) {
      alert(error);
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
          onBarScanned: this.onBarScanned,
          showFileImportButton: true,
        },
      });
    }
  };

  exportPSBT = async () => {
    await fs.writeFileAndExport(this.fileName, this.state.psbt.toBase64());
  };

  openSignedTransaction = async () => {
    try {
      const base64 = await fs.openSignedTransaction();
      if (base64) {
        const readPsbt = bitcoin.Psbt.fromBase64(base64);
        const psbt = this.state.psbt.combine(readPsbt);
        this.setState({
          psbt,
          isModalVisible: false,
        });
      }
    } catch (error) {
      alert(error);
    }
  };

  isConfirmEnabled() {
    return this.howManySignaturesWeHave() >= this.state.wallet.getM();
  }

  renderDynamicQrCode() {
    return (
      <SafeBlueArea style={styles.root}>
        <ScrollView centerContent contentContainerStyle={styles.scrollViewContent} testID="PsbtMultisigScrollView">
          <View style={styles.modalContentShort}>
            <DynamicQRCode value={this.state.psbt.toHex()} capacity={666} />
            <BlueSpacing20 />
            <SquareButton backgroundColor="#EEF0F4" onPress={this.openScanner} title="Scan or import file" />
            <BlueSpacing20 />
            <SquareButton backgroundColor="#EEF0F4" onPress={this.exportPSBT} title="Share" />
            <BlueSpacing20 />
            <BlueButtonLink title="Cancel" onPress={() => this.setState({ isModalVisible: false })} />
          </View>
        </ScrollView>
      </SafeBlueArea>
    );
  }

  render() {
    if (this.state.isLoading) {
      return (
        <View style={styles.rootPadding}>
          <ActivityIndicator />
        </View>
      );
    }

    if (this.state.isModalVisible) return this.renderDynamicQrCode();

    return (
      <SafeBlueArea style={styles.root}>
        <ScrollView centerContent contentContainerStyle={styles.scrollViewContent} testID="PsbtMultisigScrollView">
          <View style={styles.container}>
            <View style={styles.containerText}>
              <BlueText style={styles.textBtc}>{this.state.totalBtc}</BlueText>
              <View style={{ justifyContent: 'flex-end', bottom: 5 }}>
                <BlueText> BTC</BlueText>
              </View>
            </View>
            <View style={styles.containerText}>
              <BlueText style={styles.textFiat}>{this.state.totalFiat}</BlueText>
            </View>
            <View style={styles.containerText}>
              <BlueText style={styles.textDestination}>{this.state.destination}</BlueText>
            </View>

            <BlueCard>
              <FlatList
                data={new Array(this.state.wallet.getM())}
                renderItem={this._renderItem}
                keyExtractor={(_item, index) => `${index}`}
              />
            </BlueCard>
          </View>

          <View style={{ justifyContent: 'center', alignItems: 'center', paddingBottom: 20 }}>
            <View style={{ flexDirection: 'row', paddingBottom: 20 }}>
              <BlueText style={{ color: 'gray' }}>Fee: {currency.satoshiToLocalCurrency(this.getFee())} - </BlueText>
              <BlueText>{currency.satoshiToBTC(this.getFee())} BTC</BlueText>
            </View>
            <BlueButton disabled={!this.isConfirmEnabled()} title="Confirm" onPress={this.onConfirm} />
          </View>
        </ScrollView>
      </SafeBlueArea>
    );
  }
}

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
    flexDirection: 'column',
    justifyContent: 'center',
  },
  containerText: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  textFiat: {
    color: 'gray',
    fontSize: 16,
    fontWeight: '500',
  },
  textBtc: {
    fontWeight: 'bold',
    fontSize: 30,
    color: BlueCurrentTheme.colors.foregroundColor,
  },
  textDestination: {
    paddingTop: 10,
    color: BlueCurrentTheme.colors.foregroundColor,
    paddingBottom: 40,
  },
  bottomModal: {
    justifyContent: 'flex-end',
    margin: 0,
  },

  modalContentShort: {
    backgroundColor: BlueCurrentTheme.colors.elevated,
    marginLeft: 20,
    marginRight: 20,
  },

  copyToClipboard: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

PsbtMultisig.propTypes = {
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

PsbtMultisig.navigationOptions = () => ({
  ...BlueNavigationStyle(null, false),
  title: loc.send.header,
});
