import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ScanQRCodeComponent } from './LazyLoadScanQRCodeStack';
import { useTheme } from '../components/themes';
import navigationStyle from '../components/navigationStyle';

const Stack = createNativeStackNavigator();

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
