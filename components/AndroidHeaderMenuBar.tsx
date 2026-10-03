import React, { useState, useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { navigationRef } from '../NavigationService';
import MenuElementsEmitter from '../blue_modules/NativeMenuElementsEmitter';
import loc from '../loc';
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

/** Touch and keyboard access to Android's options menu, outside the right header. */
export default function AndroidHeaderMenuBar({ routeKey }: { routeKey: string }) {
  const currentKey = useSyncExternalStore(subscribe, activeRouteKey, activeRouteKey);
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  // Only the leaf screen shows a strip; nested navigators must not duplicate it.
  if (currentKey !== routeKey || !MenuElementsEmitter) return null;
  return (
    <View style={[styles.bar, { backgroundColor: colors.background, borderBottomColor: colors.lightBorder }]}>
      <Pressable
        onPress={() => MenuElementsEmitter?.openMenu()}
        accessibilityRole="button"
        accessibilityLabel={loc._.menu_open}
        accessibilityHint={loc._.menu_open_hint}
        focusable
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        android_ripple={{ color: colors.lightButton }}
        testID="AndroidAppMenuButton"
        nativeID="AndroidAppMenuAnchor"
        style={[styles.button, focused && { borderColor: colors.foregroundColor }]}
      >
        <Text style={[styles.label, { color: colors.foregroundColor }]}>{loc._.menu_open}</Text>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  bar: { borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, alignItems: 'flex-start' },
  button: {
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 6,
  },
  label: { fontSize: 16, fontWeight: '500' },
});
