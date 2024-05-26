// https://levelup.gitconnected.com/debounce-in-javascript-improve-your-applications-performance-5b01855e086
// blue_modules/debounce.ts
type DebouncedFunction<T extends (...args: any[]) => void> = {
  (this: ThisParameterType<T>, ...args: Parameters<T>): void;
  cancel(): void;
};

const debounce = <T extends (...args: any[]) => void>(func: T, wait: number): DebouncedFunction<T> => {
  let timeout: NodeJS.Timeout | null;
  const debouncedFunction = function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func.apply(this, args);
    };
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };

  debouncedFunction.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = null;
  };

  return debouncedFunction as DebouncedFunction<T>;
};

export default debounce;
