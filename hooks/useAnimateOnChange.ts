import { useAnimatedReaction, useAnimatedStyle, useSharedValue, withTiming, Easing, interpolate } from 'react-native-reanimated';

const useAnimateOnChange = <T>(value: T) => {
  const progress = useSharedValue(1);

  useAnimatedReaction(
    () => {
      return value;
    },
    (current, previous) => {
      if (previous === null || previous === undefined) {
        return;
      }

      if (current !== previous) {
        progress.value = 0;
        progress.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) });
      }
    },
    [value],
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(progress.value, [0, 1], [0.85, 1]),
      transform: [
        {
          scale: interpolate(progress.value, [0, 1], [0.98, 1]),
        },
      ],
    };
  });

  return animatedStyle;
};

export default useAnimateOnChange;
