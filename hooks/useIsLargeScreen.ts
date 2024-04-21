import { useState, useEffect, useMemo } from 'react';
import { Dimensions } from 'react-native';
import { isTablet } from 'react-native-device-info';

// Custom hook to determine if the screen is large
export const useIsLargeScreen = () => {
  const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width);
  const screenWidth = useMemo(() => Dimensions.get('screen').width, []);

  useEffect(() => {
    const updateScreenUsage = () => {
      const newWindowWidth = Dimensions.get('window').width;
      if (newWindowWidth !== windowWidth) {
        console.log(`Window width changed: ${newWindowWidth}`);
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
    // we dont want to return true on phones. only on tablets for now
    const isRunningOnTablet = isTablet();
    const halfScreenWidth = windowWidth >= screenWidth / 2;
    const condition = isRunningOnTablet && halfScreenWidth;
    console.log(
      `Window width: ${windowWidth}, Screen width: ${screenWidth}, Is tablet or desktop: ${isRunningOnTablet}, Is large screen: ${condition}`,
    );
    return condition;
  }, [windowWidth, screenWidth]);

  return isLargeScreen;
};
