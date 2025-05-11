import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../components/themes';
import loc from '../loc';
import ReceiveDetails from '../screen/receive/ReceiveDetails';
import navigationStyle, { CloseButtonPosition } from '../components/navigationStyle';
import { ReceiveDetailsStackParamList } from './ReceiveDetailsStackParamList';

const Stack = createNativeStackNavigator<ReceiveDetailsStackParamList>();

const ReceiveDetailsStack = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator screenOptions={{ headerShadowVisible: false }} initialRouteName="ReceiveDetails">
      <Stack.Screen
        name="ReceiveDetails"
        component={ReceiveDetails}
        options={navigationStyle({
          title: loc.receive.header,
          closeButtonPosition: CloseButtonPosition.Left,
          statusBarStyle: 'light',
          headerShown: true,
        })(theme)}
      />
    </Stack.Navigator>
  );
};

export default ReceiveDetailsStack;
