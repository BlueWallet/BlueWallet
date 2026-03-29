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
  const { horizontalSizeClass } = useSizeClass();

  if (horizontalSizeClass === SizeClass.Compact) {
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
  const { horizontalSizeClass } = useSizeClass();
  const { direction } = useLocale();
  useCompanionListeners();

  const getDrawerWidth = useMemo(() => {
    switch (horizontalSizeClass) {
      case SizeClass.Large:
        return 320;
      case SizeClass.Regular:
        return 280;
      default:
        return 0;
    }
  }, [horizontalSizeClass]);

  const drawerStyle: DrawerNavigationOptions = useMemo(
    () => ({
      drawerPosition: direction === 'rtl' ? 'right' : 'left',
      drawerStyle: {
        width: getDrawerWidth,
        height: '100%',
      },
      drawerType: horizontalSizeClass !== SizeClass.Compact ? 'permanent' : 'front',
      overlayColor: 'rgba(0,0,0,0.4)',
      swipeEnabled: false,

      ...getAnimationConfig(true),
    }),
    [getDrawerWidth, horizontalSizeClass, direction],
  );

  useEffect(() => {
    console.debug('[DrawerRoot] Size class changed:', SizeClass[horizontalSizeClass]);
  }, [horizontalSizeClass]);

  return (
    <Drawer.Navigator
      screenOptions={drawerStyle}
      drawerContent={DrawerContent}
      initialRouteName="DetailViewStackScreensStack"
      defaultStatus={horizontalSizeClass !== SizeClass.Compact ? 'open' : 'closed'}
    >
      <Drawer.Screen name="DetailViewStackScreensStack" component={DetailViewStackScreensStack} options={{ headerShown: false }} />
    </Drawer.Navigator>
  );
};

export default DrawerRoot;
