import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SelectWalletComponent, LdkOpenChannelComponent, SuccessComponent } from './LazyLoadLDKOpenChannelStack';
import { useTheme } from '../components/themes';
import navigationStyle from '../components/navigationStyle';
import loc from '../loc';

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
