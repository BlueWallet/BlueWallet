type MenuActionHandler = () => void;

interface MenuElementsHook {
  registerTransactionsHandler: (handler: MenuActionHandler, screenKey?: string) => boolean;
  unregisterTransactionsHandler: (screenKey: string) => void;
  isMenuElementsSupported: boolean;
}

declare const useMenuElements: () => MenuElementsHook;

export default useMenuElements;
