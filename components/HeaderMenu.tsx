import React, { useCallback, useMemo } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import AndroidHeaderMenuBar from './AndroidHeaderMenuBar';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { isDesktop, isTablet } from '../blue_modules/environment';
import type { HeaderMenuEntry, HeaderMenuOptions } from '../blue_modules/headerMenuActions';
import useMenuElements from '../hooks/useMenuElements';

export type HeaderMenuAction = HeaderMenuEntry & { onPress: () => void };
export const usesHeaderMenu = Platform.OS === 'android' || isTablet || isDesktop;
export const keepNativeHeaderRightItems = Platform.OS !== 'android' && isTablet && !isDesktop;

export const getHeaderMenuOptions = (
  phoneOptions: NativeStackNavigationOptions,
  actions: HeaderMenuAction[],
): NativeStackNavigationOptions & HeaderMenuOptions =>
  usesHeaderMenu
    ? {
        ...phoneOptions,
        headerMenuActions: actions,
        ...(keepNativeHeaderRightItems ? {} : { headerRight: undefined, unstable_headerRightItems: undefined }),
      }
    : phoneOptions;

/** Registers screen actions in the system menu without rendering a header control. */
const HeaderMenu = ({
  options,
  routeKey,
  children,
}: {
  options: NativeStackNavigationOptions & HeaderMenuOptions;
  routeKey: string;
  children: React.ReactElement;
}) => {
  const { registerHeaderMenu } = useMenuElements();
  const actions = useMemo(() => {
    const entries = options.headerMenuActions ?? [];
    if (!options.headerMenuCloseAction) return entries;
    return Array.isArray(entries[0])
      ? [...(entries as HeaderMenuEntry[][]), [options.headerMenuCloseAction]]
      : [...(entries as HeaderMenuEntry[]), options.headerMenuCloseAction];
  }, [options.headerMenuActions, options.headerMenuCloseAction]);
  // Re-sync when the route regains focus, including returning from a nested stack.
  useFocusEffect(
    useCallback(() => {
      if (!usesHeaderMenu) return;
      return registerHeaderMenu(actions ?? [], routeKey);
    }, [actions, registerHeaderMenu, routeKey]),
  );
  if (Platform.OS === 'android' && usesHeaderMenu && options.headerShown !== false) {
    return (
      <View style={styles.container}>
        <AndroidHeaderMenuBar routeKey={routeKey} />
        {children}
      </View>
    );
  }
  return children;
};

export const headerMenuScreenLayout = ({
  options,
  route,
  children,
}: {
  options: NativeStackNavigationOptions;
  route: { key: string };
  children: React.ReactElement;
}) =>
  usesHeaderMenu ? (
    <HeaderMenu options={options} routeKey={route.key}>
      {children}
    </HeaderMenu>
  ) : (
    children
  );
export default HeaderMenu;

const styles = StyleSheet.create({ container: { flex: 1 } });
