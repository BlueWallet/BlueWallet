import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../components/themes';
import loc from '../loc';
import ReceiveDetails from '../screen/receive/ReceiveDetails';
import navigationStyle, { CloseButtonPosition } from '../components/navigationStyle';
import { ReceiveDetailsStackParamList } from './ReceiveDetailsStackParamList';
import ReceiveCustomAmountSheet from '../screen/receive/ReceiveCustomAmountSheet';
import { Platform } from 'react-native';

const Stack = createNativeStackNavigator<ReceiveDetailsStackParamList>();

const ReceiveDetailsStack = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator screenOptions={{ headerShadowVisible: false }} initialRouteName="ReceiveDetails">
      <Stack.Screen
        name="ReceiveDetails"
        component={ReceiveDetails}
        options={navigationStyle(
          {
            title: loc.receive.header,
            closeButtonPosition: CloseButtonPosition.Left,
            headerShown: true,
          },
          (options, { route }) => ({
            ...options,
            headerLeft: route.params?.headerLeft ?? options.headerLeft,
            headerRight: route.params?.headerRight ?? options.headerRight,
            headerBackVisible: route.params?.headerBackVisible ?? options.headerBackVisible,
          }),
        )(theme)}
      />
      <Stack.Screen
        name="ReceiveCustomAmount"
        component={ReceiveCustomAmountSheet}
        options={navigationStyle({
          presentation: 'formSheet',
          sheetAllowedDetents: Platform.OS === 'ios' ? 'fitToContents' : [0.9],
          headerTitle: loc.receive.details_setAmount,
          sheetGrabberVisible: true,
          closeButtonPosition: CloseButtonPosition.Right,
        })(theme)}
      />
    </Stack.Navigator>
  );
};

export default ReceiveDetailsStack;
