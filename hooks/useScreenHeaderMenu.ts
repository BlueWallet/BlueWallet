import { useCallback } from 'react';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { Platform } from 'react-native';
import { isTablet, isDesktop } from '../blue_modules/environment';
import type { HeaderMenuEntry } from '../blue_modules/headerMenuActions';
import useMenuElements from './useMenuElements';

/** Adds screen commands without replacing menu options owned by its navigator. */
export default function useScreenHeaderMenu(actions: HeaderMenuEntry[] | HeaderMenuEntry[][], routeKey?: string) {
  const route = useRoute();
  const key = routeKey ?? route.key;
  const { registerHeaderMenu } = useMenuElements();
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android' && !isTablet && !isDesktop) return;
      return registerHeaderMenu(actions, key);
    }, [actions, key, registerHeaderMenu]),
  );
}
