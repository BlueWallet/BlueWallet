import React, { createContext, ReactNode, useEffect, useMemo, useState } from 'react';
import { Dimensions, ScaledSize } from 'react-native';

interface ILargeScreenContext {
  isLargeScreen: boolean;
  setIsLargeScreen: React.Dispatch<React.SetStateAction<boolean | undefined>>;
}

const useScreenDimensions = () => {
  const [metrics, setMetrics] = useState(() => ({
    window: Dimensions.get('window'),
    screen: Dimensions.get('screen'),
  }));

  useEffect(() => {
    const onChange = ({ window, screen }: { window: ScaledSize; screen: ScaledSize }) => {
      setMetrics({ window, screen });
    };

    const subscription = Dimensions.addEventListener('change', onChange);

    // Force an initial metrics check
    onChange({
      window: Dimensions.get('window'),
      screen: Dimensions.get('screen'),
    });

    return () => subscription.remove();
  }, []);

  return metrics;
};

const useLargeScreen = (initialValue?: boolean) => {
  const { window: dimensions } = useScreenDimensions();
  const [overrideValue, setIsLargeScreen] = useState<boolean | undefined>(initialValue);

  const isLargeScreen = useMemo(() => {
    if (overrideValue !== undefined) return overrideValue;

    const DRAWER_WIDTH = 320;
    const MIN_CONTENT_WIDTH = 375;
    const REQUIRED_WIDTH = DRAWER_WIDTH + MIN_CONTENT_WIDTH;

    return dimensions.width >= REQUIRED_WIDTH;
  }, [dimensions.width, overrideValue]);

  return { isLargeScreen, setIsLargeScreen };
};

type LargeScreenProviderProps = {
  children: ReactNode;
};

export const LargeScreenContext = createContext<ILargeScreenContext | undefined>(undefined);

export const LargeScreenProvider: React.FC<LargeScreenProviderProps> = ({ children }) => {
  const contextValue = useLargeScreen();

  return <LargeScreenContext.Provider value={contextValue}>{children}</LargeScreenContext.Provider>;
};

export { useLargeScreen };
