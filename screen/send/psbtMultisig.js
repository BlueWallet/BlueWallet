/* global alert */
import React, { useState } from 'react';
import { FlatList, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlueButton, BlueButtonLink, BlueCard, BlueNavigationStyle, BlueSpacing20, BlueText, SafeBlueArea } from '../../BlueComponents';
import { DynamicQRCode } from '../../components/DynamicQRCode';
import { SquareButton } from '../../components/SquareButton';
import { getSystemName } from 'react-native-device-info';
import { decodeUR, extractSingleWorkload } from 'bc-ur/dist';
import loc from '../../loc';
import { Icon } from 'react-native-elements';
import ImagePicker from 'react-native-image-picker';
import ScanQRCode from './ScanQRCode';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';

const BlueApp = require('../../BlueApp');
const bitcoin = require('bitcoinjs-lib');
const currency = require('../../blue_modules/currency');
const fs = require('../../blue_modules/fs');
const LocalQRCode = require('@remobile/react-native-qrcode-local-image');
const isDesktop = getSystemName() === 'Mac OS X';
const BigNumber = require('bignumber.js');

const shortenAddress = addr => {
  return addr.substr(0, Math.floor(addr.length / 2) - 1) + '\n' + addr.substr(Math.floor(addr.length / 2) - 1, addr.length);
};

