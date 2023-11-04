import { useState, useEffect } from 'react';

/**
 * A custom React hook that accepts a promise and returns the resolved value and any errors that occur.
 *
 * @template T - The type of the resolved value.
 * @param {() => Promise<T>} promiseFn - A function that returns the promise to be resolved.
 * @returns {{ data: T | null, error: Error | null, loading: boolean }} - An object with the resolved data, any error, and loading state.
 */
function useAsyncPromise<T>(promiseFn: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    promiseFn()
      .then(result => {
        if (isMounted) {
          setData(result);
          setLoading(false);
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [promiseFn]);

  return { data, error, loading };
}

export default useAsyncPromise;
