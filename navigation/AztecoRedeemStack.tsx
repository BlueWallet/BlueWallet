import React, { lazy } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import navigationStyle from '../components/navigationStyle';
import { useTheme } from '../components/themes';
import loc from '../loc';
import { withLazySuspense } from './LazyLoadingIndicator';

const Stack = createNativeStackNavigator();

const AztecoRedeem = lazy(() => import('../screen/receive/AztecoRedeem'));
const SelectWallet = lazy(() => import('../screen/wallets/SelectWallet'));

const AztecoRedeemComponent = withLazySuspense(AztecoRedeem);
const SelectWalletComponent = withLazySuspense(SelectWallet);

const AztecoRedeemStackRoot = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator screenOptions={{ headerShadowVisible: false }}>
      <Stack.Screen
        name="AztecoRedeem"
        component={AztecoRedeemComponent}
        options={navigationStyle({
          title: loc.azteco.title,
          statusBarStyle: 'auto',
        })(theme)}
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
