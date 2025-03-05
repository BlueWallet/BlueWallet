import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import navigationStyle from '../components/navigationStyle';
import { useTheme } from '../components/themes';
import loc from '../loc';
import { ViewEditMultisigCosignersComponent } from './LazyLoadViewEditMultisigCosignersStack';
import { ScanQRCodeComponent } from './LazyLoadScanQRCodeStack';
import { ScanQRCodeParamList } from './DetailViewStackParamList';

export type ViewEditMultisigCosignersStackParamList = {
  ViewEditMultisigCosigners: {
    walletID: string;
    onBarScanned?: string;
  };
  ScanQRCode: ScanQRCodeParamList;
};

const Stack = createNativeStackNavigator<ViewEditMultisigCosignersStackParamList>();

const ViewEditMultisigCosignersStackRoot = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator screenOptions={{ headerShadowVisible: false }}>
      <Stack.Screen
        name="ViewEditMultisigCosigners"
        component={ViewEditMultisigCosignersComponent}
        options={navigationStyle({
          headerBackVisible: false,
          title: loc.multisig.manage_keys,
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

export default ViewEditMultisigCosignersStackRoot;
