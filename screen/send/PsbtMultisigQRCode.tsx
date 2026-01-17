import { RouteProp, StackActions, useIsFocused, useRoute } from '@react-navigation/native';
import * as bitcoin from 'bitcoinjs-lib';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View, TouchableOpacity } from 'react-native';
import presentAlert from '../../components/Alert';
import { DynamicQRCode } from '../../components/DynamicQRCode';
import SaveFileButton from '../../components/SaveFileButton';
import { SquareButton } from '../../components/SquareButton';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import TipBox from '../../components/TipBox';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { SendDetailsStackParamList } from '../../navigation/SendDetailsStackParamList';
import { BlueSpacing20 } from '../../components/BlueSpacing';

interface BarcodeScanResult {
  data?: string;
}

type RouteParams = RouteProp<SendDetailsStackParamList, 'PsbtMultisigQRCode'>;

const PsbtMultisigQRCode: React.FC = () => {
  const navigation = useExtendedNavigation();
  const { colors } = useTheme();
  const openScannerButton = useRef<React.ElementRef<typeof TouchableOpacity>>(null);
  const { params } = useRoute<RouteParams>();
  const { psbtBase64, isShowOpenScanner } = params;
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const dynamicQRCode = useRef<DynamicQRCode>(null);
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

  const onBarScanned = useCallback(
    (ret: BarcodeScanResult | any) => {
      const result = typeof ret === 'string' || ret instanceof String ? { data: ret } : ret;
      const data = result.data || '';

      if (data.toUpperCase().startsWith('UR')) {
        presentAlert({ message: 'BC-UR not decoded. This should never happen' });
      } else if (data.indexOf('+') === -1 && data.indexOf('=') === -1) {
        presentAlert({ message: loc.wallets.import_error });
        // this looks like NOT base64, so maybe its transaction's hex
        // we dont support it in this flow
      } else {
        // psbt base64?
        const popToAction = StackActions.popTo('PsbtMultisig', { receivedPSBTBase64: data, ...params }, { merge: true });
        navigation.dispatch(popToAction);
      }
    },
    [navigation, params],
  );

  useEffect(() => {
    const data = params.onBarScanned;
    if (data) {
      navigation.setParams({ onBarScanned: undefined });
      onBarScanned({ data });
    }
  }, [onBarScanned, params.onBarScanned, navigation]);

  const openScanner = () => {
    navigation.navigate('ScanQRCode', {
      showFileImportButton: true,
    });
  };

  const saveFileButtonBeforeOnPress = async (): Promise<void> => {
    dynamicQRCode.current?.stopAutoMove();
    setIsLoading(true);
  };

  const saveFileButtonAfterOnPress = () => {
    setIsLoading(false);
    dynamicQRCode.current?.startAutoMove();
  };

  return (
    <ScrollView
      centerContent
      testID="PsbtMultisigQRCodeScrollView"
      automaticallyAdjustContentInsets
      contentInsetAdjustmentBehavior="automatic"
      style={stylesHook.root}
      contentContainerStyle={[styles.scrollViewContent, stylesHook.root, styles.modalContentShort, stylesHook.modalContentShort]}
    >
      <TipBox
        number="1"
        title={loc.multisig.provide_signature}
        description={loc.multisig.provide_signature_details}
        additionalDescription={`${loc.multisig.provide_signature_details_bluewallet} ${loc.multisig.co_sign_transaction}`}
      />
      <DynamicQRCode value={psbt.toHex()} ref={dynamicQRCode} />
      {!isLoading && (
        <>
          <BlueSpacing20 />
          <View style={styles.divider} />
          <TipBox
            number="2"
            title={loc.multisig.provide_signature_next_steps}
            description={loc.multisig.provide_signature_next_steps_details}
          />
        </>
      )}
      {!isShowOpenScanner && (
        <>
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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollViewContent: {
    justifyContent: 'space-between',
  },
  modalContentShort: {
    paddingHorizontal: 20,
  },
  divider: {
    height: 0.5,
    backgroundColor: '#d2d2d2',
    marginVertical: 20,
  },
  exportButton: {
    height: 48,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
});

export default PsbtMultisigQRCode;
