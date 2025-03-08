type MenuActionHandler = () => void;

interface MenuElementsHook {
  registerTransactionsHandler: (handler: MenuActionHandler, screenKey?: string) => boolean;
  unregisterTransactionsHandler: (screenKey: string) => void;
  isMenuElementsSupported: boolean;
}

const useMenuElements = (): MenuElementsHook => ({
  registerTransactionsHandler: () => false,
  unregisterTransactionsHandler: () => {},
  isMenuElementsSupported: false,
});

export default useMenuElements;
