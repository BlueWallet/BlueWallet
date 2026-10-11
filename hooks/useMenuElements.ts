import type { HeaderMenuEntry } from '../blue_modules/headerMenuActions';
import { useCallback } from 'react';
import type { MenuActionHandlers } from '../blue_modules/menuActions';

// Platforms without a native menu module.
const useMenuElements = () => {
  const registerMenuActions = useCallback(
    (_handlers: MenuActionHandlers, _screenKey: string): (() => void) =>
      () => {},
    [],
  );
  const registerHeaderMenu = useCallback(
    (_actions: HeaderMenuEntry[] | HeaderMenuEntry[][], _screenKey: string): (() => void) =>
      () => {},
    [],
  );
  return { registerHeaderMenu, registerMenuActions, isMenuElementsSupported: false };
};
export default useMenuElements;
