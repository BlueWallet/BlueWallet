import { useCallback, useLayoutEffect, useRef } from 'react';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import type { MenuActionHandlers, MenuActionStates, ScreenMenuAction } from '../blue_modules/menuActions';
import useMenuActions from './useMenuActions';
import { RecentMenuItem, recordRecentMenuItem } from '../components/Context/recentMenuItems';

// Only the focused route owns commands. Proxies always call the latest committed handlers.
export default function useScreenMenuActions(handlers: MenuActionHandlers, recentItem?: RecentMenuItem, states: MenuActionStates = {}) {
  const route = useRoute();
  const { registerMenuActions } = useMenuActions();
  const latest = useRef(handlers);
  useLayoutEffect(() => {
    latest.current = handlers;
  });
  const enabledActions = (Object.keys(handlers) as ScreenMenuAction[])
    .filter(action => !!handlers[action])
    .sort()
    .join(',');
  const actionStates = JSON.stringify(states);
  useFocusEffect(
    useCallback(() => {
      const proxies: MenuActionHandlers = {};
      for (const action of enabledActions.split(',').filter(Boolean) as ScreenMenuAction[]) {
        proxies[action] = () => latest.current[action]?.();
      }
      if (recentItem) recordRecentMenuItem(recentItem);
      return registerMenuActions(proxies, route.key, JSON.parse(actionStates) as MenuActionStates);
    }, [actionStates, enabledActions, recentItem, registerMenuActions, route.key]),
  );
}
