import { createNativeStackNavigator, NativeStackNavigationOptions } from '@react-navigation/native-stack';
import React, { lazy, Suspense } from 'react';

import { isHandset } from '../blue_modules/environment';
import { useStorage } from '../blue_modules/storage-context';
import UnlockWith from '../screen/UnlockWith';
import { LazyLoadingIndicator } from './LazyLoadingIndicator';

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
export const NavigationDefaultOptionsForDesktop: NativeStackNavigationOptions = { headerShown: false, presentation: 'fullScreenModal' };
export const StatusBarLightOptions: NativeStackNavigationOptions = { statusBarStyle: 'light' };

const UnlockStack = createNativeStackNavigator();

const UnlockRoot = () => {
  return (
    <UnlockStack.Navigator screenOptions={{ headerShown: false, animationTypeForReplace: 'push' }}>
      <UnlockStack.Screen name="UnlockWithScreen" component={UnlockWith} />
    </UnlockStack.Navigator>
  );
};
const MainRoot = () => {
  const { walletsInitialized } = useStorage();

  const renderRoot = () => {
    if (!walletsInitialized) {
      return <UnlockRoot />;
    } else {
      // Conditional rendering based on the environment
      const Component = isHandset ? DetailViewScreensStack : DrawerRoot;
      return (
        <Suspense fallback={<LazyLoadingIndicator />}>
          <Component />
        </Suspense>
      );
    }
  };

  return renderRoot();
};

export default MainRoot;
