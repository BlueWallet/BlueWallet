import React, { createContext, ReactNode, useEffect, useMemo, useState } from 'react';
import { Dimensions } from 'react-native';

import { isDesktop, isTablet } from '../../blue_modules/environment';

type ScreenSize = 'Handheld' | 'LargeScreen' | undefined;

interface ILargeScreenContext {
  isLargeScreen: boolean;
  setLargeScreenValue: (value: ScreenSize) => void;
}

export const LargeScreenContext = createContext<ILargeScreenContext | undefined>(undefined);

interface LargeScreenProviderProps {
  children: ReactNode;
}

export const LargeScreenProvider: React.FC<LargeScreenProviderProps> = ({ children }) => {
  const [windowWidth, setWindowWidth] = useState<number>(Dimensions.get('window').width);
  const [largeScreenValue, setLargeScreenValue] = useState<ScreenSize>(undefined);

  useEffect(() => {
    const updateScreenUsage = (): void => {
      const newWindowWidth = Dimensions.get('window').width;
      if (newWindowWidth !== windowWidth) {
        setWindowWidth(newWindowWidth);
      }
    };

    const subscription = Dimensions.addEventListener('change', updateScreenUsage);
    return () => subscription.remove();
  }, [windowWidth]);

  const isLargeScreen: boolean = useMemo(() => {
    if (largeScreenValue === 'LargeScreen') {
      return true;
    } else if (largeScreenValue === 'Handheld') {
      return false;
    }
    const screenWidth: number = Dimensions.get('screen').width;
    const halfScreenWidth = windowWidth >= screenWidth / 2;
    return (isTablet && halfScreenWidth) || isDesktop;
  }, [windowWidth, largeScreenValue]);

  const contextValue = useMemo(
    () => ({
      isLargeScreen,
      setLargeScreenValue,
    }),
    [isLargeScreen, setLargeScreenValue],
  );

  return <LargeScreenContext.Provider value={contextValue}>{children}</LargeScreenContext.Provider>;
};
