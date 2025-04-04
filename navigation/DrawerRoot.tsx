import { createDrawerNavigator, DrawerNavigationOptions, DrawerContentComponentProps } from '@react-navigation/drawer';
import React, { useEffect, useMemo } from 'react';
import { I18nManager, Animated, Easing } from 'react-native';
import { useIsLargeScreen } from '../hooks/useIsLargeScreen';
import DrawerList from '../screen/wallets/DrawerList';
import DetailViewStackScreensStack from './DetailViewScreensStack';
import { DrawerParamList } from './DrawerParamList';

const Drawer = createDrawerNavigator<DrawerParamList>();

const DrawerContent = (props: DrawerContentComponentProps) => {
  const { isLargeScreen } = useIsLargeScreen();

  if (!isLargeScreen) {
    return null;
  }

  return <DrawerList {...props} />;
};

const getAnimationConfig = (isDrawerTransitionConfigured: boolean) => {
  if (!isDrawerTransitionConfigured) return {};

  return {
    config: {
      timing: Animated.timing,
      useNativeDriver: true,
      duration: 250,
      easing: Easing.inOut(Easing.cubic),
    },
  };
};

const DrawerRoot = () => {
  const { isLargeScreen } = useIsLargeScreen();

  const getDrawerWidth = useMemo(() => {
    return isLargeScreen ? 320 : 0;
  }, [isLargeScreen]);

  const drawerStyle: DrawerNavigationOptions = useMemo(
    () => ({
      drawerPosition: I18nManager.isRTL ? 'right' : 'left',
      drawerStyle: {
        width: getDrawerWidth,
        height: '100%',
      },
      drawerType: isLargeScreen ? 'permanent' : 'front',
      overlayColor: 'rgba(0,0,0,0.4)',
      swipeEnabled: false,
      drawerStatusBarAnimation: 'fade',
      ...getAnimationConfig(true),
    }),
    [getDrawerWidth, isLargeScreen],
  );

  useEffect(() => {
    console.debug('[DrawerRoot] isLargeScreen changed:', isLargeScreen);
  }, [isLargeScreen]);

  return (
    <Drawer.Navigator screenOptions={drawerStyle} drawerContent={DrawerContent} initialRouteName="DetailViewStackScreensStack">
      <Drawer.Screen name="DetailViewStackScreensStack" component={DetailViewStackScreensStack} options={{ headerShown: false }} />
    </Drawer.Navigator>
  );
};

export default DrawerRoot;
