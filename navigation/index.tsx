import React, { lazy, Suspense } from 'react';
import { createNativeStackNavigator, NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { useStorage } from '../blue_modules/storage-context';
import UnlockWith from '../screen/UnlockWith';
import { LazyLoadingIndicator } from './LazyLoadingIndicator';
import { DetailViewStackParamList } from './DetailViewStackParamList';
import { isAndroidTablet } from '../blue_modules/environment';
import { useIsLargeScreen } from '../hooks/useIsLargeScreen';

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

const DetailViewStack = createNativeStackNavigator<DetailViewStackParamList>();

const UnlockRoot = () => {
  return (
    <DetailViewStack.Navigator screenOptions={{ headerShown: false, animationTypeForReplace: 'push' }}>
      <DetailViewStack.Screen name="UnlockWithScreen" component={UnlockWith} />
    </DetailViewStack.Navigator>
  );
};

const MainRoot = () => {
  const { walletsInitialized } = useStorage();
  const { initialSizeClass, isLargeScreen } = useIsLargeScreen();
  const isTablet = isAndroidTablet();

  const renderRoot = () => {
    if (!walletsInitialized) {
      return <UnlockRoot />;
    } else {
      // Use initialSizeClass and isLargeScreen to determine the component
      const Component = initialSizeClass || (isTablet && isLargeScreen) ? DrawerRoot : DetailViewScreensStack;
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
export { DetailViewStack }; // Exporting the navigator to use it in DetailViewScreensStack
