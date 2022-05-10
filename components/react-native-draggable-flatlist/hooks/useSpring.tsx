import { useMemo } from 'react';
import Animated, { Clock, useValue } from 'react-native-reanimated';
import { DEFAULT_ANIMATION_CONFIG } from '../constants';

type Params = {
  config: Partial<Animated.SpringConfig>;
};

export function useSpring({ config: configParam }: Params = { config: DEFAULT_ANIMATION_CONFIG }) {
  const toValue = useValue<number>(0);
  const clock = useMemo(() => new Clock(), []);

  const finished = useValue<number>(0);
  const velocity = useValue<number>(0);
  const position = useValue<number>(0);
  const time = useValue<number>(0);

  const state = useMemo(
    () => ({
      finished,
      velocity,
      position,
      time,
    }),
    [finished, velocity, position, time],
  );

  const config = useMemo(
    () => ({
      ...DEFAULT_ANIMATION_CONFIG,
      ...configParam,
      toValue,
    }),
    [configParam, toValue],
  ) as Animated.SpringConfig;

  return useMemo(
    () => ({
      clock,
      state,
      config,
    }),
    [clock, state, config],
  );
}
