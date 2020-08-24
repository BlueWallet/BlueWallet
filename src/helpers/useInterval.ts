import React, { useEffect, useRef } from 'react';

export const useInterval = (callback: Function, delay: number | null) => {
  const savedCallback: React.MutableRefObject<any> = useRef();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    function tick() {
      savedCallback.current();
    }
    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
};
