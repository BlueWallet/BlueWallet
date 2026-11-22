import { createDrawerNavigator, DrawerNavigationOptions, DrawerContentComponentProps } from '@react-navigation/drawer';
import { useLocale } from '@react-navigation/native';
import React, { useEffect, useMemo } from 'react';
import { Animated, Easing, useWindowDimensions } from 'react-native';
import { useSizeClass, SizeClass } from '../blue_modules/sizeClass';
import DrawerList from '../screen/wallets/DrawerList';
import HomeWalletsPanel from '../components/home/HomeWalletsPanel';
import DetailViewStackScreensStack from './DetailViewScreensStack';
import { DrawerParamList } from './DrawerParamList';
import useCompanionListeners from '../hooks/useCompanionListeners';
import useNeuraiConnect from '../hooks/useNeuraiConnect';

const Drawer = createDrawerNavigator<DrawerParamList>();

// Tablets keep the permanent wallet list; phones get the home's wallet panel,
// opened from the wallet name at the top of the home.
const DrawerContent = (props: DrawerContentComponentProps) => {
  const { isLargeScreen } = useSizeClass();
  return isLargeScreen ? <DrawerList {...props} /> : <HomeWalletsPanel {...props} />;
};

/** Rounded on the side that faces the screen. */
const PANEL_RADIUS = 28;

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
  const { width: windowWidth } = useWindowDimensions();
  useCompanionListeners();
  // Mounted here, once: the Connect client has to outlive every screen so a
  // request that arrives between two screens still finds a listener.
  useNeuraiConnect();

  const getDrawerWidth = useMemo(() => {
    switch (sizeClass) {
      case SizeClass.Large:
        return 320;
      default:
        // The wallet panel: most of the width, the home still peeking out beside it.
        return Math.min(Math.round(windowWidth * 0.84), 340);
    }
  }, [sizeClass, windowWidth]);

  const drawerStyle: DrawerNavigationOptions = useMemo(
    () => ({
      drawerPosition: direction === 'rtl' ? 'right' : 'left',
      drawerStyle: {
        width: getDrawerWidth,
        height: '100%',
        ...(isLargeScreen
          ? null
          : direction === 'rtl'
            ? { borderTopLeftRadius: PANEL_RADIUS, borderBottomLeftRadius: PANEL_RADIUS, overflow: 'hidden' as const }
            : { borderTopRightRadius: PANEL_RADIUS, borderBottomRightRadius: PANEL_RADIUS, overflow: 'hidden' as const }),
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
