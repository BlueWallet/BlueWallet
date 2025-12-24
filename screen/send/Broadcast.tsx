import React, { useCallback, useState, useMemo } from 'react';
import * as bitcoin from 'bitcoinjs-lib';
import { ActivityIndicator, Keyboard, Linking, StyleSheet, TextInput, View, Text, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { BlueButtonLink } from '../../BlueComponents';
import { HDSegwitBech32Wallet } from '../../class';
import presentAlert from '../../components/Alert';
import Button from '../../components/Button';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { useTheme } from '../../components/themes';
import { usePlatformTheme } from '../../theme';
import loc from '../../loc';
import { useSettings } from '../../hooks/context/useSettings';
import { majorTomToGroundControl } from '../../blue_modules/notifications';
import { scanQrHelper } from '../../helpers/scan-qr';
import { BlueSpacing10, BlueSpacing20 } from '../../components/BlueSpacing';
import { BlueBigCheckmark } from '../../components/BlueBigCheckmark';

const BROADCAST_RESULT = Object.freeze({
  none: 'Input transaction hex',
  pending: 'pending',
  success: 'success',
  error: 'error',
});

const Broadcast: React.FC = () => {
  const [tx, setTx] = useState<string | undefined>();
  const [txHex, setTxHex] = useState<string | undefined>();
  const { colors } = useTheme();
  const { colors: platformColors, sizing, layout } = usePlatformTheme();
  const [broadcastResult, setBroadcastResult] = useState<string>(BROADCAST_RESULT.none);
  const { selectedBlockExplorer } = useSettings();
  const insets = useSafeAreaInsets();

  // Calculate header height for Android with transparent header
  const headerHeight = useMemo(() => {
    if (Platform.OS === 'android' && insets.top > 0) {
      return 56 + (StatusBar.currentHeight || insets.top);
    }
    return 0;
  }, [insets.top]);

  const localStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: platformColors.background,
    },
    contentContainer: {
      paddingHorizontal: sizing.basePadding,
      paddingTop: sizing.basePadding,
    },
    card: {
      backgroundColor: platformColors.cardBackground,
      borderRadius: sizing.containerBorderRadius,
      padding: sizing.basePadding,
      ...layout.cardShadow,
    },
    topFormRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 10,
      paddingTop: 0,
      marginBottom: 10,
    },
    labelText: {
      color: platformColors.titleColor,
      fontSize: sizing.subtitleFontSize,
      fontWeight: '500',
    },
    input: {
      flexDirection: 'row',
      borderWidth: 1,
      borderBottomWidth: 0.5,
      alignItems: 'center',
      borderRadius: 4,
      borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
    },
    text: {
      flex: 1,
      padding: 8,
      color: colors.foregroundColor,
      maxHeight: 100,
      minHeight: 100,
    },
  });

  const handleScannedData = useCallback((scannedData: string) => {
    if (scannedData.indexOf('+') === -1 && scannedData.indexOf('=') === -1 && scannedData.indexOf('=') === -1) {
      // this looks like NOT base64, so maybe its transaction's hex
      return handleUpdateTxHex(scannedData);
    }

    try {
      // should be base64 encoded PSBT
      const validTx = bitcoin.Psbt.fromBase64(scannedData).extractTransaction();
      return handleUpdateTxHex(validTx.toHex());
    } catch (e) {}
  }, []);

  const handleUpdateTxHex = (nextValue: string) => setTxHex(nextValue.trim());

  const handleBroadcast = async () => {
    Keyboard.dismiss();
    setBroadcastResult(BROADCAST_RESULT.pending);
    try {
      await BlueElectrum.ping();
      await BlueElectrum.waitTillConnected();
      const walletObj = new HDSegwitBech32Wallet();
      if (txHex) {
        const result = await walletObj.broadcastTx(txHex);
        if (result) {
          const newTx = bitcoin.Transaction.fromHex(txHex);
          const txid = newTx.getId();
          setTx(txid);

          setBroadcastResult(BROADCAST_RESULT.success);
          triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
          majorTomToGroundControl([], [], [txid]);
        } else {
          setBroadcastResult(BROADCAST_RESULT.error);
        }
      }
    } catch (error: any) {
      presentAlert({ title: loc.errors.error, message: error.message });
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
      setBroadcastResult(BROADCAST_RESULT.error);
    }
  };

  const handleQRScan = async () => {
    const scannedData = await scanQrHelper();
    if (scannedData) {
      handleScannedData(scannedData);
    }
  };

  let status;
  switch (broadcastResult) {
    case BROADCAST_RESULT.none:
      status = loc.send.broadcastNone;
      break;
    case BROADCAST_RESULT.pending:
      status = loc.send.broadcastPending;
      break;
    case BROADCAST_RESULT.success:
      status = loc.send.broadcastSuccess;
      break;
    case BROADCAST_RESULT.error:
      status = loc.send.broadcastError;
      break;
    default:
      status = broadcastResult;
  }

  return (
    <SafeAreaScrollView style={localStyles.container} contentContainerStyle={localStyles.contentContainer} testID="BroadcastView" headerHeight={headerHeight}>
      {BROADCAST_RESULT.success !== broadcastResult && (
        <View style={localStyles.card}>
          <View style={localStyles.topFormRow}>
            <Text style={localStyles.labelText}>{status}</Text>
            {BROADCAST_RESULT.pending === broadcastResult && <ActivityIndicator size="small" />}
          </View>

          <View style={localStyles.input}>
            <TextInput
              style={localStyles.text}
              multiline
              editable
              placeholderTextColor={colors.placeholderTextColor}
              value={txHex}
              onChangeText={handleUpdateTxHex}
              onSubmitEditing={Keyboard.dismiss}
              testID="TxHex"
            />
          </View>
          <BlueSpacing20 />

          <Button title={loc.multisig.scan_or_open_file} onPress={handleQRScan} />
          <BlueSpacing20 />

          <Button
            title={loc.send.broadcastButton}
            onPress={handleBroadcast}
            disabled={broadcastResult === BROADCAST_RESULT.pending || txHex?.length === 0 || txHex === undefined}
            testID="BroadcastButton"
          />
          <BlueSpacing20 />
        </View>
      )}
      {BROADCAST_RESULT.success === broadcastResult && tx && <SuccessScreen tx={tx} url={`${selectedBlockExplorer.url}/tx/${tx}`} />}
    </SafeAreaScrollView>
  );
};

const SuccessScreen: React.FC<{ tx: string; url: string }> = ({ tx, url }) => {
  const { colors: platformColors, sizing, layout } = usePlatformTheme();

  if (!tx) {
    return null;
  }

  const successStyles = StyleSheet.create({
    card: {
      backgroundColor: platformColors.cardBackground,
      borderRadius: sizing.containerBorderRadius,
      padding: sizing.basePadding,
      ...layout.cardShadow,
    },
    broadcastResultWrapper: {
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: sizing.basePadding,
    },
    successText: {
      color: platformColors.titleColor,
      fontSize: sizing.subtitleFontSize,
      textAlign: 'center',
    },
  });

  return (
    <View style={successStyles.card}>
      <View style={successStyles.broadcastResultWrapper}>
        <BlueBigCheckmark />
        <BlueSpacing20 />
        <Text style={successStyles.successText}>{loc.settings.success_transaction_broadcasted}</Text>
        <BlueSpacing10 />
        <BlueButtonLink title={loc.settings.open_link_in_explorer} onPress={() => Linking.openURL(url)} />
      </View>
    </View>
  );
};

export default Broadcast;
