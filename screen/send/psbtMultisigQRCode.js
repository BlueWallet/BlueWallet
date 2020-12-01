/* global alert */
import React, { useContext, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { BlueButtonLink, BlueNavigationStyle, BlueSpacing20, SafeBlueArea } from '../../BlueComponents';
import { DynamicQRCode } from '../../components/DynamicQRCode';
import { SquareButton } from '../../components/SquareButton';
import { getSystemName } from 'react-native-device-info';
import loc from '../../loc';
import ImagePicker from 'react-native-image-picker';
import ScanQRCode from './ScanQRCode';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import { BlueStorageContext } from '../../blue_modules/storage-context';
const bitcoin = require('bitcoinjs-lib');
const fs = require('../../blue_modules/fs');
const LocalQRCode = require('@remobile/react-native-qrcode-local-image');
const isDesktop = getSystemName() === 'Mac OS X';

const PsbtMultisigQRCode = () => {
  const { wallets } = useContext(BlueStorageContext);
  const { navigate, goBack } = useNavigation();
  const { colors } = useTheme();
  const { walletID, psbtBase64 } = useRoute().params;
  const [isLoading, setIsLoading] = useState(false);

  const psbt = bitcoin.Psbt.fromBase64(psbtBase64);
  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
    },
    modalContentShort: {
      backgroundColor: colors.elevated,
    },
    exportButton: {
      backgroundColor: colors.buttonDisabledBackgroundColor,
    },
  });
  /** @type MultisigHDWallet */
  const wallet = wallets.find(w => w.getID() === walletID);
  const fileName = `${Date.now()}.psbt`;

  const howManySignaturesWeHave = () => {
    return wallet.calculateHowManySignaturesWeHaveFromPsbt(psbt);
  };

  const _combinePSBT = receivedPSBTBase64 => {
    try {
      const receivedPSBT = bitcoin.Psbt.fromBase64(receivedPSBTBase64);
      const newPsbt = psbt.combine(receivedPSBT);
      navigate('PsbtMultisig', { receivedPSBTBase64: newPsbt });
    } catch (error) {
      alert(error);
    }
  };

  const onBarScanned = ret => {
    if (!ret.data) ret = { data: ret };
    if (ret.data.toUpperCase().startsWith('UR')) {
      alert('BC-UR not decoded. This should never happen');
    } else if (ret.data.indexOf('+') === -1 && ret.data.indexOf('=') === -1 && ret.data.indexOf('=') === -1) {
      // this looks like NOT base64, so maybe its transaction's hex
      // we dont support it in this flow
    } else {
      // psbt base64?
      _combinePSBT(ret.data);
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
      navigate('ScanQRCodeRoot', {
        screen: 'ScanQRCode',
        params: {
          onBarScanned: onBarScanned,
          showFileImportButton: true,
        },
      });
    }
  };

  const exportPSBT = () => {
    setIsLoading(true);
    setTimeout(() => fs.writeFileAndExport(fileName, psbt.toBase64()).finally(() => setIsLoading(false)), 10);
  };

  const isConfirmEnabled = () => {
    return howManySignaturesWeHave() >= wallet.getM();
  };

  return (
    <SafeBlueArea style={[styles.root, stylesHook.root]}>
      <ScrollView centerContent contentContainerStyle={styles.scrollViewContent}>
        <View style={[styles.modalContentShort, stylesHook.modalContentShort]}>
          <DynamicQRCode value={psbt.toHex()} capacity={666} />
          {!isConfirmEnabled() && (
            <>
              <BlueSpacing20 />
              <SquareButton
                testID="CosignedScanOrImportFile"
                style={[styles.exportButton, stylesHook.exportButton]}
                onPress={openScanner}
                title={loc.multisig.scan_or_import_file}
              />
            </>
          )}
          <BlueSpacing20 />
          {isLoading ? (
            <ActivityIndicator />
          ) : (
            <SquareButton style={[styles.exportButton, stylesHook.exportButton]} onPress={exportPSBT} title={loc.multisig.share} />
          )}
          <BlueSpacing20 />
          <BlueButtonLink title={loc._.cancel} onPress={goBack} />
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
});

PsbtMultisigQRCode.navigationOptions = () => ({
  ...BlueNavigationStyle(null, false),
  title: loc.multisig.header,
});

export default PsbtMultisigQRCode;
