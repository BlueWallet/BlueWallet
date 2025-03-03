import { useCallback } from 'react';
import { ActionHandler, MenuActionType } from './useMenuElements.common';


const useMenuElements = () => {
  const setActionHandler = useCallback((_actionType: MenuActionType, _handler: ActionHandler) => {}, []);

  const clearActionHandler = useCallback((_actionType: MenuActionType) => {}, []);

  return {
    setActionHandler,
    clearActionHandler,
    MenuActionType,
    isMenuElementsSupported: false,
  };
};

export default useMenuElements;
