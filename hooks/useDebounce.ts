import { useState, useEffect, useMemo } from 'react';
import debounce from '../blue_modules/debounce';

// Overload signatures
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic constraint over any function
function useDebounce<T extends (...args: any[]) => any>(callback: T, delay: number): T;
function useDebounce<T>(value: T, delay: number): T;

function useDebounce<T>(value: T, delay: number): T {
  const isFn = typeof value === 'function';

  const debouncedFunction = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- isFn narrowed at runtime, not in the type
    return isFn ? debounce(value as unknown as (...args: any[]) => any, delay) : null;
  }, [isFn, value, delay]);

  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    if (!isFn) {
      const handler = setTimeout(() => setDebouncedValue(value), delay);
      return () => clearTimeout(handler);
    }
  }, [isFn, value, delay]);

  return isFn ? (debouncedFunction as unknown as T) : debouncedValue;
}

export default useDebounce;
