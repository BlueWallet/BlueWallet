import { useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';

export const useIsLargeScreen = () => {
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const dimensions = useWindowDimensions();

  useEffect(() => {
    setIsLargeScreen(dimensions.width >= 768);
  }, [dimensions]);

  return { isLargeScreen };
};
