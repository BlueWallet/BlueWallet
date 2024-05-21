import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import navigationStyle from '../components/navigationStyle';
import { useTheme } from '../components/themes';
import loc from '../loc';
import { LdkOpenChannelComponent, SelectWalletComponent, SuccessComponent } from './LazyLoadLDKOpenChannelStack';

const Stack = createNativeStackNavigator();

const LDKOpenChannelRoot = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator screenOptions={{ headerShadowVisible: false }} initialRouteName="SelectWallet">
      <Stack.Screen
        name="SelectWallet"
        component={SelectWalletComponent}
        options={navigationStyle({ title: loc.wallets.select_wallet })(theme)}
      />
      <Stack.Screen name="LDKOpenChannelSetAmount" component={LdkOpenChannelComponent} />
      <Stack.Screen name="Success" component={SuccessComponent} options={{ headerShown: false, gestureEnabled: false }} />
    </Stack.Navigator>
  );
};

export default LDKOpenChannelRoot;
