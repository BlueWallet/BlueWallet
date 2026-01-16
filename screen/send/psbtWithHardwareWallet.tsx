import Clipboard from '@react-native-clipboard/clipboard';
import { RouteProp, StackActions, useIsFocused, useRoute } from '@react-navigation/native';
import * as bitcoin from 'bitcoinjs-lib';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { BlueCard, BlueText } from '../../BlueComponents';
import presentAlert from '../../components/Alert';
import CopyToClipboardButton from '../../components/CopyToClipboardButton';
import { DynamicQRCode } from '../../components/DynamicQRCode';
import SaveFileButton from '../../components/SaveFileButton';
import { SecondButton } from '../../components/SecondButton';
import { useTheme } from '../../components/themes';
import { useBiometrics, unlockWithBiometrics } from '../../hooks/useBiometrics';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { useSettings } from '../../hooks/context/useSettings';
import { majorTomToGroundControl } from '../../blue_modules/notifications';
import { openSignedTransactionRaw } from '../../blue_modules/fs';
import { BlueSpacing20 } from '../../components/BlueSpacing';
import { SendDetailsStackParamList } from '../../navigation/SendDetailsStackParamList';
import { WatchOnlyWallet } from '../../class';

const PsbtWithHardwareWallet = () => {
  const { txMetadata, fetchAndSaveWalletTransactions, wallets } = useStorage();
  const { isElectrumDisabled } = useSettings();
  const { isBiometricUseCapableAndEnabled } = useBiometrics();
  const navigation = useExtendedNavigation();
  const route = useRoute<RouteProp<SendDetailsStackParamList, 'PsbtWithHardwareWallet'>>();
  const { walletID, memo, psbt, deepLinkPSBT, launchedBy } = route.params;
  const wallet = wallets.find(w => w.getID() === walletID) as WatchOnlyWallet;
  const routeParamsPSBT = useRef(route.params.psbt);
  const routeParamsTXHex = route.params.txhex;
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [txHex, setTxHex] = useState<string | undefined>(route.params.txhex);
  const openScannerButton = useRef<View | null>(null);
  const dynamicQRCode = useRef<DynamicQRCode | null>(null);
  const isFocused = useIsFocused();

  const stylesHook = StyleSheet.create({
    scrollViewContent: {
      backgroundColor: colors.elevated,
    },
    rootPadding: {
      backgroundColor: colors.elevated,
    },
    hexWrap: {
      backgroundColor: colors.elevated,
    },
    hexLabel: {
      color: colors.foregroundColor,
    },
    hexInput: {
      borderColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
      color: colors.foregroundColor,
    },
    hexText: {
      color: colors.foregroundColor,
    },
  });

  const _combinePSBT = useCallback(
    (receivedPSBT: bitcoin.Psbt | string): bitcoin.Transaction | undefined => {
      if (!psbt) {
        throw new Error('No PSBT to combine');
      }
      return wallet.combinePsbt(psbt, receivedPSBT);
    },
    [psbt, wallet],
  );

  const onBarScanned = useCallback(
    (ret: string | { data: string }) => {
      const data = typeof ret === 'string' ? ret : ret.data;
      if (data.toUpperCase().startsWith('UR')) {
        presentAlert({ message: 'BC-UR not decoded. This should never happen' });
      }
      if (data.indexOf('+') === -1 && data.indexOf('=') === -1 && data.indexOf('=') === -1) {
        // this looks like NOT base64, so maybe its transaction's hex
        setTxHex(data);
        return;
      }
      try {
        const Tx = _combinePSBT(data);
        setTxHex(Tx?.toHex());
        if (launchedBy) {
          // we must navigate back to the screen who requested psbt (instead of broadcasting it ourselves)
          // most likely for LN channel opening
          const popToAction = StackActions.popTo(launchedBy, { psbt }, { merge: true });
          navigation.dispatch(popToAction);
          // ^^^ we just use `psbt` variable sinse it was finalized in the above _combinePSBT()
          // (passed by reference)
        }
      } catch (Err) {
        console.log('error in _combinePSBT():', Err);
        const message = Err instanceof Error ? Err.message : typeof Err === 'string' ? Err : 'Unknown error';
        presentAlert({ message });
      }
    },
    [_combinePSBT, launchedBy, navigation, psbt],
  );

  useEffect(() => {
    if (isFocused) {
      dynamicQRCode.current?.startAutoMove();
    } else {
      dynamicQRCode.current?.stopAutoMove();
    }
  }, [isFocused]);

  useEffect(() => {
    if (!psbt && !route.params.txhex) {
      presentAlert({ message: loc.send.no_tx_signing_in_progress });
    }

    if (deepLinkPSBT) {
      const newPsbt = bitcoin.Psbt.fromBase64(deepLinkPSBT);
      try {
        if (routeParamsPSBT.current) {
          const Tx = wallet.combinePsbt(routeParamsPSBT.current, newPsbt);
          setTxHex(Tx.toHex());
        }
      } catch (Err) {
        console.log('error in wallet.combinePsbt():', Err);
        const message = Err instanceof Error ? Err.message : typeof Err === 'string' ? Err : 'Unknown error';
        presentAlert({ message });
      }
    } else if (routeParamsTXHex) {
      setTxHex(routeParamsTXHex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkPSBT, routeParamsTXHex]);

  const broadcast = async () => {
    setIsLoading(true);
    const isBiometricsEnabled = await isBiometricUseCapableAndEnabled();

    if (isBiometricsEnabled) {
      if (!(await unlockWithBiometrics())) {
        setIsLoading(false);
        return;
      }
    }
    try {
      await BlueElectrum.ping();
      await BlueElectrum.waitTillConnected();

      if (!txHex) {
        setIsLoading(false);
        presentAlert({ message: 'No transaction hex available' });
        return;
      }

      const result = await wallet.broadcastTx(txHex);
      if (result) {
        setIsLoading(false);
        const txDecoded = bitcoin.Transaction.fromHex(txHex);
        const txid = txDecoded.getId();
        majorTomToGroundControl([], [], [txid]);
        if (memo) {
          txMetadata[txid] = { memo };
        }
        navigation.navigate('Success', { amount: undefined });
        await new Promise(resolve => setTimeout(resolve, 3000)); // sleep to make sure network propagates
        fetchAndSaveWalletTransactions(wallet.getID());
      } else {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        setIsLoading(false);
        presentAlert({ message: loc.errors.broadcast });
      }
    } catch (error) {
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
      setIsLoading(false);
      console.log('error broadcasting:', error);
      const message = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error';
      presentAlert({ message });
    }
  };

  const handleOnVerifyPressed = () => {
    Linking.openURL('https://coinb.in/?verify=' + txHex);
  };

  const copyHexToClipboard = () => {
    if (txHex) {
      Clipboard.setString(txHex);
    }
  };

  const _renderBroadcastHex = () => {
    return (
      <View style={[styles.rootPadding, stylesHook.rootPadding]}>
        <BlueCard style={[styles.hexWrap, stylesHook.hexWrap]}>
          <BlueText style={[styles.hexLabel, stylesHook.hexLabel]}>{loc.send.create_this_is_hex}</BlueText>
          <TextInput style={[styles.hexInput, stylesHook.hexInput]} multiline editable value={txHex} />

          <TouchableOpacity accessibilityRole="button" style={styles.hexTouch} onPress={copyHexToClipboard}>
            <Text style={[styles.hexText, stylesHook.hexText]}>{loc.send.create_copy}</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" style={styles.hexTouch} onPress={handleOnVerifyPressed}>
            <Text style={[styles.hexText, stylesHook.hexText]}>{loc.send.create_verify}</Text>
          </TouchableOpacity>
          <BlueSpacing20 />
          <SecondButton
            disabled={isElectrumDisabled}
            onPress={broadcast}
            title={loc.send.confirm_sendNow}
            testID="PsbtWithHardwareWalletBroadcastTransactionButton"
          />
        </BlueCard>
      </View>
    );
  };

  const saveFileButtonBeforeOnPress = () => {
    dynamicQRCode.current?.stopAutoMove();
  };

  const saveFileButtonAfterOnPress = () => {
    dynamicQRCode.current?.startAutoMove();
  };

  const onOpenSignedTransaction = async () => {
    const file = await openSignedTransactionRaw();
    file && onBarScanned({ data: file });
  };

  useEffect(() => {
    const data = route.params.onBarScanned;
    if (data) {
      onBarScanned({ data });
      navigation.setParams({ onBarScanned: undefined });
    }
  }, [navigation, onBarScanned, route.params.onBarScanned]);

  const openScanner = async () => {
    navigation.navigate('ScanQRCode', {
      showFileImportButton: true,
    });
  };

  if (txHex) return _renderBroadcastHex();

  const renderView = isLoading ? (
    <ActivityIndicator />
  ) : (
    <View style={styles.container}>
      <BlueCard>
        <BlueText testID="TextHelperForPSBT">{loc.send.psbt_this_is_psbt}</BlueText>
        <BlueSpacing20 />
        <Text testID="PSBTHex" style={styles.hidden}>
          {psbt?.toHex()}
        </Text>
        {psbt && <DynamicQRCode value={psbt.toHex()} ref={dynamicQRCode} walletID={walletID} />}
        <BlueSpacing20 />
        <SecondButton
          testID="PsbtTxScanButton"
          icon={{
            name: 'qrcode',
            type: 'font-awesome',
            color: colors.secondButtonTextColor,
          }}
          onPress={openScanner}
          ref={openScannerButton}
          title={loc.send.psbt_tx_scan}
        />
        <BlueSpacing20 />
        <SecondButton
          icon={{
            name: 'login',
            type: 'entypo',
            color: colors.secondButtonTextColor,
          }}
          onPress={onOpenSignedTransaction}
          title={loc.send.psbt_tx_open}
        />
        <BlueSpacing20 />
        {psbt && (
          <SaveFileButton
            fileName={`${Date.now()}.psbt`}
            fileContent={psbt.toBase64()}
            beforeOnPress={saveFileButtonBeforeOnPress}
            afterOnPress={saveFileButtonAfterOnPress}
          >
            <SecondButton
              icon={{
                name: 'share-alternative',
                type: 'entypo',
                color: colors.secondButtonTextColor,
              }}
              title={loc.send.psbt_tx_export}
            />
          </SaveFileButton>
        )}
        <BlueSpacing20 />
        {psbt && (
          <View style={styles.copyToClipboard}>
            <CopyToClipboardButton stringToCopy={typeof psbt === 'string' ? psbt : psbt.toBase64()} displayText={loc.send.psbt_clipboard} />
          </View>
        )}
      </BlueCard>
    </View>
  );

  return (
    <ScrollView
      centerContent
      style={stylesHook.scrollViewContent}
      automaticallyAdjustContentInsets
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[styles.scrollViewContent, stylesHook.scrollViewContent]}
      testID="PsbtWithHardwareScrollView"
    >
      {renderView}
    </ScrollView>
  );
};

export default PsbtWithHardwareWallet;

const styles = StyleSheet.create({
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
  rootPadding: {
    flex: 1,
    paddingTop: 20,
  },
  hexWrap: {
    alignItems: 'center',
    flex: 1,
  },
  hexLabel: {
    fontWeight: '500',
  },
  hexInput: {
    borderRadius: 4,
    marginTop: 20,
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
    fontSize: 15,
    fontWeight: '500',
    alignSelf: 'center',
  },
  copyToClipboard: {
    marginVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hidden: {
    width: 0,
    height: 0,
  },
});
