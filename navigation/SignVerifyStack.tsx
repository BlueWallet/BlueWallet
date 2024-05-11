import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SignVerifyComponent } from './LazyLoadSignVerifyStack';
import { useTheme } from '../components/themes';
import navigationStyle from '../components/navigationStyle';
import loc from '../loc';

const Stack = createNativeStackNavigator();

const SignVerifyStackRoot = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator screenOptions={{ headerShadowVisible: false }}>
      <Stack.Screen
        name="SignVerify"
        component={SignVerifyComponent}
        options={navigationStyle({ closeButton: true, headerBackVisible: false, statusBarStyle: 'light', title: loc.addresses.sign_title })(
          theme,
        )}
      />
    </Stack.Navigator>
  );
};

export default SignVerifyStackRoot;
