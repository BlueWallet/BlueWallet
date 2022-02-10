/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
// @ts-ignore Ignore
import { findNodeHandle, LayoutChangeEvent, MeasureLayoutOnSuccessCallback, StyleProp, ViewStyle } from 'react-native';
import Animated, { cond, useValue } from 'react-native-reanimated';
import { useDraggableFlatListContext } from '../context/draggableFlatListContext';
import { isAndroid, isIOS, isReanimatedV2, isWeb } from '../constants';
import { useCellTranslate } from '../hooks/useCellTranslate';
import { typedMemo } from '../utils';
import { useRefs } from '../context/refContext';
import { useAnimatedValues } from '../context/animatedValueContext';
import CellProvider from '../context/cellContext';

type Props<T> = {
  item: T;
  index: number;
  children: React.ReactNode;
  onLayout: (e: LayoutChangeEvent) => void;
  style?: StyleProp<ViewStyle>;
};

function CellRendererComponent<T>(props: Props<T>) {
  const { item, index, onLayout, children } = props;

  const currentIndexAnim = useValue(index);

  useLayoutEffect(() => {
    currentIndexAnim.setValue(index);
  }, [index, currentIndexAnim]);

  const viewRef = useRef<Animated.View>(null);
  const { cellDataRef, propsRef, scrollOffsetRef, containerRef } = useRefs<T>();

  const { horizontalAnim } = useAnimatedValues();
  const { activeKey, keyExtractor, horizontal } = useDraggableFlatListContext<T>();

  const key = keyExtractor(item, index);
  const offset = useValue<number>(-1);
  const size = useValue<number>(-1);
  const translate = useCellTranslate({
    cellOffset: offset,
    cellSize: size,
    cellIndex: currentIndexAnim,
  });

  useMemo(() => {
    // prevent flicker on web
    if (isWeb) translate.setValue(0);
  }, [index]); // eslint-disable-line react-hooks/exhaustive-deps

  const isActive = activeKey === key;

  const style = useMemo(
    () => ({
      transform: [{ translateX: cond(horizontalAnim, translate, 0) }, { translateY: cond(horizontalAnim, 0, translate) }],
    }),
    [horizontalAnim, translate],
  );

  const updateCellMeasurements = useCallback(() => {
    const onSuccess: MeasureLayoutOnSuccessCallback = (x, y, w, h) => {
      if (isWeb && horizontal) x += scrollOffsetRef.current;
      const cellOffset = horizontal ? x : y;
      const cellSize = horizontal ? w : h;
      cellDataRef.current.set(key, {
        measurements: { size: cellSize, offset: cellOffset },
      });
      size.setValue(cellSize);
      offset.setValue(cellOffset);
    };

    const onFail = () => {
      if (propsRef.current?.debug) {
        console.log(`## on measure fail, index: ${index}`);
      }
    };

    // findNodeHandle is being deprecated. This is no longer necessary if using reanimated v2
    // remove once v1 is no longer supported
    const containerNode = containerRef.current;
    const viewNode = isReanimatedV2 ? viewRef.current : viewRef.current?.getNode();
    // @ts-ignore Ignore
    const nodeHandle = isReanimatedV2 ? containerNode : findNodeHandle(containerNode);

    if (viewNode && nodeHandle) {
      // @ts-ignore Ignore
      viewNode.measureLayout(nodeHandle, onSuccess, onFail);
    }
  }, [cellDataRef, horizontal, index, key, offset, propsRef, size, scrollOffsetRef, containerRef]);

  useEffect(() => {
    if (isWeb) {
      // onLayout isn't called on web when the cell index changes, so we manually re-measure
      updateCellMeasurements();
    }
  }, [index, updateCellMeasurements]);

  const onCellLayout = useCallback(
    (e: LayoutChangeEvent) => {
      updateCellMeasurements();
      onLayout(e);
    },
    [updateCellMeasurements, onLayout],
  );

  // changing zIndex crashes android:
  // https://github.com/facebook/react-native/issues/28751
  return (
    <Animated.View
      {...props}
      ref={viewRef}
      onLayout={onCellLayout}
      style={[
        isAndroid && { elevation: isActive ? 1 : 0 },
        { flexDirection: horizontal ? 'row' : 'column' },
        (isWeb || isIOS) && { zIndex: isActive ? 999 : 0 },
      ]}
      pointerEvents={activeKey ? 'none' : 'auto'}
    >
      <Animated.View
        {...props}
        // Including both animated styles and non-animated styles causes react-native-web
        // to ignore updates in non-animated styles. Solution is to separate animated styles from non-animated styles
        style={[props.style, style]}
      >
        <CellProvider isActive={isActive}>{children}</CellProvider>
      </Animated.View>
    </Animated.View>
  );
}

export default typedMemo(CellRendererComponent);
