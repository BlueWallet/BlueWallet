import React, { useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Animated, { Easing, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const DURATION = 600;
const EASING = Easing.out(Easing.cubic);

interface AnimatedCollapsibleProps {
  expanded: boolean;
  /** Receives whether the content is the live (expanded) copy, so a collapsing copy can drop testIDs and taps. */
  children: (isLive: boolean) => React.ReactNode;
}

/**
 * Expands and collapses its content by animating a real `height`.
 *
 * Reanimated layout transitions (`layout` / `exiting`) only move native frames on Android: Yoga, the ScrollView
 * and Detox keep the pre-animation layout, so rows overlap and the next row's buttons stay clipped.
 * Animating `height` goes through layout every frame, so siblings reflow and the final layout is the real one.
 */
const AnimatedCollapsible: React.FC<AnimatedCollapsibleProps> = ({ expanded, children }) => {
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const [mounted, setMounted] = useState(expanded);
  const initiallyExpanded = useRef(expanded);
  const progress = useSharedValue(expanded ? 1 : 0);
  // The measured height lives in a shared value: a JS value captured by the worklet can go stale, leaving height at 0
  const measuredHeight = useSharedValue(0);

  useEffect(() => {
    if (expanded) setMounted(true);
    progress.value = withTiming(expanded ? 1 : 0, { duration: DURATION, easing: EASING }, finished => {
      if (finished && !expanded) runOnJS(setMounted)(false);
    });
  }, [expanded, progress]);

  const onContentLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.height;
    measuredHeight.value = next;
    setContentHeight(current => (current === next ? current : next));
  };

  const animatedStyle = useAnimatedStyle(() => ({
    height: measuredHeight.value * progress.value,
    opacity: interpolate(progress.value, [0, 0.7], [0, 1], 'clamp'),
    transform: [{ translateY: interpolate(progress.value, [0, 1], [-8, 0]) }],
  }));

  // Until the content is measured: keep the natural height if it started expanded, otherwise stay closed
  // so a newly expanded section grows from 0 instead of flashing at full height.
  const sizeStyle = contentHeight === null ? (initiallyExpanded.current ? null : styles.closed) : animatedStyle;

  return (
    <Animated.View style={[styles.clip, sizeStyle]} pointerEvents={expanded ? 'auto' : 'none'}>
      {mounted ? (
        <View onLayout={onContentLayout} collapsable={false}>
          {children(expanded)}
        </View>
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
  closed: {
    height: 0,
    opacity: 0,
  },
});

export default AnimatedCollapsible;
