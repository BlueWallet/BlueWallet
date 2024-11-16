// DrawerRoot.tsx
import { createDrawerNavigator, DrawerNavigationOptions } from '@react-navigation/drawer';
import React, { useLayoutEffect, useMemo, useEffect } from 'react';
import { I18nManager, LayoutAnimation, AppState, NativeEventSubscription } from 'react-native';

import { useIsLargeScreen } from '../hooks/useIsLargeScreen';
import DrawerList from '../screen/wallets/DrawerList';
import DetailViewStackScreensStack from './DetailViewScreensStack';
import { useSettings } from '../hooks/context/useSettings';
import { useStorage } from '../hooks/context/useStorage';
import UnlockWith from '../screen/UnlockWith';
import { useBiometrics } from '../hooks/useBiometrics';

const Drawer = createDrawerNavigator();

const DrawerListContent = (props: any) => {
  return <DrawerList {...props} />;
};

const DrawerRoot = () => {
  const { isLargeScreen } = useIsLargeScreen();
  const { isDrawerShouldHide } = useSettings();
  const { walletsInitialized, setWalletsInitialized, isStorageEncrypted } = useStorage();
  const { biometricEnabled } = useBiometrics();

  const drawerStyle: DrawerNavigationOptions = useMemo(
    () => ({
      drawerPosition: I18nManager.isRTL ? 'right' : 'left',
      drawerStyle: { width: isLargeScreen && !isDrawerShouldHide && walletsInitialized ? 320 : '0%' },
      drawerType: isLargeScreen && walletsInitialized ? 'permanent' : 'back',
    }),
    [isDrawerShouldHide, isLargeScreen, walletsInitialized],
  );

  useLayoutEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [isDrawerShouldHide]);

  useEffect(() => {
    let subscription: NativeEventSubscription | undefined;

    const checkStorageEncryption = async () => {
      const encrypted = await isStorageEncrypted();
      if (encrypted || biometricEnabled) {
        const handleAppStateChange = (nextAppState: string) => {
          if (nextAppState === 'active') {
            console.log('App has come to the foreground, setting walletsInitialized to false');
            setWalletsInitialized(false);
          }
        };
        handleAppStateChange('active');
        subscription = AppState.addEventListener('change', handleAppStateChange);
      }
    };

    checkStorageEncryption();

    return () => {
      subscription?.remove();
    };
  }, [setWalletsInitialized, isStorageEncrypted, biometricEnabled]);

  return (
    <Drawer.Navigator screenOptions={drawerStyle} drawerContent={DrawerListContent}>
      {!walletsInitialized && (
        <Drawer.Screen
          name="UnlockWithScreen"
          component={UnlockWith}
          options={{ gestureHandlerProps: { enabled: false }, headerShown: false }}
        />
      )}
      <Drawer.Screen
        name="DetailViewStackScreensStack"
        component={DetailViewStackScreensStack}
        options={{ headerShown: false, gestureHandlerProps: { enableTrackpadTwoFingerGesture: false } }}
      />
    </Drawer.Navigator>
  );
};

export default DrawerRoot;
