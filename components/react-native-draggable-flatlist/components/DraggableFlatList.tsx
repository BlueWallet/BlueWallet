/* eslint-disable react-hooks/exhaustive-deps */
// @ts-ignore: Ignore
import React, { ForwardedRef, useCallback, useLayoutEffect, useMemo, useState } from 'react';
// @ts-ignore: Ignore
import { ListRenderItem, FlatListProps, NativeScrollEvent, NativeSyntheticEvent, LayoutChangeEvent } from 'react-native';
import {
  PanGestureHandler,
  State as GestureState,
  FlatList,
  PanGestureHandlerGestureEvent,
  PanGestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';
import Animated, { and, block, call, cond, eq, event, greaterThan, neq, not, onChange, or, set, sub } from 'react-native-reanimated';
import CellRendererComponent from './CellRendererComponent';
import { DEFAULT_PROPS, isWeb } from '../constants';
import PlaceholderItem from './PlaceholderItem';
import RowItem from './RowItem';
import ScrollOffsetListener from './ScrollOffsetListener';
import { DraggableFlatListProps } from '../types';
import { useAutoScroll } from '../hooks/useAutoScroll';
import { useNode } from '../hooks/useNode';
import PropsProvider from '../context/propsContext';
import AnimatedValueProvider, { useAnimatedValues } from '../context/animatedValueContext';
import RefProvider, { useRefs } from '../context/refContext';
import DraggableFlatListProvider from '../context/draggableFlatListContext';

type RNGHFlatListProps<T> = Animated.AnimateProps<
  FlatListProps<T> & {
    ref: React.Ref<FlatList<T>>;
    simultaneousHandlers?: React.Ref<any> | React.Ref<any>[];
  }
>;

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList) as unknown as <T>(props: RNGHFlatListProps<T>) => React.ReactElement;

