import { useCallback } from 'react';

type MenuActionHandler = () => void;

interface MenuElementsHook {
  registerTransactionsHandler: (handler: MenuActionHandler, screenKey?: string) => boolean;
  unregisterTransactionsHandler: (screenKey: string) => void;
  isMenuElementsSupported: boolean;
}

// Default implementation for platforms other than iOS
const useMenuElements = (): MenuElementsHook => {
  const registerTransactionsHandler = useCallback((_handler: MenuActionHandler, _screenKey?: string): boolean => {
    // Non-functional stub for non-iOS platforms
    return false;
  }, []);

  const unregisterTransactionsHandler = useCallback((_screenKey: string): void => {
    // No-op for non-supported platforms
  }, []);

  return {
    registerTransactionsHandler,
    unregisterTransactionsHandler,
    isMenuElementsSupported: false, // Not supported on platforms other than iOS
  };
};

export default useMenuElements;
