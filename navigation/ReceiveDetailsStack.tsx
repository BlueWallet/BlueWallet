import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import navigationStyle from '../components/navigationStyle';
import { useTheme } from '../components/themes';
import loc from '../loc';
import { ReceiveDetailsComponent } from './LazyLoadReceiveDetailsStack';

const Stack = createNativeStackNavigator();

const ReceiveDetailsStackRoot = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator screenOptions={{ headerShadowVisible: false }} initialRouteName="ReceiveDetails">
      <Stack.Screen
        name="ReceiveDetails"
        component={ReceiveDetailsComponent}
        options={navigationStyle({ headerBackVisible: false, title: loc.receive.header, statusBarStyle: 'light' })(theme)}
      />
    </Stack.Navigator>
  );
};

export default ReceiveDetailsStackRoot;
