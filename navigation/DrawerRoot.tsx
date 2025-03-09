// DrawerRoot.tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React, { useLayoutEffect, useMemo } from 'react';
import { LayoutAnimation, StyleSheet, View } from 'react-native';

import { useIsLargeScreen } from '../hooks/useIsLargeScreen';
import DetailViewStackScreensStack from './DetailViewScreensStack';
import { useSettings } from '../hooks/context/useSettings';
import { useStorage } from '../hooks/context/useStorage';
import WalletsList from '../screen/wallets/WalletsList';
import CustomSideTabBar from './CustomSideTabBar';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Create a separate stack for Home tab with WalletsList
const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="WalletsListScreen" component={WalletsList} />
  </Stack.Navigator>
);

const DrawerRoot = () => {
  const { isLargeScreen } = useIsLargeScreen();
  const { isDrawerShouldHide } = useSettings();
  const { wallets } = useStorage();

  const tabBarStyle = useMemo(
    () => ({
      width: isLargeScreen && !isDrawerShouldHide ? 320 : 0,
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      height: '100%',
      zIndex: 1,
    }),
    [isDrawerShouldHide, isLargeScreen],
  );

  // Calculate left margin/padding for screens based on sidebar visibility
  const screenStyle = useMemo(
    () => ({
      marginLeft: isLargeScreen && !isDrawerShouldHide ? 320 : 0,
      flex: 1,
    }),
    [isDrawerShouldHide, isLargeScreen],
  );

  useLayoutEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [isDrawerShouldHide]);

  // Always start with DetailViewStackScreensStack as initial - it contains WalletsList
  const initialRouteName = "DetailViewStackScreensStack";

  return (
    <View style={styles.container}>
      {/* Sidebar */}
      {isLargeScreen && !isDrawerShouldHide && (
        <View style={[styles.sidebar, tabBarStyle]}>
          <CustomSideTabBar isStandalone={true} />
        </View>
      )}
      
      {/* Main content */}
      <View style={screenStyle}>
        <DetailViewStackScreensStack />
      </View>
    </View>
  );
};

export default DrawerRoot;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    borderRightWidth: 1,
    borderRightColor: '#e2e2e2',
  }
});
