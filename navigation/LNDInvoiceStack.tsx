import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { lazy } from 'react';
import navigationStyle from '../components/navigationStyle';
import { useTheme } from '../components/themes';
import loc from '../loc';
import { withLazySuspense } from './LazyLoadingIndicator';
import { LNDInvoiceStackParamList } from './LNDInvoiceStackParamList';

const Stack = createNativeStackNavigator<LNDInvoiceStackParamList>();

const LNDReceiveInvoice = lazy(() => import('../screen/lnd/lndReceiveInvoice'));
const LNDViewInvoice = lazy(() => import('../screen/lnd/lndViewInvoice'));
const Success = lazy(() => import('../screen/send/success'));

const LNDReceiveInvoiceComponent = withLazySuspense(LNDReceiveInvoice);
const LNDViewInvoiceComponent = withLazySuspense(LNDViewInvoice);
const SuccessComponent = withLazySuspense(Success);

const LNDInvoiceRoot = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator screenOptions={{ headerShadowVisible: false }}>
      <Stack.Screen
        name="LNDReceiveInvoice"
        component={LNDReceiveInvoiceComponent}
        options={navigationStyle({
          title: loc.receive.header,
          headerBackVisible: false,
          headerStyle: {
            backgroundColor: theme.colors.customHeader,
          },
        })(theme)}
      />
      <Stack.Screen
        name="LNDViewInvoice"
        component={LNDViewInvoiceComponent}
        options={navigationStyle({
          headerTitle: loc.lndViewInvoice.lightning_invoice,
          headerStyle: {
            backgroundColor: theme.colors.customHeader,
          },
        })(theme)}
      />
      <Stack.Screen
        name="Success"
        component={SuccessComponent}
        options={navigationStyle({ headerShown: false, gestureEnabled: false })(theme)}
      />
    </Stack.Navigator>
  );
};

export default LNDInvoiceRoot;
