import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { lazy } from 'react';
import navigationStyle, { CloseButtonPosition } from '../components/navigationStyle';
import { useTheme } from '../components/themes';
import loc from '../loc';
import { withLazySuspense } from './LazyLoadingIndicator';

const Stack = createNativeStackNavigator();

const LNDCreateInvoice = lazy(() => import('../screen/lnd/lndCreateInvoice'));
const SelectWallet = lazy(() => import('../screen/wallets/SelectWallet'));
const LNDViewInvoice = lazy(() => import('../screen/lnd/lndViewInvoice'));
const LNDViewAdditionalInvoicePreImage = lazy(() => import('../screen/lnd/lndViewAdditionalInvoicePreImage'));
const ScanQRCode = lazy(() => import('../screen/send/ScanQRCode'));

const LNDCreateInvoiceComponent = withLazySuspense(LNDCreateInvoice);
const SelectWalletComponent = withLazySuspense(SelectWallet);
const LNDViewInvoiceComponent = withLazySuspense(LNDViewInvoice);
const LNDViewAdditionalInvoicePreImageComponent = withLazySuspense(LNDViewAdditionalInvoicePreImage);
const ScanQRCodeComponent = withLazySuspense(ScanQRCode);

const LNDCreateInvoiceRoot = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator screenOptions={{ headerShadowVisible: false }}>
      <Stack.Screen
        name="LNDCreateInvoice"
        component={LNDCreateInvoiceComponent}
        options={navigationStyle({
          title: loc.receive.header,
          closeButtonPosition: CloseButtonPosition.Right,
          headerBackVisible: false,
          statusBarStyle: 'light',
        })(theme)}
      />
      <Stack.Screen
        name="SelectWallet"
        component={SelectWalletComponent}
        options={navigationStyle({ title: loc.wallets.select_wallet })(theme)}
      />
      <Stack.Screen
        name="LNDViewInvoice"
        component={LNDViewInvoiceComponent}
        options={navigationStyle({
          statusBarStyle: 'auto',
          headerTitle: loc.lndViewInvoice.lightning_invoice,
          headerStyle: {
            backgroundColor: theme.colors.customHeader,
          },
        })(theme)}
      />
      <Stack.Screen
        name="LNDViewAdditionalInvoicePreImage"
        component={LNDViewAdditionalInvoicePreImageComponent}
        options={navigationStyle({ title: loc.lndViewInvoice.additional_info })(theme)}
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

export default LNDCreateInvoiceRoot;
