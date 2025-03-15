import { createDrawerNavigator, DrawerNavigationOptions, DrawerContentComponentProps } from '@react-navigation/drawer';
import React, { useLayoutEffect, useMemo } from 'react';
import { I18nManager, LayoutAnimation, Animated, Platform, Easing, View } from 'react-native';
import { useIsLargeScreen } from '../hooks/useIsLargeScreen';
import DrawerList from '../screen/wallets/DrawerList';
import DetailViewStackScreensStack from './DetailViewScreensStack';
import { useSettings } from '../hooks/context/useSettings';
import { DrawerParamList } from './DrawerParamList';

const Drawer = createDrawerNavigator<DrawerParamList>();

const DrawerContent = (props: DrawerContentComponentProps) => {
  const { isLargeScreen } = useIsLargeScreen();

  if (!isLargeScreen) {
    return <View />;
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
  const { isDrawerShouldHide } = useSettings();

  const getDrawerWidth = useMemo(() => {
    return isLargeScreen && !isDrawerShouldHide ? 320 : 0;
  }, [isLargeScreen, isDrawerShouldHide]);

  useLayoutEffect(() => {
    const animConfig =
      Platform.OS === 'ios'
        ? LayoutAnimation.create(300, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.scaleXY)
        : LayoutAnimation.Presets.easeInEaseOut;

    LayoutAnimation.configureNext(animConfig);
  }, [isDrawerShouldHide]);

  const drawerStyle: DrawerNavigationOptions = useMemo(
    () => ({
      drawerPosition: I18nManager.isRTL ? 'right' : 'left',
      drawerStyle: {
        width: getDrawerWidth,
        height: '100%',
      },
      drawerType: isLargeScreen ? 'permanent' : 'front',
      overlayColor: 'rgba(0,0,0,0.4)',
      swipeEnabled: !isDrawerShouldHide,
      drawerStatusBarAnimation: 'fade',
      ...getAnimationConfig(true),
    }),
    [getDrawerWidth, isDrawerShouldHide, isLargeScreen],
  );

  return (
    <Drawer.Navigator screenOptions={drawerStyle} drawerContent={DrawerContent} initialRouteName="DetailViewStackScreensStack">
      <Drawer.Screen name="DetailViewStackScreensStack" component={DetailViewStackScreensStack} options={{ headerShown: false }} />
    </Drawer.Navigator>
  );
};

export default DrawerRoot;
