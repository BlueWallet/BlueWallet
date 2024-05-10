import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WalletXpubComponent } from './LazyLoadWalletXpubStack';
import { useTheme } from '../components/themes';
import navigationStyle from '../components/navigationStyle';
import loc from '../loc';

const Stack = createNativeStackNavigator();

const WalletXpubStackRoot = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator screenOptions={{ headerShadowVisible: false, statusBarStyle: 'light' }} initialRouteName="WalletXpub">
      <Stack.Screen
        name="WalletXpub"
        component={WalletXpubComponent}
        options={navigationStyle({
          closeButton: true,
          headerBackVisible: false,
          headerTitle: loc.wallets.xpub_title,
        })(theme)}
      />
    </Stack.Navigator>
  );
};

export default WalletXpubStackRoot;
