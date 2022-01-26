import React, { useContext, useMemo } from 'react';
import { add, and, block, greaterThan, max, min, set, sub, useValue } from 'react-native-reanimated';
import { State as GestureState } from 'react-native-gesture-handler';
import { useNode } from '../hooks/useNode';
import { useProps } from './propsContext';

if (!useValue) {
  throw new Error('Incompatible Reanimated version (useValue not found)');
}

const AnimatedValueContext = React.createContext<ReturnType<typeof useSetupAnimatedValues> | undefined>(undefined);

export default function AnimatedValueProvider({ children }: { children: React.ReactNode }) {
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  const value = useSetupAnimatedValues();
  return <AnimatedValueContext.Provider value={value}>{children}</AnimatedValueContext.Provider>;
}

export function useAnimatedValues() {
  const value = useContext(AnimatedValueContext);
  if (!value) {
    throw new Error('useAnimatedValues must be called from within AnimatedValueProvider!');
  }
  return value;
}

function useSetupAnimatedValues<T>() {
  const props = useProps<T>();
  const containerSize = useValue<number>(0);

  const touchInit = useValue<number>(0); // Position of initial touch
  const activationDistance = useValue<number>(0); // Distance finger travels from initial touch to when dragging begins
  const touchAbsolute = useValue<number>(0); // Finger position on screen, relative to container
  const panGestureState = useValue<GestureState>(GestureState.UNDETERMINED);

  const isTouchActiveNative = useValue<number>(0);

  const disabled = useValue<number>(0);

  const horizontalAnim = useValue(props.horizontal ? 1 : 0);

  const activeIndexAnim = useValue<number>(-1); // Index of hovering cell
  const spacerIndexAnim = useValue<number>(-1); // Index of hovered-over cell

  const activeCellSize = useValue<number>(0); // Height or width of acctive cell
  const activeCellOffset = useValue<number>(0); // Distance between active cell and edge of container

  const isDraggingCell = useNode(and(isTouchActiveNative, greaterThan(activeIndexAnim, -1)));

  const scrollOffset = useValue<number>(0);

  const scrollViewSize = useValue<number>(0);

  const touchCellOffset = useNode(sub(touchInit, activeCellOffset));

  const hoverAnimUnconstrained = useNode(sub(sub(touchAbsolute, activationDistance), touchCellOffset));

  const hoverAnimConstrained = useNode(min(sub(containerSize, activeCellSize), max(0, hoverAnimUnconstrained)));

  const hoverAnim = props.dragItemOverflow ? hoverAnimUnconstrained : hoverAnimConstrained;

  const hoverOffset = useNode(add(hoverAnim, scrollOffset));

  const placeholderOffset = useValue<number>(0);

  // Note: this could use a refactor as it combines touch state + cell animation
  const resetTouchedCell = useNode(block([set(touchAbsolute, 0), set(touchInit, 0), set(activeCellOffset, 0), set(activationDistance, 0)]));

  const value = useMemo(
    () => ({
      activationDistance,
      activeCellOffset,
      activeCellSize,
      activeIndexAnim,
      containerSize,
      disabled,
      horizontalAnim,
      hoverAnim,
      hoverAnimConstrained,
      hoverAnimUnconstrained,
      hoverOffset,
      isDraggingCell,
      isTouchActiveNative,
      panGestureState,
      placeholderOffset,
      resetTouchedCell,
      scrollOffset,
      scrollViewSize,
      spacerIndexAnim,
      touchAbsolute,
      touchCellOffset,
      touchInit,
    }),
    [
      activationDistance,
      activeCellOffset,
      activeCellSize,
      activeIndexAnim,
      containerSize,
      disabled,
      horizontalAnim,
      hoverAnim,
      hoverAnimConstrained,
      hoverAnimUnconstrained,
      hoverOffset,
      isDraggingCell,
      isTouchActiveNative,
      panGestureState,
      placeholderOffset,
      resetTouchedCell,
      scrollOffset,
      scrollViewSize,
      spacerIndexAnim,
      touchAbsolute,
      touchCellOffset,
      touchInit,
    ],
  );

  return value;
}
