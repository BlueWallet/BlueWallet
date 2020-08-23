import React, { createContext, useState, useEffect, useRef, useCallback } from 'react';

export const BlueGlobalMessageType = {
  ERROR: 'ERROR',
  SUCCESS: 'SUCCESS',
  WARNING: 'WARNING',
  LOADING: 'LOADING',
};

const initialMessage = {
  message: '',
  visible: false,
  dismissable: true,
  type: BlueGlobalMessageType.LOADING,
};

export const BlueGlobalMessageContext = createContext({});

// eslint-disable-next-line react/prop-types
export const BlueGlobalMessageProvider = ({ children }) => {
  const [container, setContainer] = useState(initialMessage);
  const timeout = useRef();

  const show = useCallback(args => {
    setContainer({ ...initialMessage, visible: true, ...args });
  }, []);

  const hide = useCallback(() => {
    setContainer({ ...container, visible: false, dismissable: true });
  }, [container]);

  useEffect(() => {
    if (container.visible) {
      if (container.dismissable) {
        timeout.current = setTimeout(hide, 1500);
      } else {
        clearTimeout(timeout.current);
      }
      return () => {
        if (timeout.current) {
          clearTimeout(timeout.current);
        }
      };
    }
  }, [hide, container]);

  return (
    <BlueGlobalMessageContext.Provider
      value={{
        hide,
        show,
        container,
      }}
    >
      {children}
    </BlueGlobalMessageContext.Provider>
  );
};
