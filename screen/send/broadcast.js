import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform } from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { HDSegwitBech32Wallet } from '../../class/hd-segwit-bech32-wallet';
import { SafeBlueArea, BlueCard, BlueButton, BlueFormInput, BlueSpacing10, BlueFormLabel } from '../../BlueComponents';
import BlueElectrum from '../../BlueElectrum';

const BROADCAST_RESULT = {
  none: 'Input transaction hash',
  pending: 'pending',
  success: 'success',
  error: 'error',
};

export default function Broadcast() {
  const [tx, setTx] = useState('');
  const [broadcastResult, setBroadcastResult] = useState(BROADCAST_RESULT.none);
  const inputRef = useRef();
  const handleUpdateTx = nextValue => setTx(nextValue.trim());
  const handleBroadcast = async () => {
    setBroadcastResult(BROADCAST_RESULT.pending);
    try {
      await BlueElectrum.ping();
      await BlueElectrum.waitTillConnected();
      const walletObj = new HDSegwitBech32Wallet();
      const result = await walletObj.broadcastTx(tx);
      setBroadcastResult(result ? BROADCAST_RESULT.success : BROADCAST_RESULT.error);
    } catch (error) {
      ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
      setBroadcastResult(BROADCAST_RESULT.error);
    }
  };

  useEffect(() => {
    inputRef.current.focus();
  }, []);

  return (
    <SafeBlueArea style={styles.blueArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'position' : null} keyboardShouldPersistTaps="handled">
        <View style={styles.wrapper}>
          <BlueCard>
            <BlueFormLabel>{broadcastResult}</BlueFormLabel>
            <BlueFormInput textInputRef={inputRef} multiline numberOfLines={8} value={tx} onChangeText={handleUpdateTx} />
            <BlueSpacing10 />
            <BlueButton title="BROADCAST" onPress={handleBroadcast} />
          </BlueCard>
        </View>
      </KeyboardAvoidingView>
    </SafeBlueArea>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  blueArea: {
    flex: 1,
    paddingTop: 19,
  },
  broadcastResultWrapper: {
    flex: 1,
    height: 30,
    width: 300,
  },
});
