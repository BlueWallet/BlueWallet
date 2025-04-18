import React, { createContext, ReactNode, useEffect, useMemo, useState } from 'react';
import { Dimensions, Platform, useWindowDimensions } from 'react-native';
import { isDesktop, isTablet } from '../../blue_modules/environment';
import useAppState from '../../hooks/useAppState';

export enum SizeClass {
  Compact,
  Regular,
  Large,
}

interface ISizeClassContext {
  sizeClass: SizeClass;
  horizontalSizeClass: SizeClass;
  verticalSizeClass: SizeClass;
  orientation: 'portrait' | 'landscape';
}

const useSizeClassDetection = () => {
  const dimensions = useWindowDimensions();
  const [horizontalSizeClass, setHorizontalSizeClass] = useState<SizeClass>(SizeClass.Regular);
  const [verticalSizeClass, setVerticalSizeClass] = useState<SizeClass>(SizeClass.Regular);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(dimensions.width < dimensions.height ? 'portrait' : 'landscape');

  const determineSize = () => {
    const { width, height } = Dimensions.get('window');
    const isLandscape = width > height;
    setOrientation(isLandscape ? 'landscape' : 'portrait');

    if (isDesktop) {
      setHorizontalSizeClass(SizeClass.Large);
      setVerticalSizeClass(SizeClass.Large);
      return;
    }

    if (Platform.OS === 'ios' && Platform.isPad) {
      setHorizontalSizeClass(SizeClass.Regular);
      setVerticalSizeClass(SizeClass.Regular);
      return;
    }

    if (isTablet) {
      setHorizontalSizeClass(SizeClass.Regular);
      setVerticalSizeClass(SizeClass.Regular);
      return;
    }

    const aspectRatio = isLandscape ? width / height : height / width;
    const screenArea = width * height;

    if (isLandscape) {
      setHorizontalSizeClass(aspectRatio >= 1.6 || screenArea >= 250000 ? SizeClass.Regular : SizeClass.Compact);
      setVerticalSizeClass(SizeClass.Compact);
    } else {
      setHorizontalSizeClass(SizeClass.Compact);
      setVerticalSizeClass(SizeClass.Regular);
    }
  };

  useEffect(() => {
    const handleDimensionChange = () => {
      determineSize();
    };

    const dimensionSubscription = Dimensions.addEventListener('change', handleDimensionChange);

    determineSize();

    return () => {
      dimensionSubscription.remove();
    };
  }, []);

  const { currentAppState } = useAppState();
  useEffect(() => {
    if (currentAppState === 'active') {
      determineSize();
    }
  }, [currentAppState]);

  const sizeClass = useMemo(() => {
    if (
      (horizontalSizeClass === SizeClass.Large || verticalSizeClass === SizeClass.Large) &&
      horizontalSizeClass !== SizeClass.Compact &&
      verticalSizeClass !== SizeClass.Compact
    ) {
      return SizeClass.Large;
    }

    if (horizontalSizeClass === SizeClass.Compact || verticalSizeClass === SizeClass.Compact) {
      return SizeClass.Compact;
    }

    return SizeClass.Regular;
  }, [horizontalSizeClass, verticalSizeClass]);

  useEffect(() => {
    console.debug(
      `[SizeClass] Size classes updated:`,
      `horizontal=${SizeClass[horizontalSizeClass]}`,
      `vertical=${SizeClass[verticalSizeClass]}`,
      `overall=${SizeClass[sizeClass]}`,
      `orientation=${orientation}`,
    );
  }, [horizontalSizeClass, verticalSizeClass, sizeClass, orientation]);

  return {
    sizeClass,
    horizontalSizeClass,
    verticalSizeClass,
    orientation,
  };
};

type SizeClassProviderProps = {
  children: ReactNode;
};

export const SizeClassContext = createContext<ISizeClassContext>({
  sizeClass: SizeClass.Regular,
  horizontalSizeClass: SizeClass.Regular,
  verticalSizeClass: SizeClass.Regular,
  orientation: 'portrait',
});

export const SizeClassProvider: React.FC<SizeClassProviderProps> = ({ children }) => {
  const { sizeClass, horizontalSizeClass, verticalSizeClass, orientation } = useSizeClassDetection();

  const contextValue = useMemo(
    () => ({
      sizeClass,
      horizontalSizeClass,
      verticalSizeClass,
      orientation,
    }),
    [sizeClass, horizontalSizeClass, verticalSizeClass, orientation],
  );

  return <SizeClassContext.Provider value={contextValue}>{children}</SizeClassContext.Provider>;
};
