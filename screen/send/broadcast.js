import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, KeyboardAvoidingView, Platform } from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { HDSegwitBech32Wallet } from '../../class/hd-segwit-bech32-wallet';
import {
  SafeBlueArea,
  BlueCard,
  BlueButton,
  BlueFormInput,
  BlueSpacing10,
  BlueLoading,
  BlueTextCentered,
  BlueFormLabel,
} from '../../BlueComponents';
import BlueElectrum from '../../BlueElectrum';

const BROADCAST_RESULT = {
  none: 'none',
  pending: 'pending',
  success: 'success',
  error: 'error',
};

export default function Broadcast() {
  const [tx, setTx] = useState('');
  const [broadcastResult, setBroadcastResult] = useState(BROADCAST_RESULT.none);
  const inputRef = useRef();
  const handleUpdateTx = nextValue => setTx(nextValue);
  const handleBroadcast = async () => {
    setBroadcastResult(BROADCAST_RESULT.pending);
    try {
      await BlueElectrum.ping();
      await BlueElectrum.waitTillConnected();
      const walletObj = new HDSegwitBech32Wallet();
      const result = await walletObj.broadcastTx(tx);
      console.log('broadcast result = ', result);
      setBroadcastResult(result);
    } catch (error) {
      ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
      console.log('broadcast error = ', error);
      setBroadcastResult(broadcastResult.error);
    }
  };

  useEffect(() => {
    inputRef.current.focus();
  });

  return (
    <SafeBlueArea style={styles.blueArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'position' : null}>
        <View style={styles.wrapper}>
          <BlueCard>
            <BlueFormLabel>Add transaction hash</BlueFormLabel>
            <BlueFormInput textInputRef={inputRef} multiline numberOfLines={8} value={tx} onChangeText={handleUpdateTx} />
            <BlueSpacing10 />
            <BlueButton title="BROADCAST" onPress={handleBroadcast} />
          </BlueCard>
          <BroadcastResult result={broadcastResult} />
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
});

function BroadcastResult({ result }) {
  switch (result) {
    case BROADCAST_RESULT.pending: {
      return <BlueLoading />;
    }
    case BROADCAST_RESULT.success: {
      return <BlueTextCentered>Success!</BlueTextCentered>;
    }
    case BROADCAST_RESULT.error: {
      return <BlueTextCentered>Error!</BlueTextCentered>;
    }
    case BROADCAST_RESULT.none:
    default:
      return null;
  }
}

BroadcastResult.propTypes = {
  result: PropTypes.oneOf(BROADCAST_RESULT),
};
