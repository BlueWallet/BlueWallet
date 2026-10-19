import { useCallback } from 'react';
import type { MenuActionHandlers } from '../blue_modules/menuActions';

// Platforms without a native menu module.
const useMenuElements = () => {
  const registerMenuActions = useCallback(
    (_handlers: MenuActionHandlers, _screenKey: string): (() => void) =>
      () => {},
    [],
  );
  return { registerMenuActions, isMenuElementsSupported: false };
};
export default useMenuElements;
