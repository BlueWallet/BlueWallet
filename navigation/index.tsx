import { createNativeStackNavigator, NativeStackNavigationOptions } from '@react-navigation/native-stack';
import React, { lazy, Suspense } from 'react';
import UnlockWith from '../screen/UnlockWith';
import { LazyLoadingIndicator } from './LazyLoadingIndicator';
import { DetailViewStackParamList } from './DetailViewStackParamList';
import { useStorage } from '../hooks/context/useStorage';
import AddWalletStack from './AddWalletStack';

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

const LazyDrawerRoot = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <DrawerRoot />
  </Suspense>
);

const MainRoot = () => {
  const { walletsInitialized } = useStorage();

  return (
    <DetailViewStack.Navigator screenOptions={{ headerShown: false }}>
      {!walletsInitialized ? (
        <DetailViewStack.Screen name="UnlockWithScreen" component={UnlockWith} />
      ) : (
        <>
          <DetailViewStack.Screen name="DrawerRoot" component={LazyDrawerRoot} />

          <DetailViewStack.Screen name="AddWalletRoot" component={AddWalletStack} options={NavigationDefaultOptions} />
        </>
      )}
    </DetailViewStack.Navigator>
  );
};

export default MainRoot;
export { DetailViewStack };
