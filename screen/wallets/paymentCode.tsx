import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from 'react-native-screens/lib/typescript/native-stack';
import QRCodeComponent from '../../components/QRCodeComponent';

type PaymentCodeStackParamList = {
  PaymentCode: { paymentCode: string };
};

export default function PaymentCode({ route }: NativeStackScreenProps<PaymentCodeStackParamList, 'PaymentCode'>) {
  const { paymentCode } = route.params;

  return (
    <View style={styles.container}>
      <QRCodeComponent value={paymentCode} />
      <Text style={styles.paymentCodeText}>{paymentCode}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentCodeText: {
    fontSize: 16,
    marginTop: 20,
    marginHorizontal: 40,
  },
});
