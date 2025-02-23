import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import navigationStyle, { CloseButtonPosition } from '../components/navigationStyle';
import { useTheme } from '../components/themes';
import loc from '../loc';
import { ReceiveCustomAmountComponent, ReceiveDetailsComponent } from './LazyLoadReceiveDetailsStack';

const Stack = createNativeStackNavigator();

const ReceiveDetailsStackRoot = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator screenOptions={{ headerShadowVisible: false }} initialRouteName="ReceiveDetails">
      <Stack.Screen
        name="ReceiveDetails"
        component={ReceiveDetailsComponent}
        options={navigationStyle({
          closeButtonPosition: CloseButtonPosition.Left,
          title: loc.receive.header,
          statusBarStyle: 'light',
        })(theme)}
      />
      <Stack.Screen
        name="ReceiveCustomAmount"
        component={ReceiveCustomAmountComponent}
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: 'fitToContents',
          headerShown: false,
          sheetGrabberVisible: true,
        }}
      />
    </Stack.Navigator>
  );
};

export default ReceiveDetailsStackRoot;
