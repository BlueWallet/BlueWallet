import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Linking, StyleSheet, Platform, TextInput, View, Keyboard } from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useRoute, useTheme, useNavigation } from '@react-navigation/native';
import * as bitcoin from 'bitcoinjs-lib';

import loc from '../../loc';
import { HDSegwitBech32Wallet } from '../../class';
import navigationStyle from '../../components/navigationStyle';
import {
  BlueBigCheckmark,
  BlueButton,
  BlueButtonLink,
  BlueCard,
  BlueFormLabel,
  BlueSpacing10,
  BlueSpacing20,
  BlueTextCentered,
  SafeBlueArea,
} from '../../BlueComponents';
import BlueElectrum from '../../blue_modules/BlueElectrum';
import Notifications from '../../blue_modules/notifications';

const scanqr = require('../../helpers/scan-qr');

const BROADCAST_RESULT = Object.freeze({
  none: 'Input transaction hex',
  pending: 'pending',
  success: 'success',
  error: 'error',
});

const Broadcast = () => {
  const { name } = useRoute();
  const { navigate } = useNavigation();
  const [tx, setTx] = useState();
  const [txHex, setTxHex] = useState();
  const { colors } = useTheme();
  const [broadcastResult, setBroadcastResult] = useState(BROADCAST_RESULT.none);

  const stylesHooks = StyleSheet.create({
    input: {
      borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
    },
  });

  const handleUpdateTxHex = nextValue => setTxHex(nextValue.trim());

  const handleBroadcast = async () => {
    Keyboard.dismiss();
    setBroadcastResult(BROADCAST_RESULT.pending);
    try {
      await BlueElectrum.ping();
      await BlueElectrum.waitTillConnected();
      const walletObj = new HDSegwitBech32Wallet();
      const result = await walletObj.broadcastTx(txHex);
      if (result) {
        const newTx = bitcoin.Transaction.fromHex(txHex);
        const txid = newTx.getId();
        setTx(txid);

        setBroadcastResult(BROADCAST_RESULT.success);
        ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });
        Notifications.majorTomToGroundControl([], [], [txid]);
      } else {
        setBroadcastResult(BROADCAST_RESULT.error);
      }
    } catch (error) {
      Alert.alert(loc.errors.error, error.message);
      ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
      setBroadcastResult(BROADCAST_RESULT.error);
    }
  };

  const handleQRScan = async () => {
    const scannedData = await scanqr(navigate, name);
    if (!scannedData) return;

    if (scannedData.indexOf('+') === -1 && scannedData.indexOf('=') === -1 && scannedData.indexOf('=') === -1) {
      // this looks like NOT base64, so maybe its transaction's hex
      return handleUpdateTxHex(scannedData);
    }

    try {
      // sould be base64 encoded PSBT
      const validTx = bitcoin.Psbt.fromBase64(scannedData).extractTransaction();
      return handleUpdateTxHex(validTx.toHex());
    } catch (e) {}
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
    <SafeBlueArea>
      <KeyboardAvoidingView
        enabled={!Platform.isPad}
        behavior={Platform.OS === 'ios' ? 'position' : null}
        keyboardShouldPersistTaps="handled"
      >
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
                  maxHeight={100}
                  minHeight={100}
                  maxWidth="100%"
                  minWidth="100%"
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

              <BlueButton title={loc.multisig.scan_or_open_file} onPress={handleQRScan} />
              <BlueSpacing20 />

              <BlueButton
                title={loc.send.broadcastButton}
                onPress={handleBroadcast}
                disabled={broadcastResult === BROADCAST_RESULT.pending || txHex?.length === 0 || txHex === undefined}
                testID="BroadcastButton"
              />
              <BlueSpacing20 />
            </BlueCard>
          )}
          {BROADCAST_RESULT.success === broadcastResult && <SuccessScreen tx={tx} />}
        </View>
      </KeyboardAvoidingView>
    </SafeBlueArea>
  );
};

export default Broadcast;
Broadcast.navigationOptions = navigationStyle({}, opts => ({ ...opts, title: loc.send.create_broadcast }));

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
    minHeight: 33,
    color: '#81868e',
  },
});

const SuccessScreen = ({ tx }) => {
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
          <BlueButtonLink title={loc.settings.open_link_in_explorer} onPress={() => Linking.openURL(`https://mempool.space/tx/${tx}`)} />
        </View>
      </BlueCard>
    </View>
  );
};

SuccessScreen.propTypes = {
  tx: PropTypes.string.isRequired,
};
