import { useCallback, useLayoutEffect, useRef } from 'react';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import type { MenuActionHandlers, ScreenMenuAction } from '../blue_modules/menuActions';
import useMenuElements from './useMenuElements';

// Only the focused route owns commands. Proxies always call the latest committed handlers.
export default function useScreenMenuActions(handlers: MenuActionHandlers) {
  const route = useRoute();
  const { registerMenuActions } = useMenuElements();
  const latest = useRef(handlers);
  useLayoutEffect(() => {
    latest.current = handlers;
  });
  const enabledActions = (Object.keys(handlers) as ScreenMenuAction[])
    .filter(action => !!handlers[action])
    .sort()
    .join(',');
  useFocusEffect(
    useCallback(() => {
      const proxies: MenuActionHandlers = {};
      for (const action of enabledActions.split(',').filter(Boolean) as ScreenMenuAction[]) {
        proxies[action] = () => latest.current[action]?.();
      }
      return registerMenuActions(proxies, route.key);
    }, [enabledActions, registerMenuActions, route.key]),
  );
}
