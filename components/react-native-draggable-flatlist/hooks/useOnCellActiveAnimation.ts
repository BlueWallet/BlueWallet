import Animated, { block, clockRunning, cond, onChange, set, startClock, stopClock, useCode } from 'react-native-reanimated';
import { useAnimatedValues } from '../context/animatedValueContext';
import { useIsActive } from '../context/cellContext';
import { springFill } from '../procs';
import { useSpring } from './useSpring';

type Params = {
  animationConfig: Partial<Animated.SpringConfig>;
};

export function useOnCellActiveAnimation({ animationConfig }: Params = { animationConfig: {} }) {
  const { clock, state, config } = useSpring({ config: animationConfig });

  const { isDraggingCell } = useAnimatedValues();
  const isActive = useIsActive();

  useCode(
    () =>
      block([
        onChange(isDraggingCell, [
          // @ts-ignore
          set(config.toValue, cond(isDraggingCell, 1, 0)),
          startClock(clock),
        ]),
        cond(clockRunning(clock), [
          springFill(clock, state, config),
          cond(state.finished, [stopClock(clock), set(state.finished, 0), set(state.time, 0), set(state.velocity, 0)]),
        ]),
      ]),
    [],
  );

  return {
    isActive,
    onActiveAnim: state.position,
  };
}
