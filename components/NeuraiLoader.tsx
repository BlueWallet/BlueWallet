/**
 * The Neurai logo as a loader, for waits on real work (deriving keys, building
 * a transaction, talking to a device): the N stays as in the logo and an arc
 * turns around its ring.
 *
 * The arc turns on the UI thread (Reanimated), so it keeps moving while the
 * JS thread is busy with that work. Whoever starts the work must let one
 * frame paint first, or the loader never shows.
 */
import React, { useEffect } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, Path } from 'react-native-svg';

import loc from '../loc';
import { useHomePalette } from './home/homeTheme';

// The logo's geometry on a 100 × 100 box, measured on img/icon.png.
const BOX = 100;
const RING_R = 48.2;
const RING_W = 3.2;
const BAR_W = 11.9;
const NODE_R = 7.35;
const NODE_W = 2;
const LEFT = 30.2;
const RIGHT = 69.7;
const TOP = 21.9;
const BOTTOM = 78.6;
const NODES: ReadonlyArray<readonly [number, number]> = [
  [LEFT, BOTTOM],
  [LEFT, TOP],
  [RIGHT, BOTTOM],
  [RIGHT, TOP],
];

/** The N in one stroke: up the left bar, down the diagonal, up the right bar. Its corners are the nodes. */
const N_PATH = `M${LEFT} ${BOTTOM}L${LEFT} ${TOP}L${RIGHT} ${BOTTOM}L${RIGHT} ${TOP}`;
const circle = (x: number, y: number, r: number) => `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
/** Everything but the inside of the nodes: the N stops at their rings, and whatever is behind shows through them. */
const OUTSIDE_NODES = `M0 0H${BOX}V${BOX}H0Z${NODES.map(([x, y]) => circle(x, y, NODE_R - NODE_W)).join('')}`;
const RING_LENGTH = 2 * Math.PI * RING_R;
const ARC = RING_LENGTH * 0.24;

/** One turn of the arc. */
const SPIN_MS = 1700;

/** Brand purple, lighter on dark grounds. */
const TONES = {
  light: { main: '#4a0068', track: 'rgba(74, 0, 104, 0.16)' },
  dark: { main: '#c084fc', track: 'rgba(192, 132, 252, 0.22)' },
};

/**
 * Resolves once a loader just put on screen has painted and started moving:
 * await it before work that holds the JS thread.
 */
export const untilLoaderPainted = () => new Promise<void>(resolve => requestAnimationFrame(() => setTimeout(resolve, 60)));

interface NeuraiLoaderProps {
  /** Side of the logo, in points. */
  size?: number;
  /** What is being done, under the logo. */
  label?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const NeuraiLoader: React.FC<NeuraiLoaderProps> = ({ size = 72, label, style, testID = 'NeuraiLoader' }) => {
  const p = useHomePalette();
  const tone = p.dark ? TONES.dark : TONES.light;

  const spin = useSharedValue(0);
  useEffect(() => {
    spin.value = withRepeat(withTiming(1, { duration: SPIN_MS, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(spin);
  }, [spin]);
  const turning = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));

  return (
    <View
      style={[styles.root, style]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? loc._.loading}
      accessibilityState={{ busy: true }}
      testID={testID}
    >
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} viewBox={`0 0 ${BOX} ${BOX}`}>
          <Defs>
            <ClipPath id="neuraiLoaderN">
              <Path d={OUTSIDE_NODES} clipRule="evenodd" />
            </ClipPath>
          </Defs>
          <Circle cx={BOX / 2} cy={BOX / 2} r={RING_R} stroke={tone.track} strokeWidth={RING_W} fill="none" />
          <Path d={N_PATH} stroke={tone.main} strokeWidth={BAR_W} strokeLinejoin="round" fill="none" clipPath="url(#neuraiLoaderN)" />
          {NODES.map(([x, y]) => (
            <Circle key={`${x}-${y}`} cx={x} cy={y} r={NODE_R - NODE_W / 2} stroke={tone.main} strokeWidth={NODE_W} fill="none" />
          ))}
        </Svg>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, turning]}>
          <Svg width={size} height={size} viewBox={`0 0 ${BOX} ${BOX}`}>
            <Circle
              cx={BOX / 2}
              cy={BOX / 2}
              r={RING_R}
              stroke={tone.main}
              strokeWidth={RING_W}
              strokeLinecap="round"
              strokeDasharray={`${ARC} ${RING_LENGTH}`}
              fill="none"
            />
          </Svg>
        </Animated.View>
      </View>
      {label ? <Text style={[styles.label, { color: p.muted }]}>{label}</Text> : null}
    </View>
  );
};

export default NeuraiLoader;

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center' },
  label: { marginTop: 16, fontSize: 14, fontWeight: '500', textAlign: 'center' },
});
