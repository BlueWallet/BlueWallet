import React, { createContext, ReactNode, useEffect, useMemo, useRef } from 'react';
import { AppState, AppStateStatus, Dimensions, Platform, useWindowDimensions } from 'react-native';
import { isDesktop } from '../../blue_modules/environment';

interface ILargeScreenContext {
  isLargeScreen: boolean;
}

const DRAWER_WIDTH = 320;
const MIN_CONTENT_WIDTH = 375;
const REQUIRED_WIDTH = DRAWER_WIDTH + MIN_CONTENT_WIDTH;

const useLargeScreenDetection = () => {
  const dimensions = useWindowDimensions();
  const previousValidWidthRef = useRef<number>(dimensions.width || 500);

  useEffect(() => {
    if (dimensions.width > 0) {
      previousValidWidthRef.current = dimensions.width;
      console.debug('[LargeScreen] Valid width update:', dimensions.width);
    }
  }, [dimensions.width]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        const currentDimensions = Dimensions.get('window');
        console.debug('[LargeScreen] App active, dimension check:', currentDimensions.width);

        if (currentDimensions.width > 0) {
          previousValidWidthRef.current = currentDimensions.width;
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  const isLargeScreen = useMemo(() => {
    const effectiveWidth = dimensions.width > 0 ? dimensions.width : previousValidWidthRef.current;

    if (effectiveWidth <= 375) {
      console.debug(`[LargeScreen] Width ${effectiveWidth} <= 375, forcing isLargeScreen=false`);
      return false;
    }

    const isTabletOrDesktop = Platform.OS === 'ios' ? Platform.isPad || isDesktop : false;
    const defaultValue = isTabletOrDesktop;

    const result = effectiveWidth >= REQUIRED_WIDTH || defaultValue;

    console.debug(
      `[LargeScreen] Calculation:`,
      `width=${effectiveWidth}`,
      `required=${REQUIRED_WIDTH}`,
      `result=${result}`,
      `default=${defaultValue}`,
    );

    return result;
  }, [dimensions.width]);

  return { isLargeScreen };
};

type LargeScreenProviderProps = {
  children: ReactNode;
};

export const LargeScreenContext = createContext<ILargeScreenContext>({
  isLargeScreen: false,
});

export const LargeScreenProvider: React.FC<LargeScreenProviderProps> = ({ children }) => {
  const { isLargeScreen } = useLargeScreenDetection();

  const contextValue = useMemo(() => ({ isLargeScreen }), [isLargeScreen]);

  return <LargeScreenContext.Provider value={contextValue}>{children}</LargeScreenContext.Provider>;
};
