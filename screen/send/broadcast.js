import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { ActivityIndicator, Linking, StyleSheet, View, KeyboardAvoidingView, Platform, Text, TextInput } from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { HDSegwitBech32Wallet } from '../../class';
import {
  SafeBlueArea,
  BlueCard,
  BlueButton,
  BlueSpacing10,
  BlueSpacing20,
  BlueFormLabel,
  BlueTextCentered,
  BlueBigCheckmark,
} from '../../BlueComponents';
import BlueElectrum from '../../BlueElectrum';
const bitcoin = require('bitcoinjs-lib');

const BROADCAST_RESULT = Object.freeze({
  none: 'Input transaction hash',
  pending: 'pending',
  success: 'success',
  error: 'error',
});

export default function Broadcast() {
  const [tx, setTx] = useState('');
  const [txHex, setTxHex] = useState('');
  const [broadcastResult, setBroadcastResult] = useState(BROADCAST_RESULT.none);
  const handleUpdateTxHex = nextValue => setTxHex(nextValue.trim());
  const handleBroadcast = async () => {
    setBroadcastResult(BROADCAST_RESULT.pending);
    try {
      await BlueElectrum.ping();
      await BlueElectrum.waitTillConnected();
      const walletObj = new HDSegwitBech32Wallet();
      const result = await walletObj.broadcastTx(txHex);
      if (result) {
        let tx = bitcoin.Transaction.fromHex(txHex);
        const txid = tx.getId();
        setTx(txid);
        setBroadcastResult(BROADCAST_RESULT.success);
      } else {
        setBroadcastResult(BROADCAST_RESULT.error);
      }
    } catch (error) {
      ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
      setBroadcastResult(BROADCAST_RESULT.error);
    }
  };

  return (
    <SafeBlueArea style={styles.blueArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'position' : null} keyboardShouldPersistTaps="handled">
        <View style={styles.wrapper}>
          {BROADCAST_RESULT.success !== broadcastResult && (
            <BlueCard style={styles.mainCard}>
              <View style={styles.topFormRow}>
                <BlueFormLabel>{broadcastResult}</BlueFormLabel>
                {BROADCAST_RESULT.pending === broadcastResult && <ActivityIndicator size="small" />}
              </View>
              <TextInput
                style={{
                  flex: 1,
                  borderColor: '#ebebeb',
                  backgroundColor: '#d2f8d6',
                  borderRadius: 4,
                  marginTop: 20,
                  color: '#37c0a1',
                  fontWeight: '500',
                  fontSize: 14,
                  paddingHorizontal: 16,
                  paddingBottom: 16,
                  paddingTop: 16,
                }}
                maxHeight={100}
                minHeight={100}
                maxWidth={'100%'}
                minWidth={'100%'}
                multiline
                editable
                value={txHex}
                onChangeText={handleUpdateTxHex}
              />

              <BlueSpacing10 />
              <BlueButton title="BROADCAST" onPress={handleBroadcast} disabled={broadcastResult === BROADCAST_RESULT.pending} />
            </BlueCard>
          )}
          {BROADCAST_RESULT.success === broadcastResult && <SuccessScreen tx={tx} />}
        </View>
      </KeyboardAvoidingView>
    </SafeBlueArea>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  blueArea: {
    flex: 1,
    paddingTop: 19,
  },
  broadcastResultWrapper: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    width: '100%',
  },
  link: {
    color: 'blue',
  },
  mainCard: {
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  topFormRow: {
    flex: 0.1,
    flexBasis: 0.1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    paddingTop: 0,
    paddingRight: 100,
    height: 30,
    maxHeight: 30,
  },
});

function SuccessScreen({ tx }) {
  if (!tx) {
    return null;
  }
  return (
    <View style={styles.wrapper}>
      <BlueCard>
        <View style={styles.broadcastResultWrapper}>
          <BlueBigCheckmark />
          <BlueSpacing20 />
          <BlueTextCentered>Success! You transaction has been broadcasted!</BlueTextCentered>
          <BlueSpacing10 />
          <Text style={styles.link} onPress={() => Linking.openURL(`https://blockstream.info/tx/${tx}`)}>
            Open link in explorer
          </Text>
        </View>
      </BlueCard>
    </View>
  );
}

SuccessScreen.propTypes = {
  tx: PropTypes.string.isRequired,
};
