import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PaymentCodeComponent, PaymentCodesListComponent } from './LazyLoadPaymentCodeStack';
import loc from '../loc'; // Assuming 'loc' is used for localization
import navigationStyle from '../components/navigationStyle';
import { useTheme } from '../components/themes';

export type PaymentCodeStackParamList = {
  PaymentCode: { paymentCode: string };
  PaymentCodesList: { walletID: string };
};

const Stack = createNativeStackNavigator<PaymentCodeStackParamList>();

const PaymentCodeStackRoot = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator screenOptions={{ headerShadowVisible: false }} initialRouteName="PaymentCode">
      <Stack.Screen
        name="PaymentCode"
        component={PaymentCodeComponent}
        options={navigationStyle({ title: loc.bip47.payment_code, closeButton: true })(theme)}
      />
      <Stack.Screen
        name="PaymentCodesList"
        component={PaymentCodesListComponent}
        options={navigationStyle({ title: loc.bip47.contacts, closeButton: true })(theme)}
      />
    </Stack.Navigator>
  );
};

export default PaymentCodeStackRoot;
