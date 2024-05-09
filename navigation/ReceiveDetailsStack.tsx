import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ReceiveDetailsComponent } from './LazyLoadReceiveDetailsStack';
import { useTheme } from '../components/themes';
import navigationStyle from '../components/navigationStyle';
import loc from '../loc';

const Stack = createNativeStackNavigator();

const ReceiveDetailsStackRoot = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator screenOptions={{ headerShadowVisible: false }} initialRouteName="ReceiveDetails">
      <Stack.Screen
        name="ReceiveDetails"
        component={ReceiveDetailsComponent}
        options={navigationStyle({ closeButton: true, headerBackVisible: false, title: loc.receive.header, statusBarStyle: 'light' })(
          theme,
        )}
      />
    </Stack.Navigator>
  );
};

export default ReceiveDetailsStackRoot;
