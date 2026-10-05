import { useCallback } from 'react';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { usesHeaderMenu } from '../components/HeaderMenu';
import type { HeaderMenuEntry } from '../blue_modules/headerMenuActions';
import useMenuElements from './useMenuElements';

/** Adds screen commands without replacing menu options owned by its navigator. */
export default function useScreenHeaderMenu(actions: HeaderMenuEntry[]) {
  const { key } = useRoute();
  const { registerHeaderMenu } = useMenuElements();
  useFocusEffect(
    useCallback(() => {
      if (!usesHeaderMenu) return;
      return registerHeaderMenu(actions, key);
    }, [actions, key, registerHeaderMenu]),
  );
}
