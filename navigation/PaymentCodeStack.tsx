import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import navigationStyle from '../components/navigationStyle';
import { useTheme } from '../components/themes';
import loc from '../loc'; // Assuming 'loc' is used for localization
import { PaymentCodesListComponent } from './LazyLoadPaymentCodeStack';
import { PaymentCodeStackParamList } from './PaymentCodeStackParamList';

const Stack = createNativeStackNavigator<PaymentCodeStackParamList>();

const PaymentCodeStackRoot = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator screenOptions={{ headerShadowVisible: false }} initialRouteName="PaymentCodesList">
      <Stack.Screen
        name="PaymentCodesList"
        component={PaymentCodesListComponent}
        options={navigationStyle({ title: loc.bip47.contacts })(theme)}
      />
    </Stack.Navigator>
  );
};

export default PaymentCodeStackRoot;
