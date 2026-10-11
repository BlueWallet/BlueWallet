import React, { useSyncExternalStore } from 'react';
import { StyleSheet } from 'react-native';
import { navigationRef } from '../NavigationService';
import MenuElementsEmitter from '../blue_modules/NativeMenuElementsEmitter';
import AppMenuButton from '../codegen/AppMenuButtonNativeComponent';
import { useTheme } from './themes';

const subscribe = (callback: () => void) => {
  const state = navigationRef.addListener('state', callback);
  const ready = navigationRef.addListener('ready', callback);
  return () => {
    state();
    ready();
  };
};
const activeRouteKey = () =>
  navigationRef.isReady() && navigationRef.getCurrentRoute()?.name !== 'UnlockWithScreen'
    ? navigationRef.getCurrentRoute()?.key
    : undefined;

/** The active leaf mounts an Android button; Android handles its interaction. */
export default function AndroidHeaderMenuBar({ routeKey }: { routeKey: string }) {
  const currentKey = useSyncExternalStore(subscribe, activeRouteKey, activeRouteKey);
  const { colors } = useTheme();
  if (currentKey !== routeKey || !MenuElementsEmitter) return null;
  return (
    <AppMenuButton
      nativeID="AndroidAppMenuAnchor"
      testID="AndroidAppMenuButton"
      textColor={colors.foregroundColor}
      buttonTintColor={colors.background}
      style={styles.button}
    />
  );
}

const styles = StyleSheet.create({ button: { height: 48 } });
