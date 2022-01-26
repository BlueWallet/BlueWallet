// @ts-ignore: Ignore
import React, { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { call, useCode, onChange, greaterThan, cond, sub, block } from 'react-native-reanimated';
import { useAnimatedValues } from '../context/animatedValueContext';
import { useDraggableFlatListContext } from '../context/draggableFlatListContext';
import { useProps } from '../context/propsContext';
import { useRefs } from '../context/refContext';
import { useNode } from '../hooks/useNode';
import { RenderPlaceholder } from '../types';
import { typedMemo } from '../utils';

type Props<T> = {
  renderPlaceholder?: RenderPlaceholder<T>;
};

function PlaceholderItem<T>({ renderPlaceholder }: Props<T>) {
  const { activeCellSize, placeholderOffset, spacerIndexAnim, scrollOffset } = useAnimatedValues();
  const [placeholderSize, setPlaceholderSize] = useState(0);

  const { keyToIndexRef, propsRef } = useRefs<T>();

  const { activeKey } = useDraggableFlatListContext();
  const { horizontal } = useProps();

  const onPlaceholderIndexChange = useCallback(
    (index: number) => {
      propsRef.current.onPlaceholderIndexChange?.(index);
    },
    [propsRef],
  );

  useCode(
    () =>
      block([
        onChange(
          activeCellSize,
          call([activeCellSize], ([size]) => {
            // Using animated values to set height caused a bug where item wouldn't correctly update
            // so instead we mirror the animated value in component state.
            setPlaceholderSize(size);
          }),
        ),
        onChange(
          spacerIndexAnim,
          call([spacerIndexAnim], ([i]) => {
            onPlaceholderIndexChange(i);
            if (i === -1) setPlaceholderSize(0);
          }),
        ),
      ]),
    [],
  );

  const translateKey = horizontal ? 'translateX' : 'translateY';
  const sizeKey = horizontal ? 'width' : 'height';
  const opacity = useNode(cond(greaterThan(spacerIndexAnim, -1), 1, 0));

  const activeIndex = activeKey ? keyToIndexRef.current.get(activeKey) : undefined;
  const activeItem = activeIndex === undefined ? null : propsRef.current?.data[activeIndex];

  const animStyle = {
    opacity,
    [sizeKey]: placeholderSize,
    transform: [{ [translateKey]: sub(placeholderOffset, scrollOffset) }] as unknown as Animated.AnimatedTransform,
  };

  return (
    <Animated.View pointerEvents={activeKey ? 'auto' : 'none'} style={[StyleSheet.absoluteFill, animStyle]}>
      {!activeItem || activeIndex === undefined ? null : renderPlaceholder?.({ item: activeItem, index: activeIndex })}
    </Animated.View>
  );
}

export default typedMemo(PlaceholderItem);
