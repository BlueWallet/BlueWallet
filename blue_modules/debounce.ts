// https://levelup.gitconnected.com/debounce-in-javascript-improve-your-applications-performance-5b01855e086
const debounce = <T extends (...args: any[]) => void>(func: T, wait: number) => {
  let timeout: NodeJS.Timeout | null;
  return function executedFunction(this: ThisParameterType<T>, ...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func.apply(this, args);
    };
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
};

export default debounce;
