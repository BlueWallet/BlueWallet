import Animated, { add, block, call, clockRunning, cond, eq, onChange, stopClock, useCode, useValue } from 'react-native-reanimated';
import { useAnimatedValues } from '../context/animatedValueContext';
import { useRefs } from '../context/refContext';
import { setupCell, springFill } from '../procs';
import { useSpring } from './useSpring';
import { useNode } from '../hooks/useNode';
import { useDraggableFlatListContext } from '../context/draggableFlatListContext';

type Params = {
  cellIndex: Animated.Value<number>;
  cellSize: Animated.Value<number>;
  cellOffset: Animated.Value<number>;
};

export function useCellTranslate({ cellIndex, cellSize, cellOffset }: Params) {
  const {
    activeIndexAnim,
    activeCellSize,
    hoverAnim,
    scrollOffset,
    spacerIndexAnim,
    placeholderOffset,
    isDraggingCell,
    resetTouchedCell,
    disabled,
  } = useAnimatedValues();
  const { animationConfigRef } = useRefs();
  const { onDragEnd } = useDraggableFlatListContext();

  const cellSpring = useSpring({ config: animationConfigRef.current });
  const { clock, state, config } = cellSpring;

  const isAfterActive = useValue(0);
  const isClockRunning = useNode(clockRunning(clock));

  const runSpring = useNode(springFill(clock, state, config));

  // Even though this is the same value as hoverOffset passed via context
  // the android context value lags behind the actual value on autoscroll
  const cellHoverOffset = useNode(add(hoverAnim, scrollOffset));

  const onFinished = useNode(
    cond(isClockRunning, [
      stopClock(clock),
      cond(eq(cellIndex, activeIndexAnim), [resetTouchedCell, call([activeIndexAnim, spacerIndexAnim], onDragEnd)]),
    ]),
  );

  const prevTrans = useValue<number>(0);
  const prevSpacerIndex = useValue<number>(-1);
  const prevIsDraggingCell = useValue<number>(0);

  const cellTranslate = useNode(
    setupCell(
      cellIndex,
      cellSize,
      cellOffset,
      isAfterActive,
      prevTrans,
      prevSpacerIndex,
      activeIndexAnim,
      activeCellSize,
      cellHoverOffset,
      spacerIndexAnim,
      // @ts-ignore
      config.toValue,
      state.position,
      state.time,
      state.finished,
      runSpring,
      onFinished,
      isDraggingCell,
      placeholderOffset,
      prevIsDraggingCell,
      clock,
      disabled,
    ),
  );

  // This is a workaround required to continually evaluate values
  useCode(() => block([onChange(cellTranslate, []), onChange(prevTrans, []), onChange(cellSize, []), onChange(cellOffset, [])]), []);

  return state.position;
}
