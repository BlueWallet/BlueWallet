import { useState, useEffect, useMemo } from 'react';
import { Dimensions } from 'react-native';
import { isTablet } from 'react-native-device-info';
import { isDesktop } from '../blue_modules/environment';

// Custom hook to determine if the screen is large
export const useIsLargeScreen = () => {
  const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width);
  const screenWidth = useMemo(() => Dimensions.get('screen').width, []);

  useEffect(() => {
    const updateScreenUsage = () => {
      const newWindowWidth = Dimensions.get('window').width;
      if (newWindowWidth !== windowWidth) {
        console.debug(`Window width changed: ${newWindowWidth}`);
        setWindowWidth(newWindowWidth);
      }
    };

    // Add event listener for dimension changes
    const subscription = Dimensions.addEventListener('change', updateScreenUsage);

    // Cleanup function to remove the event listener
    return () => {
      subscription.remove();
    };
  }, [windowWidth]);

  // Determine if the window width is at least half of the screen width
  const isLargeScreen = useMemo(() => {
    const isRunningOnTabletOrDesktop = isTablet() || isDesktop;
    const halfScreenWidth = windowWidth >= screenWidth / 2;
    const condition = isRunningOnTabletOrDesktop && halfScreenWidth;
    console.debug(
      `Window width: ${windowWidth}, Screen width: ${screenWidth}, Is tablet: ${isRunningOnTabletOrDesktop}, Is large screen: ${condition}`,
    );
    return condition;
  }, [windowWidth, screenWidth]);

  return isLargeScreen;
};
