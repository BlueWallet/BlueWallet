import React, { useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const DURATION = 600;
const EASING = Easing.out(Easing.cubic);

type Phase = 'open' | 'opening' | 'closing' | 'closed';

interface AnimatedCollapsibleProps {
  expanded: boolean;
  /** Receives whether the content is the live (expanded) copy, so a collapsing copy can drop testIDs. */
  children: (isLive: boolean) => React.ReactNode;
}

/**
 * Expands and collapses its content by animating a real `height`.
 *
 * Reanimated layout transitions (`layout` / `exiting`) only move native frames on Android: Yoga, the ScrollView
 * and Detox keep the pre-animation layout, so rows overlap and the next row's buttons stay clipped.
 *
 * The animation only runs during a transition. At rest the content is either rendered with its natural layout
 * (no animated style, no measured height) or not rendered at all, so a missed measurement or a dropped animation
 * callback can never leave the content stuck at height 0.
 */
const AnimatedCollapsible: React.FC<AnimatedCollapsibleProps> = ({ expanded, children }) => {
  const [phase, setPhase] = useState<Phase>(expanded ? 'open' : 'closed');
  const progress = useSharedValue(expanded ? 1 : 0);
  const measuredHeight = useSharedValue(0);
  const previousExpanded = useRef(expanded);
  const settleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (previousExpanded.current === expanded) return;
    previousExpanded.current = expanded;

    setPhase(expanded ? 'opening' : 'closing');
    progress.value = withTiming(expanded ? 1 : 0, { duration: DURATION, easing: EASING });
    // Settle on the JS side instead of in the animation callback, so the resting state does not depend on it.
    // The timer is only replaced by the next transition, never by an unrelated effect re-run.
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => setPhase(expanded ? 'open' : 'closed'), DURATION);
  }, [expanded, progress]);

  useEffect(() => () => clearTimeout(settleTimer.current), []);

  const onContentLayout = (event: LayoutChangeEvent) => {
    measuredHeight.value = event.nativeEvent.layout.height;
  };

  const animatedStyle = useAnimatedStyle(() => ({
    height: measuredHeight.value * progress.value,
    opacity: interpolate(progress.value, [0, 0.7], [0, 1], 'clamp'),
    transform: [{ translateY: interpolate(progress.value, [0, 1], [-8, 0]) }],
  }));

  if (phase === 'closed') return null;

  if (phase === 'open') {
    // Plain view: a fresh native view without animated props, sized by its content
    return (
      <View key="open" onLayout={onContentLayout}>
        {children(true)}
      </View>
    );
  }

  return (
    <Animated.View key="animating" style={[styles.clip, animatedStyle]} pointerEvents={phase === 'opening' ? 'auto' : 'none'}>
      {/* Not constrained by the animated height (flexShrink 0), so this reports the content's natural height */}
      <View onLayout={onContentLayout} collapsable={false}>
        {children(phase === 'opening')}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
});

export default AnimatedCollapsible;
