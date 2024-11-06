import { createNativeStackNavigator, NativeStackNavigationOptions } from '@react-navigation/native-stack';
import React, { lazy, Suspense, useEffect } from 'react';
import { isHandset } from '../blue_modules/environment';
import UnlockWith from '../screen/UnlockWith';
import { LazyLoadingIndicator } from './LazyLoadingIndicator';
import { DetailViewStackParamList } from './DetailViewStackParamList';
import { useStorage } from '../hooks/context/useStorage';
import CompanionDelegate from '../components/CompanionDelegate';
import { navigationRef } from '../NavigationService';

const DetailViewScreensStack = lazy(() => import('./DetailViewScreensStack'));
const DrawerRoot = lazy(() => import('./DrawerRoot'));

export const NavigationDefaultOptions: NativeStackNavigationOptions = {
  headerShown: false,
  presentation: 'modal',
  headerShadowVisible: false,
};
export const NavigationFormModalOptions: NativeStackNavigationOptions = {
  headerShown: false,
  presentation: 'formSheet',
};
export const StatusBarLightOptions: NativeStackNavigationOptions = { statusBarStyle: 'light' };

const DetailViewStack = createNativeStackNavigator<DetailViewStackParamList>();

const UnlockRoot = () => {
  return (
    <DetailViewStack.Navigator screenOptions={{ headerShown: false, animationTypeForReplace: 'push' }}>
      <DetailViewStack.Screen name="UnlockWithScreen" component={UnlockWith} />
    </DetailViewStack.Navigator>
  );
};

const MainRoot = () => {

  const { walletsInitialized, isNavigationReady } = useStorage();
  
  const renderRoot = () => {
    if (!walletsInitialized) {
      return <UnlockRoot />;
    } else {
      const Component = isHandset ? DetailViewScreensStack : DrawerRoot;
      return (
        <Suspense fallback={<LazyLoadingIndicator />}>
          <Component />
          {isNavigationReady && <CompanionDelegate />}
        </Suspense>
      );
    }
  };

  return renderRoot();
};

export default MainRoot;
export { DetailViewStack };
