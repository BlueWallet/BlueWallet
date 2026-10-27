import { useCallback } from 'react';
import type { MenuActionHandlers, MenuActionStates } from '../blue_modules/menuActions';

// Platforms without a native menu module.
const useMenuActions = () => {
  const registerMenuActions = useCallback(
    (_handlers: MenuActionHandlers, _screenKey: string, _states?: MenuActionStates): (() => void) =>
      () => {},
    [],
  );
  return { registerMenuActions, isMenuActionsSupported: false };
};
export default useMenuActions;
