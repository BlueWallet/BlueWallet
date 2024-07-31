import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

const useBounceAnimation = (query: string) => {
  const bounceAnim = useRef(new Animated.Value(1.0)).current;

  useEffect(() => {
    if (query) {
      Animated.timing(bounceAnim, {
        toValue: 1.2,
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
