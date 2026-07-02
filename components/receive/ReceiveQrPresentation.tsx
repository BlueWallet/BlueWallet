import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

/** Staggered “reveal” for the QR: white tiles fade out in random order */
const QR_STAGGER_GRID = 5;
const QR_STAGGER_MAX_DELAY_MS = 420;
const QR_STAGGER_TILE_DURATION_MS = 400;

/** Deterministic stagger delays for a given payload key */
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

const styles = StyleSheet.create({
  qrRevealTile: {
    position: 'absolute',
  },
  qrStaggerHost: {
    overflow: 'hidden',
  },
});

type QrRevealTileProps = {
  width: number;
  height: number;
  left: number;
  top: number;
  maskColor: string;
  delayMs: number;
  runKey: string;
};

const QrRevealTile: React.FC<QrRevealTileProps> = ({ width, height, left, top, maskColor, delayMs, runKey }) => {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = 1;
    opacity.value = withDelay(delayMs, withTiming(0, { duration: QR_STAGGER_TILE_DURATION_MS, easing: Easing.out(Easing.quad) }));
  }, [runKey, delayMs, opacity]);
  const tileStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.qrRevealTile, { left, top, width, height, backgroundColor: maskColor }, tileStyle]}
    />
  );
};

type QrStaggerRevealProps = {
  size: number;
  maskColor: string;
  runKey: string;
  children: React.ReactNode;
};

export const QrStaggerReveal: React.FC<QrStaggerRevealProps> = ({ size, maskColor, runKey, children }) => {
  const delays = useMemo(() => staggerDelaysForRunKey(runKey, QR_STAGGER_GRID * QR_STAGGER_GRID, QR_STAGGER_MAX_DELAY_MS), [runKey]);
  const g = QR_STAGGER_GRID;
  const qx = Math.floor(size / g);
  const extraX = size - qx * g;
  const qy = Math.floor(size / g);
  const extraY = size - qy * g;
  const tileW = (c: number) => (c === g - 1 ? qx + extraX : qx);
  const tileH = (r: number) => (r === g - 1 ? qy + extraY : qy);
  const left = (c: number) => c * qx;
  const top = (r: number) => r * qy;

  return (
    <View style={[styles.qrStaggerHost, { width: size, height: size }]}>
      {children}
      {delays.map((delayMs, i) => {
        const row = Math.floor(i / g);
        const col = i % g;
        return (
          <QrRevealTile
            key={`${runKey}-${i}`}
            width={tileW(col)}
            height={tileH(row)}
            left={left(col)}
            top={top(row)}
            maskColor={maskColor}
            delayMs={delayMs}
            runKey={runKey}
          />
        );
      })}
    </View>
  );
};
