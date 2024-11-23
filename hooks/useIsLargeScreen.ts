import { useEffect, useMemo, useState } from 'react';
import { useWindowDimensions } from 'react-native';

const LARGE_SCREEN_BREAKPOINT = 768;
export const useIsLargeScreen = () => {
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const dimensions = useWindowDimensions();
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setIsLargeScreen(dimensions.width >= LARGE_SCREEN_BREAKPOINT);
    }, 150);
    return () => clearTimeout(timeoutId);
  }, [dimensions]);
  return useMemo(() => ({ isLargeScreen }), [isLargeScreen]);
};