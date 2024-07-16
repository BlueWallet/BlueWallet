import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import navigationStyle from '../components/navigationStyle';
import { useTheme } from '../components/themes';
import loc from '../loc';
import { WalletXpubComponent } from './LazyLoadWalletXpubStack';

const Stack = createNativeStackNavigator();

const WalletXpubStackRoot = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator screenOptions={{ headerShadowVisible: false, statusBarStyle: 'light' }} initialRouteName="WalletXpub">
      <Stack.Screen
        name="WalletXpub"
        component={WalletXpubComponent}
        options={navigationStyle({
          headerBackVisible: false,
          headerTitle: loc.wallets.xpub_title,
        })(theme)}
      />
    </Stack.Navigator>
  );
};

export default WalletXpubStackRoot;