const PsbtMultisig = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors } = useTheme();

  const walletId = route.params.walletId;
  const psbtBase64 = route.params.psbtBase64;
  const memo = route.params.memo;

  const [psbt, setPsbt] = useState(bitcoin.Psbt.fromBase64(psbtBase64));
  const [animatedQRCodeData, setAnimatedQRCodeData] = useState({});
  const [isModalVisible, setIsModalVisible] = useState(false);
  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
    },
    textBtc: {
      color: colors.foregroundColor,
    },
    textDestination: {
      color: colors.foregroundColor,
    },
    modalContentShort: {
      backgroundColor: colors.elevated,
    },
    textFiat: {
      color: colors.alternativeTextColor,
    },
    provideSignatureButton: {
      backgroundColor: colors.buttonDisabledBackgroundColor,
    },
    exportButton: {
      backgroundColor: colors.buttonDisabledBackgroundColor,
    },
    provideSignatureButtonText: {
      color: colors.buttonTextColor,
    },
    vaultKeyCircle: {
      backgroundColor: colors.buttonDisabledBackgroundColor,
    },
    vaultKeyText: {
      color: colors.alternativeTextColor,
    },
    feeFiatText: {
      color: colors.alternativeTextColor,
    },
  });
  /** @type MultisigHDWallet */
  const wallet = BlueApp.getWallets().find(w => w.getID() === walletId);
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
  destination = shortenAddress(destination.join(', '));
  const totalBtc = new BigNumber(totalSat).dividedBy(100000000).toNumber();
  const totalFiat = currency.satoshiToLocalCurrency(totalSat);
  const fileName = `${Date.now()}.psbt`;

  const howManySignaturesWeHave = () => {
    return wallet.calculateHowManySignaturesWeHaveFromPsbt(psbt);
  };

  const getFee = () => {
    return wallet.calculateFeeFromPsbt(psbt);
  };

  const _renderItem = el => {
    if (el.index >= howManySignaturesWeHave()) return _renderItemUnsigned(el);
    else return _renderItemSigned(el);
  };

  const _renderItemUnsigned = el => {
    const renderProvideSignature = el.index === howManySignaturesWeHave();
    return (
      <View>
        <View style={styles.itemUnsignedWrapper}>
          <View style={[styles.vaultKeyCircle, stylesHook.vaultKeyCircle]}>
            <Text style={[styles.vaultKeyText, stylesHook.vaultKeyText]}>{el.index + 1}</Text>
          </View>
          <View style={styles.vaultKeyTextWrapper}>
            <Text style={[styles.vaultKeyText, stylesHook.vaultKeyText]}>
              {loc.formatString(loc.multisig.vault_key, { number: el.index + 1 })}
            </Text>
          </View>
        </View>

        {renderProvideSignature && (
          <View>
            <TouchableOpacity
              style={[styles.provideSignatureButton, stylesHook.provideSignatureButton]}
              onPress={() => {
                setIsModalVisible(true);
              }}
            >
              <Text style={[styles.provideSignatureButtonText, stylesHook.provideSignatureButtonText]}>
                {loc.multisig.provide_signature}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const _renderItemSigned = el => {
    return (
      <View style={styles.flexDirectionRow}>
        <Icon size={58} name="check-circle" type="font-awesome" color="#37C0A1" />
        <View style={styles.vaultKeyTextSignedWrapper}>
          <Text style={styles.vaultKeyTextSigned}>{loc.formatString(loc.multisig.vault_key, { number: el.index + 1 })}</Text>
        </View>
      </View>
    );
  };

  const _onReadUniformResource = ur => {
    try {
      const [index, total] = extractSingleWorkload(ur);
      animatedQRCodeData[index + 'of' + total] = ur;
      if (Object.values(animatedQRCodeData).length === total) {
        const payload = decodeUR(Object.values(animatedQRCodeData));
        const psbtB64 = Buffer.from(payload, 'hex').toString('base64');
        _combinePSBT(psbtB64);
      } else {
        setAnimatedQRCodeData(animatedQRCodeData);
      }
    } catch (Err) {
      alert(loc._.invalid_animated_qr_code_fragment);
    }
  };

  const _combinePSBT = receivedPSBTBase64 => {
    const receivedPSBT = bitcoin.Psbt.fromBase64(receivedPSBTBase64);
    const newPsbt = psbt.combine(receivedPSBT);
    navigation.dangerouslyGetParent().pop();
    setPsbt(newPsbt);
    setIsModalVisible(false);
  };

  const onBarScanned = ret => {
    if (!ret.data) ret = { data: ret };
    if (ret.data.toUpperCase().startsWith('UR')) {
      return _onReadUniformResource(ret.data);
    } else if (ret.data.indexOf('+') === -1 && ret.data.indexOf('=') === -1 && ret.data.indexOf('=') === -1) {
      // this looks like NOT base64, so maybe its transaction's hex
      // we dont support it in this flow
    } else {
      // psbt base64?
      _combinePSBT(ret.data);
    }
  };

  const onConfirm = () => {
    try {
      psbt.finalizeAllInputs();
    } catch (_) {} // ignore if it is already finalized

    try {
      const tx = psbt.extractTransaction().toHex();
      const satoshiPerByte = Math.round(getFee() / (tx.length / 2));
      navigation.navigate('Confirm', {
        fee: new BigNumber(getFee()).dividedBy(100000000).toNumber(),
        memo: memo,
        fromWallet: wallet,
        tx,
        recipients: targets,
        satoshiPerByte,
      });
    } catch (error) {
      alert(error);
    }
  };

  const openScanner = () => {
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
                onBarScanned(result);
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
      navigation.navigate('ScanQRCodeRoot', {
        screen: 'ScanQRCode',
        params: {
          onBarScanned: onBarScanned,
          showFileImportButton: true,
        },
      });
    }
  };

  const exportPSBT = async () => {
    await fs.writeFileAndExport(fileName, psbt.toBase64());
  };

  const isConfirmEnabled = () => {
    return howManySignaturesWeHave() >= wallet.getM();
  };

  const renderDynamicQrCode = () => {
    return (
      <SafeBlueArea style={[styles.root, stylesHook.root]}>
        <ScrollView centerContent contentContainerStyle={styles.scrollViewContent}>
          <View style={[styles.modalContentShort, stylesHook.modalContentShort]}>
            <DynamicQRCode value={psbt.toHex()} capacity={666} />
            <BlueSpacing20 />
            <SquareButton
              style={[styles.exportButton, stylesHook.exportButton]}
              onPress={openScanner}
              title={loc.multisig.scan_or_import_file}
            />
            <BlueSpacing20 />
            <SquareButton style={[styles.exportButton, stylesHook.exportButton]} onPress={exportPSBT} title={loc.multisig.share} />
            <BlueSpacing20 />
            <BlueButtonLink title="Cancel" onPress={() => setIsModalVisible(false)} />
          </View>
        </ScrollView>
      </SafeBlueArea>
    );
  };

  if (isModalVisible) return renderDynamicQrCode();

  return (
    <SafeBlueArea style={[styles.root, stylesHook.root]}>
      <ScrollView centerContent contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.container}>
          <View style={styles.containerText}>
            <BlueText style={[styles.textBtc, stylesHook.textBtc]}>{totalBtc}</BlueText>
            <View style={styles.textBtcUnit}>
              <BlueText> BTC</BlueText>
            </View>
          </View>
          <View style={styles.containerText}>
            <BlueText style={[styles.textFiat, stylesHook.textFiat]}>{totalFiat}</BlueText>
          </View>
          <View style={styles.containerText}>
            <BlueText style={[styles.textDestination, stylesHook.textDestination]}>{destination}</BlueText>
          </View>

          <BlueCard>
            <FlatList data={new Array(wallet.getM())} renderItem={_renderItem} keyExtractor={(_item, index) => `${index}`} />
          </BlueCard>
        </View>

        <View style={styles.bottomWrapper}>
          <View style={styles.bottomFeesWrapper}>
            <BlueText style={[styles.feeFiatText, stylesHook.feeFiatText]}>
              {loc.formatString(loc.multisig.fee, { number: currency.satoshiToLocalCurrency(getFee()) })} -{' '}
            </BlueText>
            <BlueText>{loc.formatString(loc.multisig.fee_btc, { number: currency.satoshiToBTC(getFee()) })}</BlueText>
          </View>
          <BlueButton disabled={!isConfirmEnabled()} title={loc.multisig.confirm} onPress={onConfirm} />
        </View>
      </ScrollView>
    </SafeBlueArea>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  container: {
    flexDirection: 'column',
    justifyContent: 'center',
    paddingTop: 24,
  },
  containerText: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  textFiat: {
    fontSize: 16,
    fontWeight: '500',
  },
  textBtc: {
    fontWeight: 'bold',
    fontSize: 30,
  },
  textDestination: {
    paddingTop: 10,
    paddingBottom: 40,
  },
  bottomModal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  modalContentShort: {
    marginLeft: 20,
    marginRight: 20,
  },
  copyToClipboard: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportButton: {
    height: 48,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  provideSignatureButton: {
    marginTop: 24,
    height: 48,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  provideSignatureButtonText: { fontWeight: '600', fontSize: 15 },
  vaultKeyText: { fontSize: 18, fontWeight: 'bold' },
  vaultKeyTextWrapper: { justifyContent: 'center', alignItems: 'center', paddingLeft: 16 },
  vaultKeyCircle: {
    width: 42,
    height: 42,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemUnsignedWrapper: { flexDirection: 'row', paddingTop: 10 },
  vaultKeyTextSigned: { fontSize: 18, fontWeight: 'bold', color: '#37C0A1' },
  vaultKeyTextSignedWrapper: { justifyContent: 'center', alignItems: 'center', paddingLeft: 15 },
  flexDirectionRow: { flexDirection: 'row' },
  textBtcUnit: { justifyContent: 'flex-end', bottom: 5 },
  bottomFeesWrapper: { flexDirection: 'row', paddingBottom: 20 },
  bottomWrapper: { justifyContent: 'center', alignItems: 'center', paddingBottom: 20 },
});

PsbtMultisig.navigationOptions = () => ({
  ...BlueNavigationStyle(null, false),
  title: loc.multisig.header,
});

export default PsbtMultisig;
