import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

const useBounceAnimation = (query: string) => {
  const bounceAnim = useRef(new Animated.Value(1.0)).current;

  useEffect(() => {
    if (query) {
      Animated.timing(bounceAnim, {
        toValue: 1.08, // Reduced from 1.2 to 1.08 for more subtle animation
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        Animated.timing(bounceAnim, {
          toValue: 1.0,
          duration: 150,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [bounceAnim, query]);

  return bounceAnim;
};

export default useBounceAnimation;
