import React, { useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

/** Collapse of the finished step; matches the checkmark transition in MultipleStepsListItem. */
const COLLAPSE_DURATION = 600;
/** The next step's buttons start fading in once the previous step's checkmark has mostly landed. */
const FADE_IN_DELAY = 250;
const FADE_IN_DURATION = 250;

type Phase = 'open' | 'waiting' | 'fadingIn' | 'closing' | 'closed';

interface AnimatedCollapsibleProps {
  expanded: boolean;
  /** Receives whether the content is the live (expanded) copy, so a collapsing copy can drop testIDs. */
  children: (isLive: boolean) => React.ReactNode;
}

/**
 * Collapses content out by animating a real `height`, and fades content in once the previous step is done.
 *
 * Reanimated layout transitions (`layout` / `exiting`) only move native frames on Android: Yoga, the ScrollView
 * and Detox keep the pre-animation layout, so rows overlap and the next row's buttons stay clipped.
 *
 * Animated styles only exist during a transition. At rest the content is either a plain view sized by its content
 * or not rendered at all, and phases settle on JS timers, so a missed measurement or a dropped animation callback
 * can never leave the content invisible.
 */
const AnimatedCollapsible: React.FC<AnimatedCollapsibleProps> = ({ expanded, children }) => {
  const [phase, setPhase] = useState<Phase>(expanded ? 'open' : 'closed');
  const collapse = useSharedValue(1);
  const fade = useSharedValue(1);
  const measuredHeight = useSharedValue(0);
  const previousExpanded = useRef(expanded);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  useEffect(() => {
    if (previousExpanded.current === expanded) return;
    previousExpanded.current = expanded;
    // Only the next transition replaces these timers, never an unrelated effect re-run
    clearTimers();

    if (expanded) {
      fade.value = 0;
      setPhase('waiting');
      timers.current.push(
        setTimeout(() => {
          setPhase('fadingIn');
          fade.value = withTiming(1, { duration: FADE_IN_DURATION, easing: Easing.out(Easing.quad) });
        }, FADE_IN_DELAY),
        setTimeout(() => setPhase('open'), FADE_IN_DELAY + FADE_IN_DURATION),
      );
    } else {
      collapse.value = 1;
      setPhase('closing');
      collapse.value = withTiming(0, { duration: COLLAPSE_DURATION, easing: Easing.out(Easing.cubic) });
      timers.current.push(setTimeout(() => setPhase('closed'), COLLAPSE_DURATION));
    }
  }, [expanded, collapse, fade]);

  useEffect(() => clearTimers, []);

  const onContentLayout = (event: LayoutChangeEvent) => {
    measuredHeight.value = event.nativeEvent.layout.height;
  };

  const collapseStyle = useAnimatedStyle(() => ({
    height: measuredHeight.value * collapse.value,
    opacity: interpolate(collapse.value, [0, 0.7], [0, 1], 'clamp'),
    transform: [{ translateY: interpolate(collapse.value, [0, 1], [-8, 0]) }],
  }));

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateY: interpolate(fade.value, [0, 1], [6, 0]) }],
  }));

  switch (phase) {
    case 'closed':
    case 'waiting':
      return null;
    case 'open':
      // Plain view: a fresh native view without animated props, sized by its content
      return (
        <View key="open" onLayout={onContentLayout}>
          {children(true)}
        </View>
      );
    case 'fadingIn':
      // Natural height from the first frame, only the opacity animates
      return (
        <Animated.View key="fadingIn" style={fadeStyle} onLayout={onContentLayout}>
          {children(true)}
        </Animated.View>
      );
    case 'closing':
      return (
        <Animated.View key="closing" style={[styles.clip, collapseStyle]} pointerEvents="none">
          {children(false)}
        </Animated.View>
      );
  }
};

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
});

export default AnimatedCollapsible;
