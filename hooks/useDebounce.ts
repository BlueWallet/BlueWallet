import { useState, useEffect } from 'react';
import debounce from '../blue_modules/debounce';

const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = debounce((val: T) => {
      setDebouncedValue(val);
    }, delay);

    handler(value);

    return () => {
      handler.cancel();
    };
  }, [value, delay]);

  return debouncedValue;
};

export default useDebounce;
