import React, { useEffect, useRef, FC } from 'react';
import { Animated, Easing } from 'react-native';

import { images } from 'app/assets';

interface Props {
  size: number;
}

export const Loader: FC<Props> = ({ size }) => {
  const animatedCircle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(animatedCircle, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
        easing: Easing.linear,
      }),
    ).start();
  }, [animatedCircle]);

  return (
    <Animated.Image
      source={images.loader}
      style={{
        width: size,
        height: size,
        transform: [{ rotate: animatedCircle.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
      }}
      resizeMode="contain"
    />
  );
};

export default Loader;
