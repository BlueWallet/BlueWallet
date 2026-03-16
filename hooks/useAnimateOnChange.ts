import { useEffect, useRef } from 'react';
import { LayoutAnimation } from 'react-native';

const useAnimateOnChange = <T>(value: T) => {
  const prevValue = useRef<T | undefined>(undefined);
  useEffect(() => {
    if (prevValue.current !== undefined && prevValue.current !== value) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    prevValue.current = value;
  }, [value]);
};
export default useAnimateOnChange;
