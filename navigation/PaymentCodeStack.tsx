import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import navigationStyle from '../components/navigationStyle';
import { useTheme } from '../components/themes';
import loc from '../loc'; // Assuming 'loc' is used for localization
import { PaymentCodeStackParamList } from './PaymentCodeStackParamList';
import PaymentCodesListComponent from './LazyLoadPaymentCodeStack';

const Stack = createNativeStackNavigator<PaymentCodeStackParamList>();
const PaymentCodeStackRoot = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator initialRouteName="PaymentCodesList" screenOptions={{ headerShadowVisible: false }}>
      <Stack.Screen
        name="PaymentCodesList"
        component={PaymentCodesListComponent}
        options={navigationStyle({ title: loc.bip47.contacts })(theme)}
      />
    </Stack.Navigator>
  );
};

export default PaymentCodeStackRoot;
