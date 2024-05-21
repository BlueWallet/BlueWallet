// DrawerRoot.tsx
import { createDrawerNavigator, DrawerNavigationOptions } from '@react-navigation/drawer';
import React, { useMemo } from 'react';
import { I18nManager } from 'react-native';

import { useIsLargeScreen } from '../hooks/useIsLargeScreen';
import DrawerList from '../screen/wallets/DrawerList';
import DetailViewStackScreensStack from './DetailViewScreensStack';

const Drawer = createDrawerNavigator();

const DrawerListContent = (props: any) => {
  return <DrawerList {...props} />;
};

const DrawerRoot = () => {
  const isLargeScreen = useIsLargeScreen();

  const drawerStyle: DrawerNavigationOptions = useMemo(
    () => ({
      drawerPosition: I18nManager.isRTL ? 'right' : 'left',
      drawerStyle: { width: isLargeScreen ? 320 : '0%' },
      drawerType: isLargeScreen ? 'permanent' : 'back',
    }),
    [isLargeScreen],
  );

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
