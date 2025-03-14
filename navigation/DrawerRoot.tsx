// DrawerRoot.tsx
import { createDrawerNavigator, DrawerNavigationOptions, DrawerContentComponentProps } from '@react-navigation/drawer';
import React, { useLayoutEffect, useMemo } from 'react';
import { I18nManager, LayoutAnimation } from 'react-native';

import { useIsLargeScreen } from '../hooks/useIsLargeScreen';
import DrawerList from '../screen/wallets/DrawerList';
import DetailViewStackScreensStack from './DetailViewScreensStack';
import { useSettings } from '../hooks/context/useSettings';
import { DrawerParamList } from './DrawerParamList';

const Drawer = createDrawerNavigator<DrawerParamList>();

const DrawerContent = (props: DrawerContentComponentProps) => {
  return <DrawerList {...props} />;
};

const DrawerRoot = () => {
  const { isLargeScreen } = useIsLargeScreen();
  const { isDrawerShouldHide } = useSettings();

  const drawerStyle: DrawerNavigationOptions = useMemo(
    () => ({
      drawerPosition: I18nManager.isRTL ? 'right' : 'left',
      drawerStyle: {
        width: isLargeScreen && !isDrawerShouldHide ? 320 : '0%',
        height: '100%',
      },
      drawerType: isLargeScreen ? 'permanent' : 'front',
      overlayColor: 'rgba(0,0,0,0.5)',
      swipeEnabled: !isDrawerShouldHide,
    }),
    [isDrawerShouldHide, isLargeScreen],
  );

  useLayoutEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [isDrawerShouldHide]);

  return (
    <Drawer.Navigator screenOptions={drawerStyle} drawerContent={DrawerContent} initialRouteName="DetailViewStackScreensStack">
      <Drawer.Screen name="DetailViewStackScreensStack" component={DetailViewStackScreensStack} options={{ headerShown: false }} />
    </Drawer.Navigator>
  );
};

export default DrawerRoot;
