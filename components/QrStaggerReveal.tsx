/**
 * Reveal for a QR code: white tiles over it fade out in a random order. It
 * plays when the QR first shows and again whenever `runKey` changes, so a
 * screen picks what counts as a new code (the address, not every digit of an
 * amount being typed).
 */
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

const GRID = 5;
const MAX_DELAY_MS = 420;
const TILE_DURATION_MS = 400;

/** Deterministic delays for a given key. */
function staggerDelaysForRunKey(runKey: string, tileCount: number, maxDelayMs: number): number[] {
  const delays: number[] = [];
  for (let i = 0; i < tileCount; i++) {
    let n = 0;
    const s = `${runKey}:${i}`;
    for (let j = 0; j < s.length; j++) {
      n = (n * 31 + s.charCodeAt(j) * (j + 1)) % 2147483647;
    }
    delays.push(n % maxDelayMs);
  }
  return delays;
}

type TileProps = {
  width: number;
  height: number;
  left: number;
  top: number;
  maskColor: string;
  delayMs: number;
  runKey: string;
};

const RevealTile: React.FC<TileProps> = ({ width, height, left, top, maskColor, delayMs, runKey }) => {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = 1;
    opacity.value = withDelay(delayMs, withTiming(0, { duration: TILE_DURATION_MS, easing: Easing.out(Easing.quad) }));
  }, [runKey, delayMs, opacity]);
  const tileStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View pointerEvents="none" style={[styles.tile, { left, top, width, height, backgroundColor: maskColor }, tileStyle]} />;
};

type Props = {
  size: number;
  maskColor: string;
  runKey: string;
  children: React.ReactNode;
};

const QrStaggerReveal: React.FC<Props> = ({ size, maskColor, runKey, children }) => {
  const delays = useMemo(() => staggerDelaysForRunKey(runKey, GRID * GRID, MAX_DELAY_MS), [runKey]);
  const q = Math.floor(size / GRID);
  const extra = size - q * GRID;
  const span = (i: number) => (i === GRID - 1 ? q + extra : q);

  return (
    <View style={[styles.host, { width: size, height: size }]}>
      {children}
      {delays.map((delayMs, i) => {
        const row = Math.floor(i / GRID);
        const col = i % GRID;
        return (
          <RevealTile
            key={`${runKey}-${i}`}
            width={span(col)}
            height={span(row)}
            left={col * q}
            top={row * q}
            maskColor={maskColor}
            delayMs={delayMs}
            runKey={runKey}
          />
        );
      })}
    </View>
  );
};

export default QrStaggerReveal;

const styles = StyleSheet.create({
  host: { overflow: 'hidden' },
  tile: { position: 'absolute' },
});
