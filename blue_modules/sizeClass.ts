import { Dimensions, Platform, AppState, AppStateStatus } from 'react-native';
import { useState, useEffect } from 'react';
import { isDesktop } from './environment';

// Size class definitions following iOS conventions
export enum SizeClass {
  Compact, // Small size (iPhone width or height in landscape)
  Regular, // Standard size (iPad, or iPhone height in portrait)
  Large, // Additional size for larger screens (not in iOS, but useful for our app)
}

// Interface for the result of getSizeClass
export interface SizeClassInfo {
  // Size classes
  horizontalSizeClass: SizeClass;
  verticalSizeClass: SizeClass;

  // Overall size class (derived from horizontal and vertical)
  sizeClass: SizeClass;

  // Orientation
  orientation: 'portrait' | 'landscape';

  // Helper properties
  isCompact: boolean;
  isLarge: boolean;

  // Legacy support
  isLargeScreen: boolean;
}

/**
 * Get current size class information based on device dimensions
 */
export function getSizeClass(): SizeClassInfo {
  // Get device dimensions
  const { width, height } = Dimensions.get('window');
  const isLandscape = width > height;
  const orientation = isLandscape ? 'landscape' : 'portrait';

  // Determine horizontal size class (following iOS conventions)
  let horizontalSizeClass: SizeClass;

  if (Platform.OS === 'ios' && Platform.isPad) {
    // iPads always have Regular width
    horizontalSizeClass = SizeClass.Regular;
  } else if (isDesktop) {
    // Desktop systems get Large width
    horizontalSizeClass = SizeClass.Large;
  } else if (isLandscape && width >= 667) {
    // iPhone Plus models (and modern equivalent sizes) in landscape: Regular width
    // 667 points corresponds roughly to iPhone Plus models
    horizontalSizeClass = SizeClass.Regular;
  } else {
    // Regular iPhones: Compact width
    horizontalSizeClass = SizeClass.Compact;
  }

  // Determine vertical size class (following iOS conventions)
  let verticalSizeClass: SizeClass;

  if (Platform.OS === 'ios' && Platform.isPad) {
    // iPads always have Regular height
    verticalSizeClass = SizeClass.Regular;
  } else if (isDesktop) {
    // Desktop systems get Large height
    verticalSizeClass = SizeClass.Large;
  } else if (isLandscape) {
    // All iPhones in landscape: Compact height
    verticalSizeClass = SizeClass.Compact;
  } else {
    // iPhones in portrait: Regular height
    verticalSizeClass = SizeClass.Regular;
  }

  // Derive overall size class - simplified logic to avoid redundant comparisons
  let sizeClass: SizeClass;

  if (horizontalSizeClass === SizeClass.Compact) {
    // If width is compact, overall is compact
    sizeClass = SizeClass.Compact;
  } else {
    // Otherwise, width is Regular or Large, so overall is Large
    // (per requirements that any non-Compact width device is considered Large)
    sizeClass = SizeClass.Large;
  }

  // Determine isLargeScreen property (true for Regular and Large widths)
  const isLargeScreen = horizontalSizeClass !== SizeClass.Compact;

  return {
    horizontalSizeClass,
    verticalSizeClass,
    sizeClass,
    orientation,
    isCompact: sizeClass === SizeClass.Compact,
    isLarge: sizeClass === SizeClass.Large,
    isLargeScreen,
  };
}

/**
 * React hook to use size classes in components
 */
export function useSizeClass(): SizeClassInfo {
  const [sizeClassInfo, setSizeClassInfo] = useState<SizeClassInfo>(getSizeClass());

  useEffect(() => {
    // Update size class when dimensions change
    const updateSizeClass = () => {
      const newInfo = getSizeClass();
      setSizeClassInfo(newInfo);
      console.debug(
        `[SizeClass] Updated:`,
        `horizontal=${SizeClass[newInfo.horizontalSizeClass]}`,
        `vertical=${SizeClass[newInfo.verticalSizeClass]}`,
        `orientation=${newInfo.orientation}`,
        `isLargeScreen=${newInfo.isLargeScreen}`,
      );
    };

    const dimensionSubscription = Dimensions.addEventListener('change', updateSizeClass);

    // Also update when app becomes active
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        updateSizeClass();
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    // Clean up
    return () => {
      dimensionSubscription.remove();
      appStateSubscription.remove();
    };
  }, []);

  return sizeClassInfo;
}
