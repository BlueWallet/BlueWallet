import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from 'react-native-screens/lib/typescript/native-stack';
import { BlueCopyTextToClipboard } from '../../BlueComponents';
import QRCodeComponent from '../../components/QRCodeComponent';

type PaymentCodeStackParamList = {
  PaymentCode: { paymentCode: string };
};

export default function PaymentCode({ route }: NativeStackScreenProps<PaymentCodeStackParamList, 'PaymentCode'>) {
  const { paymentCode } = route.params;

  return (
    <View style={styles.container}>
      {!paymentCode && <Text>Payment code not found</Text>}
      {paymentCode && (
        <>
          <QRCodeComponent value={paymentCode} />
          <BlueCopyTextToClipboard text={paymentCode} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
