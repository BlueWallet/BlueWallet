import { useRoute } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import CopyTextToClipboard from '../../components/CopyTextToClipboard';
import QRCodeComponent from '../../components/QRCodeComponent';
import loc from '../../loc';
import { PaymentCodeStackParamList } from '../../navigation/PaymentCodeStack';

type Props = NativeStackScreenProps<PaymentCodeStackParamList, 'PaymentCode'>;

export default function PaymentCode() {
  const route = useRoute();
  const { paymentCode } = route.params as Props['route']['params'];

  return (
    <View style={styles.container}>
      {!paymentCode && <Text>{loc.bip47.not_found}</Text>}
      {paymentCode && (
        <>
          <QRCodeComponent value={paymentCode} />
          <CopyTextToClipboard text={paymentCode} truncated={false} />
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
