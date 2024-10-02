import { RouteProp, useIsFocused, useRoute } from '@react-navigation/native';
import * as bitcoin from 'bitcoinjs-lib';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { BlueSpacing20 } from '../../BlueComponents';
import presentAlert from '../../components/Alert';
import { DynamicQRCode, DynamicQRCodeRef } from '../../components/DynamicQRCode';
import SafeArea from '../../components/SafeArea';
import SaveFileButton from '../../components/SaveFileButton';
import { SquareButton } from '../../components/SquareButton';
import { useTheme } from '../../components/themes';
import { scanQrHelper } from '../../helpers/scan-qr';
import loc from '../../loc';
import { SendDetailsStackParamList } from '../../navigation/SendDetailsStackParamList';
import { navigationRef } from '../../NavigationService';

type RouteProps = RouteProp<SendDetailsStackParamList, 'PSBTMultisigQRCode'>;

const PSBTMultisigQRCode = () => {
  const { colors } = useTheme();
  const openScannerButton = useRef(null);
  const { psbtBase64, isShowOpenScanner } = useRoute<RouteProps>().params;
  const { name } = useRoute<RouteProps>();
  const [isLoading, setIsLoading] = useState(false);
  const dynamicQRCode = useRef<DynamicQRCodeRef>(null);
  const isFocused = useIsFocused();

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
  const fileName = `${Date.now()}.psbt`;

  useEffect(() => {
    if (isFocused) {
      dynamicQRCode.current?.startAutoMove();
    } else {
      dynamicQRCode.current?.stopAutoMove();
    }
  }, [isFocused]);

  const onBarScanned = (ret: { data: any }) => {
    if (!ret.data) ret = { data: ret };
    if (ret.data.toUpperCase().startsWith('UR')) {
      presentAlert({ message: 'BC-UR not decoded. This should never happen' });
    } else if (ret.data.indexOf('+') === -1 && ret.data.indexOf('=') === -1 && ret.data.indexOf('=') === -1) {
      // this looks like NOT base64, so maybe its transaction's hex
      // we dont support it in this flow
      presentAlert({ message: loc.wallets.import_error });
    } else {
      // psbt base64?
      navigationRef.navigate('PsbtMultisig', {
        screen: 'PsbtMultisig',
        params: {
          psbtBase64: ret.data,
          merge: true,
        },
      });
    }
  };

  const openScanner = async () => {
    const scanned = await scanQrHelper(name, true);
    onBarScanned({ data: scanned });
  };

  const saveFileButtonBeforeOnPress = () => {
    dynamicQRCode.current?.stopAutoMove();
    setIsLoading(true);
    return Promise.resolve();
  };

  const saveFileButtonAfterOnPress = () => {
    setIsLoading(false);
    dynamicQRCode.current?.startAutoMove();
  };

  return (
    <SafeArea style={stylesHook.root}>
      <ScrollView centerContent contentContainerStyle={styles.scrollViewContent}>
        <View style={[styles.modalContentShort, stylesHook.modalContentShort]}>
          <DynamicQRCode value={psbt.toHex()} ref={dynamicQRCode} />
          {!isShowOpenScanner && (
            <>
              <BlueSpacing20 />
              <SquareButton
                testID="CosignedScanOrImportFile"
                style={[styles.exportButton, stylesHook.exportButton]}
                onPress={openScanner}
                ref={openScannerButton}
                title={loc.multisig.scan_or_import_file}
              />
            </>
          )}
          <BlueSpacing20 />
          {isLoading ? (
            <ActivityIndicator />
          ) : (
            <SaveFileButton
              fileName={fileName}
              fileContent={psbt.toBase64()}
              beforeOnPress={saveFileButtonBeforeOnPress}
              afterOnPress={saveFileButtonAfterOnPress}
              style={[styles.exportButton, stylesHook.exportButton]}
            >
              <SquareButton title={loc.multisig.share} />
            </SaveFileButton>
          )}
        </View>
      </ScrollView>
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  modalContentShort: {
    marginLeft: 20,
    marginRight: 20,
  },
  exportButton: {
    height: 48,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
});

export default PSBTMultisigQRCode;
