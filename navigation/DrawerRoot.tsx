import { createDrawerNavigator, DrawerNavigationOptions, DrawerContentComponentProps } from '@react-navigation/drawer';
import { useLocale } from '@react-navigation/native';
import React, { useEffect, useMemo } from 'react';
import { Animated, Easing } from 'react-native';
import { useSizeClass, SizeClass } from '../blue_modules/sizeClass';
import DrawerList from '../screen/wallets/DrawerList';
import DetailViewStackScreensStack from './DetailViewScreensStack';
import { DrawerParamList } from './DrawerParamList';
import useCompanionListeners from '../hooks/useCompanionListeners';

const Drawer = createDrawerNavigator<DrawerParamList>();

const DrawerContent = (props: DrawerContentComponentProps) => {
  const { isLargeScreen } = useSizeClass();

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
  const { sizeClass, isLargeScreen } = useSizeClass();
  const { direction } = useLocale();
  useCompanionListeners();

  const getDrawerWidth = useMemo(() => {
    switch (sizeClass) {
      case SizeClass.Large:
        return 320;
      case SizeClass.Regular:
        return 280;
      default:
        return 0;
    }
  }, [sizeClass]);

  const drawerStyle: DrawerNavigationOptions = useMemo(
    () => ({
      drawerPosition: direction === 'rtl' ? 'right' : 'left',
      drawerStyle: {
        width: getDrawerWidth,
        height: '100%',
      },
      drawerType: isLargeScreen ? 'permanent' : 'front',
      overlayColor: 'rgba(0,0,0,0.4)',
      swipeEnabled: false,

      ...getAnimationConfig(true),
    }),
    [getDrawerWidth, isLargeScreen, direction],
  );

  useEffect(() => {
    console.debug('[DrawerRoot] Size class changed:', SizeClass[sizeClass]);
  }, [sizeClass]);

  return (
    <Drawer.Navigator
      screenOptions={drawerStyle}
      drawerContent={DrawerContent}
      initialRouteName="DetailViewStackScreensStack"
      defaultStatus={isLargeScreen ? 'open' : 'closed'}
    >
      <Drawer.Screen name="DetailViewStackScreensStack" component={DetailViewStackScreensStack} options={{ headerShown: false }} />
    </Drawer.Navigator>
  );
};

export default DrawerRoot;
