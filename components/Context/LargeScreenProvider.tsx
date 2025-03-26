import React, { createContext, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, AppStateStatus, Dimensions, Platform, useWindowDimensions } from 'react-native';
import { isDesktop } from '../../blue_modules/environment';

interface ILargeScreenContext {
  isLargeScreen: boolean;
}

const DRAWER_WIDTH = 320;
const MIN_CONTENT_WIDTH = 375;
const MIN_CONTENT_HEIGHT_PORTRAIT = 500; // Height requirement in portrait mode
const MIN_CONTENT_HEIGHT_LANDSCAPE = 400;
const REQUIRED_WIDTH = DRAWER_WIDTH + MIN_CONTENT_WIDTH;
const WIDE_SCREEN_RATIO = 2.0; // Width/height ratio that indicates a wide screen (typical for large phones in landscape)

const useLargeScreenDetection = () => {
  const dimensions = useWindowDimensions();
  const previousValidWidthRef = useRef<number>(dimensions.width || 500);
  const previousValidHeightRef = useRef<number>(dimensions.height || 800);
  const [dimensionState, setDimensionState] = useState({
    width: dimensions.width,
    height: dimensions.height,
  });

  useEffect(() => {
    const handleDimensionChange = ({ window }: { window: { width: number; height: number } }) => {
      console.debug('[LargeScreen] Dimension changed:', window.width, window.height);
      setDimensionState({ width: window.width, height: window.height });
    };

    const dimensionSubscription = Dimensions.addEventListener('change', handleDimensionChange);

    return () => {
      dimensionSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (dimensions.width > 0 && dimensions.height > 0) {
      previousValidWidthRef.current = dimensions.width;
      previousValidHeightRef.current = dimensions.height;
      console.debug('[LargeScreen] Valid dimensions update:', dimensions.width, dimensions.height);
    }
  }, [dimensions.width, dimensions.height]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        const currentDimensions = Dimensions.get('window');
        console.debug('[LargeScreen] App active, dimension check:', currentDimensions.width, currentDimensions.height);

        if (currentDimensions.width > 0 && currentDimensions.height > 0) {
          previousValidWidthRef.current = currentDimensions.width;
          previousValidHeightRef.current = currentDimensions.height;
          setDimensionState({
            width: currentDimensions.width,
            height: currentDimensions.height,
          });
        }
      } else {
        console.debug('[LargeScreen] App state changed to:', nextAppState);
      }
    };

    console.debug('[LargeScreen] Setting up AppState subscription');
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Trigger an initial check with current state
    handleAppStateChange(AppState.currentState);

    return () => {
      console.debug('[LargeScreen] Cleaning up AppState subscription');
      try {
        subscription.remove();
      } catch (error) {
        console.warn('[LargeScreen] Error cleaning up AppState subscription:', error);
        // Fallback for older React Native versions if needed
        try {
          // @ts-ignore - for backward compatibility
          AppState.removeEventListener?.('change', handleAppStateChange);
        } catch (fallbackError) {
          console.error('[LargeScreen] Failed to clean up with fallback:', fallbackError);
        }
      }
    };
  }, []);

  const isLargeScreen = useMemo(() => {
    // Prioritize the state from dimension changes for more reliable rotation support
    const effectiveWidth =
      dimensionState.width > 0 ? dimensionState.width : dimensions.width > 0 ? dimensions.width : previousValidWidthRef.current;

    const effectiveHeight =
      dimensionState.height > 0 ? dimensionState.height : dimensions.height > 0 ? dimensions.height : previousValidHeightRef.current;

    // For rotation cases, always use the larger dimension as "width" and smaller as "height"
    const largerDimension = Math.max(effectiveWidth, effectiveHeight);
    const smallerDimension = Math.min(effectiveWidth, effectiveHeight);

    // In portrait, width is smaller; in landscape, height is smaller
    const isLandscape = effectiveWidth > effectiveHeight;

    // Calculate screen ratio - wide screens like large phones in landscape have high ratios
    const screenRatio = largerDimension / smallerDimension;
    const isWideScreen = screenRatio >= WIDE_SCREEN_RATIO;

    // Use different height requirements based on orientation
    const minRequiredHeight = isLandscape ? MIN_CONTENT_HEIGHT_LANDSCAPE : MIN_CONTENT_HEIGHT_PORTRAIT;

    if (smallerDimension <= 375) {
      console.debug(`[LargeScreen] Smaller dimension ${smallerDimension} <= 375, forcing isLargeScreen=false`);
      return false;
    }

    // Special case for large phones in landscape mode (wide screens)
    // They typically have plenty of width but might be slightly short on height
    const isLargeLandscapePhone =
      isLandscape &&
      isWideScreen &&
      largerDimension >= 900 && // Common for large phone models in landscape
      smallerDimension >= 400; // Still need reasonable height

    // For proper drawer display, require adequate width and height
    const hasAdequateWidth = largerDimension >= REQUIRED_WIDTH;
    const hasAdequateHeight = smallerDimension >= minRequiredHeight;

    const isTabletOrDesktop = Platform.OS === 'ios' ? Platform.isPad || isDesktop : false;
    const defaultValue = isTabletOrDesktop;

    // Consider a device "large screen" if:
    // 1. It has adequate width AND adequate height, OR
    // 2. It's a large phone in landscape mode with sufficient dimensions, OR
    // 3. It's a tablet/desktop by platform detection
    const result = (hasAdequateWidth && hasAdequateHeight) || isLargeLandscapePhone || defaultValue;

    console.debug(
      `[LargeScreen] Calculation:`,
      `dimensions=${effectiveWidth}x${effectiveHeight}`,
      `isLandscape=${isLandscape}`,
      `screenRatio=${screenRatio.toFixed(2)}`,
      `isWideScreen=${isWideScreen}`,
      `largerDim=${largerDimension}`,
      `smallerDim=${smallerDimension}`,
      `requiredWidth=${REQUIRED_WIDTH}`,
      `requiredHeight=${minRequiredHeight}`,
      `hasWidth=${hasAdequateWidth}`,
      `hasHeight=${hasAdequateHeight}`,
      `isLargeLandscapePhone=${isLargeLandscapePhone}`,
      `result=${result}`,
      `default=${defaultValue}`,
    );

    return result;
  }, [dimensions.width, dimensions.height, dimensionState.width, dimensionState.height]);

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
