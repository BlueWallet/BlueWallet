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
import { BitcoinUnit } from '../../models/bitcoinUnits';

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
  const [flatListHeight, setFlatListHeight] = useState(0);

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
      color: colors.buttonAlternativeTextColor,
    },
    textDestinationFirstFour: {
      color: colors.buttonAlternativeTextColor,
    },
    textBtcUnitValue: {
      color: colors.buttonAlternativeTextColor,
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
    vaultKeyCircleSuccess: {
      backgroundColor: colors.msSuccessBG,
    },
    vaultKeyTextSigned: {
      color: colors.msSuccessBG,
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
        <View style={[styles.vaultKeyCircleSuccess, stylesHook.vaultKeyCircleSuccess]}>
          <Icon size={24} name="check" type="ionicons" color={colors.msSuccessCheck} />
        </View>
        <View style={styles.vaultKeyTextSignedWrapper}>
          <Text style={[styles.vaultKeyTextSigned, stylesHook.vaultKeyTextSigned]}>
            {loc.formatString(loc.multisig.vault_key, { number: el.index + 1 })}
          </Text>
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
    try {
      const newPsbt = psbt.combine(receivedPSBT);
      navigation.dangerouslyGetParent().pop();
      setPsbt(newPsbt);
      setIsModalVisible(false);
    } catch (error) {
      alert(error);
    }
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
            <BlueButtonLink title={loc._.cancel} onPress={() => setIsModalVisible(false)} />
          </View>
        </ScrollView>
      </SafeBlueArea>
    );
  };

  const destinationAddress = () => {
    // eslint-disable-next-line prefer-const
    let destinationAddressView = [];
    const destinations = Object.entries(destination.split(','));
    for (const [index, address] of destinations) {
      if (index > 1) {
        destinationAddressView.push(
          <View style={styles.destionationTextContainer} key={`end-${index}`}>
            <Text style={[styles.textDestinationFirstFour, stylesHook.textFiat]}>and {destinations.length - 2} more...</Text>
          </View>,
        );
        break;
      } else {
        const currentAddress = address.replace(/\s/g, '');
        const firstFour = currentAddress.substring(0, 5);
        const lastFour = currentAddress.substring(currentAddress.length - 5, currentAddress.length);
        const middle = currentAddress.split(firstFour)[1].split(lastFour)[0];
        destinationAddressView.push(
          <View style={styles.destionationTextContainer} key={`${currentAddress}-${index}`}>
            <Text style={[styles.textDestinationFirstFour, stylesHook.textBtc]}>{firstFour}</Text>
            <View style={styles.textDestinationSpacingRight} />
            <Text style={[styles.textDestinationFirstFour, stylesHook.textFiat]}>{middle}</Text>
            <View style={styles.textDestinationSpacingLeft} />
            <Text style={[styles.textDestinationFirstFour, stylesHook.textBtc]}>{lastFour}</Text>
          </View>,
        );
      }
    }
    return destinationAddressView;
  };

  const header = (
    <View style={stylesHook.root}>
      <View style={styles.containerText}>
        <BlueText style={[styles.textBtc, stylesHook.textBtc]}>{totalBtc}</BlueText>
        <View style={styles.textBtcUnit}>
          <BlueText style={[styles.textBtcUnitValue, stylesHook.textBtcUnitValue]}> {BitcoinUnit.BTC}</BlueText>
        </View>
      </View>
      <View style={styles.containerText}>
        <BlueText style={[styles.textFiat, stylesHook.textFiat]}>{totalFiat}</BlueText>
      </View>
      <View>{destinationAddress()}</View>
    </View>
  );
  const footer = (
    <View style={styles.bottomWrapper}>
      <View style={styles.bottomFeesWrapper}>
        <BlueText style={[styles.feeFiatText, stylesHook.feeFiatText]}>
          {loc.formatString(loc.multisig.fee, { number: currency.satoshiToLocalCurrency(getFee()) })} -{' '}
        </BlueText>
        <BlueText>{loc.formatString(loc.multisig.fee_btc, { number: currency.satoshiToBTC(getFee()) })}</BlueText>
      </View>
      <BlueButton disabled={!isConfirmEnabled()} title={loc.multisig.confirm} onPress={onConfirm} />
    </View>
  );

  if (isModalVisible) return renderDynamicQrCode();

  const onLayout = e => {
    setFlatListHeight(e.nativeEvent.layout.height);
  };

  const data = new Array(wallet.getM());
  return (
    <SafeBlueArea style={[styles.root, stylesHook.root]}>
      <View style={styles.container}>
        <View style={styles.mstopcontainer}>
          <View style={styles.mscontainer}>
            <View style={[styles.msleft, { height: flatListHeight - 200 }]} />
          </View>
          <View style={styles.msright}>
            <BlueCard>
              <FlatList
                data={data}
                onLayout={onLayout}
                renderItem={_renderItem}
                keyExtractor={(_item, index) => `${index}`}
                ListHeaderComponent={header}
                scrollEnabled={false}
              />
            </BlueCard>
          </View>
        </View>
        {footer}
      </View>
    </SafeBlueArea>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  mstopcontainer: {
    flex: 1,
    flexDirection: 'row',
  },
  mscontainer: {
    flex: 10,
  },
  msleft: {
    width: 1,
    borderStyle: 'dashed',
    borderWidth: 0.8,
    borderColor: '#c4c4c4',
    marginLeft: 40,
    marginTop: 185,
  },
  msright: {
    flex: 90,
    marginLeft: '-11%',
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  container: {
    flexDirection: 'column',
    paddingTop: 24,
    flex: 1,
  },
  containerText: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  destionationTextContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 4,
  },
  textFiat: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 30,
  },
  textBtc: {
    fontWeight: 'bold',
    fontSize: 30,
  },
  textDestinationFirstFour: {
    fontWeight: 'bold',
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
    marginLeft: 40,
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
  vaultKeyCircleSuccess: {
    width: 42,
    height: 42,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemUnsignedWrapper: { flexDirection: 'row', paddingTop: 16 },
  textDestinationSpacingRight: { marginRight: 4 },
  textDestinationSpacingLeft: { marginLeft: 4 },
  vaultKeyTextSigned: { fontSize: 18, fontWeight: 'bold' },
  vaultKeyTextSignedWrapper: { justifyContent: 'center', alignItems: 'center', paddingLeft: 16 },
  flexDirectionRow: { flexDirection: 'row', paddingVertical: 12 },
  textBtcUnit: { justifyContent: 'flex-end', bottom: 8 },
  bottomFeesWrapper: { flexDirection: 'row', paddingBottom: 20 },
  bottomWrapper: { justifyContent: 'center', alignItems: 'center', paddingVertical: 20 },
});

PsbtMultisig.navigationOptions = () => ({
  ...BlueNavigationStyle(null, false),
  title: loc.multisig.header,
});

export default PsbtMultisig;
