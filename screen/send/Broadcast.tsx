import React, { useState, useEffect, useCallback } from 'react';
import { useRoute, RouteProp } from '@react-navigation/native';
import * as bitcoin from 'bitcoinjs-lib';
import { ActivityIndicator, Keyboard, Linking, StyleSheet, TextInput, View } from 'react-native';

import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import {
  BlueBigCheckmark,
  BlueButtonLink,
  BlueCard,
  BlueFormLabel,
  BlueSpacing10,
  BlueSpacing20,
  BlueTextCentered,
} from '../../BlueComponents';
import { HDSegwitBech32Wallet } from '../../class';
import presentAlert from '../../components/Alert';
import Button from '../../components/Button';
import SafeArea from '../../components/SafeArea';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import { useSettings } from '../../hooks/context/useSettings';
import { majorTomToGroundControl } from '../../blue_modules/notifications';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

const BROADCAST_RESULT = Object.freeze({
  none: 'Input transaction hex',
  pending: 'pending',
  success: 'success',
  error: 'error',
});

type RouteProps = RouteProp<DetailViewStackParamList, 'Broadcast'>;
type NavigationProps = NativeStackNavigationProp<DetailViewStackParamList, 'Broadcast'>;

const Broadcast: React.FC = () => {
  const { params } = useRoute<RouteProps>();
  const [tx, setTx] = useState<string | undefined>();
  const [txHex, setTxHex] = useState<string | undefined>();
  const { colors } = useTheme();
  const [broadcastResult, setBroadcastResult] = useState<string>(BROADCAST_RESULT.none);
  const { selectedBlockExplorer } = useSettings();
  const { setParams, navigate } = useExtendedNavigation<NavigationProps>();

  const stylesHooks = StyleSheet.create({
    input: {
      borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
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

  useEffect(() => {
    const scannedData = params?.onBarScanned;
    if (scannedData) {
      handleScannedData(scannedData);
      setParams({ onBarScanned: undefined });
    }
  }, [handleScannedData, params?.onBarScanned, setParams]);

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

  const handleQRScan = () => {
    navigate('ScanQRCode', {
      showFileImportButton: true,
    });
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
    <SafeArea>
      <View style={styles.wrapper} testID="BroadcastView">
        {BROADCAST_RESULT.success !== broadcastResult && (
          <BlueCard style={styles.mainCard}>
            <View style={styles.topFormRow}>
              <BlueFormLabel>{status}</BlueFormLabel>
              {BROADCAST_RESULT.pending === broadcastResult && <ActivityIndicator size="small" />}
            </View>

            <View style={[styles.input, stylesHooks.input]}>
              <TextInput
                style={styles.text}
                multiline
                editable
                placeholderTextColor="#81868e"
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
          </BlueCard>
        )}
        {BROADCAST_RESULT.success === broadcastResult && tx && <SuccessScreen tx={tx} url={`${selectedBlockExplorer.url}/tx/${tx}`} />}
      </View>
    </SafeArea>
  );
};

const SuccessScreen: React.FC<{ tx: string; url: string }> = ({ tx, url }) => {
  if (!tx) {
    return null;
  }

  return (
    <View style={styles.wrapper}>
      <BlueCard>
        <View style={styles.broadcastResultWrapper}>
          <BlueBigCheckmark />
          <BlueSpacing20 />
          <BlueTextCentered>{loc.settings.success_transaction_broadcasted}</BlueTextCentered>
          <BlueSpacing10 />
          <BlueButtonLink title={loc.settings.open_link_in_explorer} onPress={() => Linking.openURL(url)} />
        </View>
      </BlueCard>
    </View>
  );
};

export default Broadcast;

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  broadcastResultWrapper: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    width: '100%',
  },
  mainCard: {
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  topFormRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    paddingTop: 0,
    paddingRight: 100,
  },
  input: {
    flexDirection: 'row',
    borderWidth: 1,
    borderBottomWidth: 0.5,
    alignItems: 'center',
    borderRadius: 4,
  },
  text: {
    padding: 8,
    color: '#81868e',
    maxHeight: 100,
    minHeight: 100,
    maxWidth: '100%',
    minWidth: '100%',
  },
});
