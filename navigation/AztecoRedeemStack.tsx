import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import navigationStyle, { navigationStyleTx } from '../components/navigationStyle';
import { useTheme } from '../components/themes';
import loc from '../loc';
import { AztecoRedeemComponent, SelectWalletComponent } from './LazyLoadAztecoRedeemStack';

const Stack = createNativeStackNavigator();

const AztecoRedeemStackRoot = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator screenOptions={{ headerShadowVisible: false }}>
      <Stack.Screen
        name="AztecoRedeem"
        component={AztecoRedeemComponent}
        options={navigationStyleTx({}, options => ({
          ...options,
          title: loc.azteco.title,
          statusBarStyle: 'auto',
        }))(theme)}
      />
      <Stack.Screen
        name="SelectWallet"
        component={SelectWalletComponent}
        options={navigationStyle({
          title: loc.wallets.select_wallet,
        })(theme)}
      />
    </Stack.Navigator>
  );
};

export default AztecoRedeemStackRoot;
