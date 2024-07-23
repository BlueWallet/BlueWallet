import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import navigationStyle from '../components/navigationStyle';
import { useTheme } from '../components/themes';
import { ScanQRCodeComponent } from './LazyLoadScanQRCodeStack';

export type ScanQRCodeParamsList = {
  ScanQRCode: {
    onBarScanned?: (data: { data: string }) => void;
    launchedBy?: string;
    launchedByParams?: { [key: string]: any };
    showFileImportButton?: boolean;
    onDismiss?: () => void;
  };
};
const Stack = createNativeStackNavigator<ScanQRCodeParamsList>();

const ScanQRCodeStackRoot = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator screenOptions={{ headerShadowVisible: false }}>
      <Stack.Screen
        name="ScanQRCode"
        component={ScanQRCodeComponent}
        options={navigationStyle({
          headerShown: false,
          statusBarHidden: true,
          presentation: 'fullScreenModal',
        })(theme)}
      />
    </Stack.Navigator>
  );
};

export default ScanQRCodeStackRoot;
