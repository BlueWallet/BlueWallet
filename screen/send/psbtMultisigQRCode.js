import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import * as bitcoin from 'bitcoinjs-lib';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { BlueSpacing20, BlueText } from '../../BlueComponents';
import presentAlert from '../../components/Alert';
import { DynamicQRCode } from '../../components/DynamicQRCode';
import SaveFileButton from '../../components/SaveFileButton';
import { SquareButton } from '../../components/SquareButton';
import { useTheme } from '../../components/themes';
import loc from '../../loc';

const PsbtMultisigQRCode = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const openScannerButton = useRef();
  const { params } = useRoute();
  const { psbtBase64, isShowOpenScanner } = params;
  const [isLoading, setIsLoading] = useState(false);
  const dynamicQRCode = useRef();
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
    tipBox: {
      backgroundColor: colors.ballOutgoingExpired,
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
    },
    tipHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    tipHeaderText: {
      marginLeft: 4,
      flex: 1,
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
    ret => {
      if (!ret.data) ret = { data: ret };
      if (ret.data.toUpperCase().startsWith('UR')) {
        presentAlert({ message: 'BC-UR not decoded. This should never happen' });
      } else if (ret.data.indexOf('+') === -1 && ret.data.indexOf('=') === -1 && ret.data.indexOf('=') === -1) {
        // this looks like NOT base64, so maybe its transaction's hex
        // we dont support it in this flow
        presentAlert({ message: loc.wallets.import_error });
      } else {
        // psbt base64?
        navigation.navigate({ name: 'PsbtMultisig', params: { receivedPSBTBase64: ret.data }, merge: true });
      }
    },
    [navigation],
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

  const saveFileButtonBeforeOnPress = () => {
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
      contentContainerStyle={[styles.scrollViewContent, stylesHook.root, styles.modalContentShort, stylesHook.modalContentShort]}
    >
      <View style={[styles.tipBox, stylesHook.tipBox]}>
        <View style={stylesHook.tipHeader}>
          <View style={styles.vaultKeyCircle}>
            <BlueText style={styles.vaultKeyText}>1</BlueText>
          </View>
          <BlueText bold style={stylesHook.tipHeaderText}>
            {loc.multisig.provide_signature}
          </BlueText>
        </View>
        <BlueSpacing20 />
        <BlueText>{loc.multisig.provide_signature_details}</BlueText>
        <BlueSpacing20 />
        <BlueText>
          {loc.multisig.provide_signature_details_bluewallet} <BlueText bold>{loc.multisig.co_sign_transaction}</BlueText>
        </BlueText>
      </View>
      <DynamicQRCode value={psbt.toHex()} ref={dynamicQRCode} />
      {!isLoading && (
        <>
          <BlueSpacing20 />
          <View style={styles.divider} />
          <View style={[styles.tipBox, stylesHook.tipBox]}>
            <View style={stylesHook.tipHeader}>
              <View style={styles.vaultKeyCircle}>
                <BlueText style={styles.vaultKeyText}>2</BlueText>
              </View>
              <BlueText bold style={stylesHook.tipHeaderText}>
                {loc.multisig.provide_signature_next_steps}
              </BlueText>
            </View>
            <BlueSpacing20 />
            <BlueText>{loc.multisig.provide_signature_next_steps_details}</BlueText>
          </View>
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
  tipBox: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  vaultKeyCircle: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vaultKeyText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default PsbtMultisigQRCode;
