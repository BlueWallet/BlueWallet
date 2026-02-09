import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { lazy } from 'react';

import navigationStyle, { CloseButtonPosition } from '../components/navigationStyle';
import { useTheme } from '../components/themes';
import loc from '../loc';
import { withLazySuspense } from './LazyLoadingIndicator';

const Stack = createNativeStackNavigator();

const ScanLNDInvoice = lazy(() => import('../screen/lnd/ScanLNDInvoice'));
const SelectWallet = lazy(() => import('../screen/wallets/SelectWallet'));
const Success = lazy(() => import('../screen/send/success'));
const LnurlPay = lazy(() => import('../screen/lnd/lnurlPay'));
const LnurlPaySuccess = lazy(() => import('../screen/lnd/lnurlPaySuccess'));
const ScanQRCode = lazy(() => import('../screen/send/ScanQRCode'));

const ScanLNDInvoiceComponent = withLazySuspense(ScanLNDInvoice);
const SelectWalletComponent = withLazySuspense(SelectWallet);
const SuccessComponent = withLazySuspense(Success);
const LnurlPayComponent = withLazySuspense(LnurlPay);
const LnurlPaySuccessComponent = withLazySuspense(LnurlPaySuccess);
const ScanQRCodeComponent = withLazySuspense(ScanQRCode);

const ScanLNDInvoiceRoot = () => {
  const theme = useTheme();
  return (
    <Stack.Navigator screenOptions={{ headerShadowVisible: false }}>
      <Stack.Screen
        name="ScanLNDInvoice"
        component={ScanLNDInvoiceComponent}
        options={navigationStyle({
          headerBackVisible: false,
          title: loc.send.header,
          statusBarStyle: 'light',
          closeButtonPosition: CloseButtonPosition.Right,
        })(theme)}
        initialParams={{ uri: undefined, walletID: undefined, invoice: undefined }}
      />
      <Stack.Screen
        name="SelectWallet"
        component={SelectWalletComponent}
        options={navigationStyle({ title: loc.wallets.select_wallet })(theme)}
      />
      <Stack.Screen
        name="Success"
        component={SuccessComponent}
        options={navigationStyle({ headerShown: false, gestureEnabled: false })(theme)}
      />
      <Stack.Screen
        name="LnurlPay"
        component={LnurlPayComponent}
        options={navigationStyle({
          title: '',
        })(theme)}
      />
      <Stack.Screen
        name="LnurlPaySuccess"
        component={LnurlPaySuccessComponent}
        options={navigationStyle({
          title: '',
          headerBackVisible: false,
          gestureEnabled: false,
        })(theme)}
      />
      <Stack.Screen
        name="ScanQRCode"
        component={ScanQRCodeComponent}
        options={navigationStyle({
          headerShown: false,
          statusBarHidden: true,
          presentation: 'fullScreenModal',
          headerShadowVisible: false,
        })(theme)}
      />
    </Stack.Navigator>
  );
};

export default ScanLNDInvoiceRoot;