function DraggableFlatListInner<T>(props: DraggableFlatListProps<T>) {
  const { cellDataRef, containerRef, flatListRef, isTouchActiveRef, keyToIndexRef, panGestureHandlerRef, propsRef, scrollOffsetRef } =
    useRefs<T>();
  const {
    activationDistance,
    activeCellOffset,
    activeCellSize,
    activeIndexAnim,
    containerSize,
    disabled,
    panGestureState,
    resetTouchedCell,
    scrollOffset,
    scrollViewSize,
    spacerIndexAnim,
    touchAbsolute,
    touchInit,
  } = useAnimatedValues();

  const {
    dragHitSlop = DEFAULT_PROPS.dragHitSlop,
    scrollEnabled = DEFAULT_PROPS.scrollEnabled,
    activationDistance: activationDistanceProp = DEFAULT_PROPS.activationDistance,
  } = props;

  const [activeKey, setActiveKey] = useState<string | null>(null);

  const keyExtractor = useCallback(
    (item: T, index: number) => {
      if (propsRef.current.keyExtractor) return propsRef.current.keyExtractor(item, index);
      else throw new Error('You must provide a keyExtractor to DraggableFlatList');
    },
    [propsRef],
  );

  useLayoutEffect(() => {
    props.data.forEach((d, i) => {
      const key = keyExtractor(d, i);
      keyToIndexRef.current.set(key, i);
    });
  }, [props.data, keyExtractor, keyToIndexRef]);

  const drag = useCallback(
    (activeKey: string) => {
      if (!isTouchActiveRef.current.js) return;
      const index = keyToIndexRef.current.get(activeKey);
      const cellData = cellDataRef.current.get(activeKey);
      if (cellData) {
        activeCellOffset.setValue(cellData.measurements.offset - scrollOffsetRef.current);
        activeCellSize.setValue(cellData.measurements.size);
      }

      const { onDragBegin } = propsRef.current;
      if (index !== undefined) {
        spacerIndexAnim.setValue(index);
        activeIndexAnim.setValue(index);
        setActiveKey(activeKey);
        onDragBegin?.(index);
      }
    },
    [
      isTouchActiveRef,
      keyToIndexRef,
      cellDataRef,
      propsRef,
      activeCellOffset,
      scrollOffsetRef,
      activeCellSize,
      spacerIndexAnim,
      activeIndexAnim,
    ],
  );

  const autoScrollNode = useAutoScroll();

  const onContainerLayout = ({ nativeEvent: { layout } }: LayoutChangeEvent) => {
    containerSize.setValue(props.horizontal ? layout.width : layout.height);
  };

  const onListContentSizeChange = (w: number, h: number) => {
    scrollViewSize.setValue(props.horizontal ? w : h);
    props.onContentSizeChange?.(w, h);
  };

  const onContainerTouchStart = () => {
    isTouchActiveRef.current.js = true;
    isTouchActiveRef.current.native.setValue(1);
    return false;
  };

  const onContainerTouchEnd = () => {
    isTouchActiveRef.current.js = false;
    isTouchActiveRef.current.native.setValue(0);
  };

  let dynamicProps = {};
  if (activationDistanceProp) {
    const activeOffset = [-activationDistanceProp, activationDistanceProp];
    dynamicProps = props.horizontal ? { activeOffsetX: activeOffset } : { activeOffsetY: activeOffset };
  }

  const extraData = useMemo(
    () => ({
      activeKey,
      extraData: props.extraData,
    }),
    [activeKey, props.extraData],
  );

  const renderItem: ListRenderItem<T> = useCallback(
    // @ts-ignore: Ignore
    ({ item, index }) => {
      const key = keyExtractor(item, index);
      if (index !== keyToIndexRef.current.get(key)) keyToIndexRef.current.set(key, index);

      return <RowItem item={item} itemKey={key} renderItem={props.renderItem} drag={drag} extraData={props.extraData} />;
    },
    [props.renderItem, props.extraData, drag, keyExtractor],
  );

  const resetHoverState = useCallback(() => {
    activeIndexAnim.setValue(-1);
    spacerIndexAnim.setValue(-1);
    touchAbsolute.setValue(0);
    disabled.setValue(0);
    requestAnimationFrame(() => {
      setActiveKey(null);
    });
  }, [activeIndexAnim, spacerIndexAnim, touchAbsolute, disabled]);

  const onRelease = ([index]: readonly number[]) => {
    // This shouldn't be necessary but seems to fix a bug where sometimes
    // native values wouldn't update
    isTouchActiveRef.current.native.setValue(0);
    props.onRelease?.(index);
  };

  const onDragEnd = useCallback(
    ([from, to]: readonly number[]) => {
      const { onDragEnd, data } = propsRef.current;
      if (onDragEnd) {
        const newData = [...data];
        if (from !== to) {
          newData.splice(from, 1);
          newData.splice(to, 0, data[from]);
        }
        onDragEnd({ from, to, data: newData });
      }
      resetHoverState();
    },
    [resetHoverState, propsRef],
  );

  const onGestureRelease = useNode(
    cond(
      greaterThan(activeIndexAnim, -1),
      [set(disabled, 1), set(isTouchActiveRef.current.native, 0), call([activeIndexAnim], onRelease)],
      [call([activeIndexAnim], resetHoverState), resetTouchedCell],
    ),
  );

  const onPanStateChange = useMemo(
    () =>
      event([
        {
          nativeEvent: ({ state, x, y }: PanGestureHandlerStateChangeEvent['nativeEvent']) =>
            block([
              cond(and(neq(state, panGestureState), not(disabled)), [
                cond(
                  or(
                    eq(state, GestureState.BEGAN), // Called on press in on Android, NOT on ios!
                    // GestureState.BEGAN may be skipped on fast swipes
                    and(eq(state, GestureState.ACTIVE), neq(panGestureState, GestureState.BEGAN)),
                  ),
                  [set(touchAbsolute, props.horizontal ? x : y), set(touchInit, touchAbsolute)],
                ),
                cond(eq(state, GestureState.ACTIVE), [
                  set(activationDistance, sub(props.horizontal ? x : y, touchInit)),
                  set(touchAbsolute, props.horizontal ? x : y),
                ]),
              ]),
              cond(neq(panGestureState, state), [
                set(panGestureState, state),
                cond(or(eq(state, GestureState.END), eq(state, GestureState.CANCELLED), eq(state, GestureState.FAILED)), onGestureRelease),
              ]),
            ]),
        },
      ]),
    [activationDistance, props.horizontal, panGestureState, disabled, onGestureRelease, touchAbsolute, touchInit],
  );

  const onPanGestureEvent = useMemo(
    () =>
      event([
        {
          nativeEvent: ({ x, y }: PanGestureHandlerGestureEvent['nativeEvent']) =>
            cond(and(greaterThan(activeIndexAnim, -1), eq(panGestureState, GestureState.ACTIVE), not(disabled)), [
              set(touchAbsolute, props.horizontal ? x : y),
            ]),
        },
      ]),
    [activeIndexAnim, disabled, panGestureState, props.horizontal, touchAbsolute],
  );

  const scrollHandler = useMemo(() => {
    // Web doesn't seem to like animated events
    const webOnScroll = ({
      nativeEvent: {
        contentOffset: { x, y },
      },
    }: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollOffset.setValue(props.horizontal ? x : y);
    };

    const mobileOnScroll = event([
      {
        nativeEvent: ({ contentOffset }: NativeScrollEvent) =>
          block([set(scrollOffset, props.horizontal ? contentOffset.x : contentOffset.y), autoScrollNode]),
      },
    ]);

    return isWeb ? webOnScroll : mobileOnScroll;
  }, [autoScrollNode, props.horizontal, scrollOffset]);

  return (
    <DraggableFlatListProvider activeKey={activeKey} onDragEnd={onDragEnd} keyExtractor={keyExtractor} horizontal={!!props.horizontal}>
      <PanGestureHandler
        ref={panGestureHandlerRef}
        hitSlop={dragHitSlop}
        onHandlerStateChange={onPanStateChange}
        onGestureEvent={onPanGestureEvent}
        simultaneousHandlers={props.simultaneousHandlers}
        {...dynamicProps}
      >
        <Animated.View
          style={props.containerStyle}
          ref={containerRef}
          onLayout={onContainerLayout}
          onTouchEnd={onContainerTouchEnd}
          onStartShouldSetResponderCapture={onContainerTouchStart}
          // @ts-ignore Ignore
          onClick={onContainerTouchEnd}
        >
          <ScrollOffsetListener
            scrollOffset={scrollOffset}
            onScrollOffsetChange={([offset]) => {
              scrollOffsetRef.current = offset;
              props.onScrollOffsetChange?.(offset);
            }}
          />
          {!!props.renderPlaceholder && <PlaceholderItem renderPlaceholder={props.renderPlaceholder} />}
          <AnimatedFlatList
            {...props}
            CellRendererComponent={CellRendererComponent}
            ref={flatListRef}
            onContentSizeChange={onListContentSizeChange}
            scrollEnabled={!activeKey && scrollEnabled}
            renderItem={renderItem}
            extraData={extraData}
            keyExtractor={keyExtractor}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            simultaneousHandlers={props.simultaneousHandlers}
            removeClippedSubviews={false}
          />
          <Animated.Code dependencies={[]}>
            {() => block([onChange(isTouchActiveRef.current.native, cond(not(isTouchActiveRef.current.native), onGestureRelease))])}
          </Animated.Code>
        </Animated.View>
      </PanGestureHandler>
    </DraggableFlatListProvider>
  );
}

function DraggableFlatList<T>(props: DraggableFlatListProps<T>, ref: React.ForwardedRef<FlatList<T>>) {
  return (
    <PropsProvider {...props}>
      <AnimatedValueProvider>
        <RefProvider flatListRef={ref}>
          <DraggableFlatListInner {...props} />
        </RefProvider>
      </AnimatedValueProvider>
    </PropsProvider>
  );
}

// Generic forwarded ref type assertion taken from:
// https://fettblog.eu/typescript-react-generic-forward-refs/#option-1%3A-type-assertion
export default React.forwardRef(DraggableFlatList) as <T>(
  props: DraggableFlatListProps<T> & { ref?: React.ForwardedRef<FlatList<T>> },
) => ReturnType<typeof DraggableFlatList>;
