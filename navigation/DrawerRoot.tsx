// DrawerRoot.tsx
import { createDrawerNavigator, DrawerNavigationOptions } from '@react-navigation/drawer';
import React, { useLayoutEffect, useMemo } from 'react';
import { I18nManager, LayoutAnimation } from 'react-native';

import { useIsLargeScreen } from '../hooks/useIsLargeScreen';
import DrawerList from '../screen/wallets/DrawerList';
import DetailViewStackScreensStack from './DetailViewScreensStack';
import { useSettings } from '../hooks/context/useSettings';

const Drawer = createDrawerNavigator();

const DrawerListContent = (props: any) => {
  return <DrawerList {...props} />;
};

const DrawerRoot = () => {
  const { isLargeScreen } = useIsLargeScreen();
  const { isDrawerShouldHide } = useSettings();

  const drawerStyle: DrawerNavigationOptions = useMemo(
    () => ({
      drawerPosition: I18nManager.isRTL ? 'right' : 'left',
      drawerStyle: { width: isLargeScreen && !isDrawerShouldHide ? 320 : '0%' },
      drawerType: isLargeScreen ? 'permanent' : 'back',
    }),
    [isDrawerShouldHide, isLargeScreen],
  );

  useLayoutEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [isDrawerShouldHide]);

  return (
    <Drawer.Navigator screenOptions={drawerStyle} drawerContent={DrawerListContent}>
      <Drawer.Screen
        name="DetailViewStackScreensStack"
        component={DetailViewStackScreensStack}
        options={{ headerShown: false, gestureHandlerProps: { enableTrackpadTwoFingerGesture: false } }}
      />
    </Drawer.Navigator>
  );
};

export default DrawerRoot;
