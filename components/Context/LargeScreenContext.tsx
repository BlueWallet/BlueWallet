import React, { createContext, ReactNode, useEffect, useState } from 'react';
import useOrientationManager from '../../hooks/useOrientationManager';

interface ILargeScreenContext {
  initialSizeClass: boolean;
  isLargeScreen: boolean;
}

export const LargeScreenContext = createContext<ILargeScreenContext | undefined>(undefined);

interface LargeScreenProviderProps {
  children: ReactNode;
}

export const LargeScreenProvider: React.FC<LargeScreenProviderProps> = ({ children }) => {
  const initialSizeClass = useOrientationManager();
  const [isLargeScreen, setIsLargeScreen] = useState<boolean>(initialSizeClass);

  useEffect(() => {
    setIsLargeScreen(initialSizeClass);
  }, [initialSizeClass]);

  return <LargeScreenContext.Provider value={{ initialSizeClass, isLargeScreen }}>{children}</LargeScreenContext.Provider>;
};
