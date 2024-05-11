import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PaymentCodeComponent, PaymentCodesListComponent } from './LazyLoadPaymentCodeStack';
import loc from '../loc'; // Assuming 'loc' is used for localization

export type PaymentCodeStackParamList = {
  PaymentCode: { paymentCode: string };
  PaymentCodesList: { walletID: string };
};

const Stack = createNativeStackNavigator<PaymentCodeStackParamList>();

const PaymentCodeStackRoot = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShadowVisible: false }} initialRouteName="PaymentCode">
      <Stack.Screen name="PaymentCode" component={PaymentCodeComponent} options={{ headerTitle: loc.bip47.payment_code }} />
      <Stack.Screen name="PaymentCodesList" component={PaymentCodesListComponent} options={{ headerTitle: loc.bip47.payment_codes_list }} />
    </Stack.Navigator>
  );
};

export default PaymentCodeStackRoot;
