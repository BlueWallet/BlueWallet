import React, { useCallback, useState } from 'react';
import * as bitcoin from 'bitcoinjs-lib';
import { ActivityIndicator, Keyboard, Linking, TextInput, View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { BlueBigCheckmark, BlueButtonLink } from '../../BlueComponents';
import { HDSegwitBech32Wallet } from '../../class';
import presentAlert from '../../components/Alert';
import Button from '../../components/Button';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { useSettingsStyles } from '../../hooks/useSettingsStyles';
import { usePlatformTheme } from '../../components/platformThemes';
import loc from '../../loc';
import { useSettings } from '../../hooks/context/useSettings';
import { majorTomToGroundControl } from '../../blue_modules/notifications';
import { scanQrHelper } from '../../helpers/scan-qr.ts';

const BROADCAST_RESULT = Object.freeze({
  none: 'Input transaction hex',
  pending: 'pending',
  success: 'success',
  error: 'error',
});

const Broadcast: React.FC = () => {
  const [tx, setTx] = useState<string | undefined>();
  const [txHex, setTxHex] = useState<string | undefined>();
  const { styles } = useSettingsStyles();
  const { colors } = usePlatformTheme();
  const [broadcastResult, setBroadcastResult] = useState<string>(BROADCAST_RESULT.none);
  const { selectedBlockExplorer } = useSettings();

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

  const clearTxHexInput = () => {
    setTxHex('');
    setBroadcastResult(BROADCAST_RESULT.none);
  };

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
    <SafeAreaScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      automaticallyAdjustContentInsets
      automaticallyAdjustKeyboardInsets
      contentInsetAdjustmentBehavior="automatic"
    >
      {BROADCAST_RESULT.success !== broadcastResult && (
        <View style={styles.isItMyAddressCard}>
          <View style={styles.topFormRow}>
            <Text style={styles.addressOwnershipText}>{status}</Text>
            {BROADCAST_RESULT.pending === broadcastResult && <ActivityIndicator size="small" />}
          </View>

          <View style={styles.textInputContainer}>
            <TextInput
              style={styles.textInput}
              multiline
              editable
              placeholderTextColor={colors.subtitleColor}
              value={txHex}
              onChangeText={handleUpdateTxHex}
              onSubmitEditing={Keyboard.dismiss}
              testID="TxHex"
            />
            {txHex && txHex.length > 0 && (
              <TouchableOpacity onPress={clearTxHexInput} style={styles.clearButton}>
                <Icon name="close" size={20} color={colors.subtitleColor} />
              </TouchableOpacity>
            )}
          </View>
          
          <BlueButtonLink title={loc.multisig.scan_or_open_file} onPress={handleQRScan} />
          <View style={styles.buttonSpacing} />
          
          <Button
            title={loc.send.broadcastButton}
            onPress={handleBroadcast}
            disabled={broadcastResult === BROADCAST_RESULT.pending || txHex?.length === 0 || txHex === undefined}
            testID="BroadcastButton"
          />
        </View>
      )}
      {BROADCAST_RESULT.success === broadcastResult && tx && <SuccessScreen tx={tx} url={`${selectedBlockExplorer.url}/tx/${tx}`} />}
    </SafeAreaScrollView>
  );
};

const SuccessScreen: React.FC<{ tx: string; url: string }> = ({ tx, url }) => {
  const { styles } = useSettingsStyles();

  if (!tx) {
    return null;
  }

  return (
    <View style={styles.isItMyAddressCard}>
      <BlueBigCheckmark />
      <View style={styles.spacingMedium} />
      <Text style={styles.addressOwnershipTextCentered}>{loc.settings.success_transaction_broadcasted}</Text>
      <View style={styles.buttonSpacingSmall} />
      <BlueButtonLink title={loc.settings.open_link_in_explorer} onPress={() => Linking.openURL(url)} />
    </View>
  );
};

export default Broadcast;
