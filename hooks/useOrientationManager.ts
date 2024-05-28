import { useEffect, useState } from 'react';
import { NativeEventEmitter, NativeModules, Platform, Dimensions } from 'react-native';

const { OrientationManager } = NativeModules;
const orientationManagerEmitter = Platform.OS === 'ios' ? new NativeEventEmitter(OrientationManager) : null;

const useOrientationManager = () => {
  const [isLargeScreen, setIsLargeScreen] = useState(false);

  useEffect(() => {
    const fetchInitialSizeClass = async () => {
      try {
        const initialSizeClass = await OrientationManager.getInitialSizeClass();
        setIsLargeScreen(initialSizeClass);
      } catch (error) {
        console.error('Error getting initial size class:', error);
      }
    };

    if (orientationManagerEmitter) {
      fetchInitialSizeClass();

      const subscription = orientationManagerEmitter.addListener('onOrientationChange', (event) => {
        setIsLargeScreen(event.isLargeScreen);
      });

      return () => subscription.remove();
    } else {
      // Fallback for Android or other platforms
      const determineSizeClass = (width: number) => width >= 768;
      const updateScreenSize = () => {
        const windowWidth = Dimensions.get('window').width;
        setIsLargeScreen(determineSizeClass(windowWidth));
      };

      updateScreenSize();
      const subscription = Dimensions.addEventListener('change', updateScreenSize);
      return () => subscription.remove();
    }
  }, []);

  return isLargeScreen;
};

export default useOrientationManager;
