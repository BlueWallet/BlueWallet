import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import navigationStyle from '../components/navigationStyle';
import { useTheme } from '../components/themes';
import loc from '../loc';
import { AztecoRedeemComponent } from './LazyLoadAztecoRedeemStack';

const Stack = createNativeStackNavigator();

const AztecoRedeemStackRoot = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator screenOptions={{ headerShadowVisible: false }}>
      <Stack.Screen
        name="AztecoRedeem"
        component={AztecoRedeemComponent}
        options={navigationStyle({
          title: loc.azteco.title,
          statusBarStyle: 'auto',
        })(theme)}
      />
  
    </Stack.Navigator>
  );
};

export default AztecoRedeemStackRoot;
