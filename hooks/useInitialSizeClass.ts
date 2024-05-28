import { useEffect, useState } from 'react';
import { NativeModules } from 'react-native';

const { OrientationManager } = NativeModules;

const useInitialSizeClass = () => {
  const [initialSizeClass, setInitialSizeClass] = useState<boolean>(false);

  useEffect(() => {
    const fetchInitialSizeClass = async () => {
      try {
        const isRegularSizeClass = await OrientationManager.getInitialSizeClass();
        setInitialSizeClass(isRegularSizeClass);
      } catch (error) {
        console.error('Error getting initial size class:', error);
      }
    };

    fetchInitialSizeClass();
  }, []);

  return initialSizeClass;
};

export default useInitialSizeClass;
