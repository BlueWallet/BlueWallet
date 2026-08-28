import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../components/themes';
import loc from '../loc';
import ReceiveDetails from '../screen/receive/ReceiveDetails';
import navigationStyle, { CloseButtonPosition, withRouteParamHeaderOptions, receiveSheetOptions } from '../components/navigationStyle';
import { ReceiveDetailsStackParamList } from './ReceiveDetailsStackParamList';
import ReceiveCustomAmountSheet from '../screen/receive/ReceiveCustomAmountSheet';
import ReceiveMoreOptionsSheet from '../screen/receive/ReceiveMoreOptionsSheet';
import ReceiveAddressLabelSheet from '../screen/receive/ReceiveAddressLabelSheet';

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
            closeButtonPosition: CloseButtonPosition.Right,
            headerShown: true,
          },
          withRouteParamHeaderOptions({ headerLeft: true, headerRight: false, headerBackVisible: true }),
        )(theme)}
      />
      <Stack.Screen
        name="ReceiveCustomAmount"
        component={ReceiveCustomAmountSheet}
        options={receiveSheetOptions(loc.receive.details_setAmount, 0.9)(theme)}
      />
      <Stack.Screen
        name="ReceiveMoreOptions"
        component={ReceiveMoreOptionsSheet}
        options={receiveSheetOptions(loc.receive.details_more_options)(theme)}
      />
      <Stack.Screen
        name="ReceiveAddressLabel"
        component={ReceiveAddressLabelSheet}
        options={receiveSheetOptions(loc.receive.option_label)(theme)}
      />
    </Stack.Navigator>
  );
};

export default ReceiveDetailsStack;
