import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { lazy } from 'react';

import navigationStyle from '../components/navigationStyle';
import { useTheme } from '../components/themes';
import loc from '../loc';
import { withLazySuspense } from './LazyLoadingIndicator';

const Stack = createNativeStackNavigator();

const SignVerify = lazy(() => import('../screen/wallets/signVerify'));
const SignVerifyComponent = withLazySuspense(SignVerify);

const SignVerifyStackRoot = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator screenOptions={{ headerShadowVisible: false }}>
      <Stack.Screen
        name="SignVerify"
        component={SignVerifyComponent}
        options={navigationStyle({ headerBackVisible: false, statusBarStyle: 'light', title: loc.addresses.sign_title })(theme)}
      />
    </Stack.Navigator>
  );
};

export default SignVerifyStackRoot;
