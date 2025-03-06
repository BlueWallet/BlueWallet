import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import navigationStyle from '../components/navigationStyle';
import { useTheme } from '../components/themes';
import loc from '../loc';
import { ScanQRCodeComponent } from './LazyLoadScanQRCodeStack';
import { LnurlPayComponent, LnurlPaySuccessComponent, ScanLNDInvoiceComponent, SuccessComponent } from './LazyLoadScanLNDInvoiceStack';
import { SelectWalletComponent } from './LazyLoadLNDCreateInvoiceStack';

const Stack = createNativeStackNavigator();

const ScanLNDInvoiceRoot = () => {
  const theme = useTheme();
  return (
    <Stack.Navigator screenOptions={{ headerShadowVisible: false }}>
      <Stack.Screen
        name="ScanLNDInvoice"
        component={ScanLNDInvoiceComponent}
        options={navigationStyle({ headerBackVisible: false, title: loc.send.header, statusBarStyle: 'light' })(theme)}
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
