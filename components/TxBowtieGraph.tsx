import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { buildInputOutputData, computeBowtieLayout, type BuildInputOutputResult, type SvgLine, type Xput } from './txBowtieGraphUtils';
import { useTheme } from './themes';

const CHART_HEIGHT = 180;

/** Minimum tap target height (px) so thin strands are easy to tap without changing drawn proportions. */
const MIN_TAP_THICKNESS = 24;

/** Mempool-style bowtie colors: primary (blue). strandEnd is theme-dependent (see component). */
const MEMPOOL_COLORS = {
  primary: '#007cfa',
  feeMuted: 'rgba(0, 124, 250, 0.75)',
} as const;

const STRAND_END_LIGHT = 'rgba(249, 249, 249, 0.05)';
const STRAND_END_DARK = 'rgba(27, 27, 27, 0.05)';

/** Fee strand: ends in purple so it is distinct; gradient runs from default blue to purple */
const FEE_STRAND_COLORS = {
  primary: '#7c3aed',
} as const;

/** Output strand end colors by direction */
const OUTPUT_STRAND_COLORS = {
  sent: '#dc2626',
  received: '#16a34a',
} as const;

const GRADIENT_IDS = {
  input: 'txBowtieInputGradient',
  output: 'txBowtieOutputGradient',
  outputSent: 'txBowtieOutputSentGradient',
  outputReceived: 'txBowtieOutputReceivedGradient',
  fee: 'txBowtieFeeGradient',
  middle: 'txBowtieMiddleGradient',
} as const;

export type StrandPressBounds = {
  outerY: number;
  thickness: number;
  side: 'left' | 'right';
};

export type TxBowtieGraphProps = {
  inputData: Xput[];
  outputData: Xput[];
  totalValue: number;
  width: number;
  height?: number;
  /** When true, non-change output strands use blue-to-red; when false, blue-to-green (received). Change always uses default blue. */
  isSent?: boolean;
  /** Optional: 'fee' | 'change' | 'other' per output index so change can keep default color when isSent. */
  outputTypes?: ('fee' | 'change' | 'other')[];
  onStrandPress?: (type: 'input' | 'output', index: number, bounds: StrandPressBounds) => void;
  colors?: {
    output?: string;
    fee?: string;
    middle?: string;
  };
};

function findStrandAt(lines: SvgLine[], locationY: number): { index: number; line: SvgLine; tapThickness: number } | null {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const tapThickness = Math.max(MIN_TAP_THICKNESS, line.thickness);
    const top = line.outerY - tapThickness / 2;
    const bottom = line.outerY + tapThickness / 2;
    if (locationY >= top && locationY <= bottom) {
      return { index: i, line, tapThickness };
    }
  }
  return null;
}

const TxBowtieGraph: React.FC<TxBowtieGraphProps> = ({
  inputData,
  outputData,
  totalValue,
  width,
  height = CHART_HEIGHT,
  isSent = false,
  outputTypes,
  onStrandPress,
  colors: colorsProp,
}) => {
  const theme = useTheme();
  const strandEnd = theme.colors.background === '#000000' ? STRAND_END_DARK : STRAND_END_LIGHT;
  const { inputs, outputs, middle, hasLine } = computeBowtieLayout(inputData, outputData, totalValue, { width, height });

  const handlePress = (event: { nativeEvent: { locationX: number; locationY: number } }) => {
    if (!onStrandPress) return;
    const { locationX, locationY } = event.nativeEvent;
    const isLeft = locationX < width / 2;
    if (isLeft) {
      const hit = findStrandAt(inputs, locationY);
      if (hit) {
        onStrandPress('input', hit.index, {
          outerY: hit.line.outerY,
          thickness: hit.tapThickness,
          side: 'left',
        });
      }
    } else {
      const hit = findStrandAt(outputs, locationY);
      if (hit) {
        onStrandPress('output', hit.index, {
          outerY: hit.line.outerY,
          thickness: hit.tapThickness,
          side: 'right',
        });
      }
    }
  };

  if (!hasLine) {
    return null;
  }

  return (
    <Pressable style={[styles.chartWrap, { width, height }]} onPress={handlePress}>
      <Svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ width, height }}>
        <Defs>
          <LinearGradient id={GRADIENT_IDS.input} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={strandEnd} />
            <Stop offset="100%" stopColor={MEMPOOL_COLORS.primary} />
          </LinearGradient>
          <LinearGradient id={GRADIENT_IDS.output} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={MEMPOOL_COLORS.primary} />
            <Stop offset="100%" stopColor={strandEnd} />
          </LinearGradient>
          <LinearGradient id={GRADIENT_IDS.outputSent} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={MEMPOOL_COLORS.primary} />
            <Stop offset="100%" stopColor={OUTPUT_STRAND_COLORS.sent} />
          </LinearGradient>
          <LinearGradient id={GRADIENT_IDS.outputReceived} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={MEMPOOL_COLORS.primary} />
            <Stop offset="100%" stopColor={OUTPUT_STRAND_COLORS.received} />
          </LinearGradient>
          <LinearGradient id={GRADIENT_IDS.fee} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={MEMPOOL_COLORS.primary} />
            <Stop offset="100%" stopColor={FEE_STRAND_COLORS.primary} />
          </LinearGradient>
          <LinearGradient id={GRADIENT_IDS.middle} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={MEMPOOL_COLORS.primary} />
            <Stop offset="100%" stopColor={MEMPOOL_COLORS.primary} />
          </LinearGradient>
        </Defs>
        <Path d={middle.path} stroke={`url(#${GRADIENT_IDS.middle})`} strokeWidth={middle.strokeWidth} fill="none" />
        {inputs.map((line, i) => (
          <Path
            key={`in-${i}`}
            d={line.path}
            stroke={line.stroke ?? `url(#${GRADIENT_IDS.input})`}
            strokeWidth={line.strokeWidth}
            fill="none"
          />
        ))}
        {outputs
          .map((line, i) => ({ line, i, isFee: outputData[i]?.type === 'fee' }))
          .sort((a, b) => (a.isFee === b.isFee ? 0 : a.isFee ? 1 : -1))
          .map(({ line, i }) => {
            const isFee = outputData[i]?.type === 'fee';
            const isChange = outputTypes?.[i] === 'change';
            const isOther = outputTypes?.[i] === 'other';
            const outputGradientId = isFee
              ? GRADIENT_IDS.fee
              : isChange && !isSent
                ? GRADIENT_IDS.outputReceived
                : isChange && isSent
                  ? GRADIENT_IDS.output
                  : isOther && isSent
                    ? GRADIENT_IDS.outputSent
                    : isOther && !isSent
                      ? GRADIENT_IDS.output
                      : !isSent
                        ? GRADIENT_IDS.outputReceived
                        : GRADIENT_IDS.outputSent;
            const stroke = `url(#${outputGradientId})`;
            return <Path key={`out-${i}`} d={line.path} stroke={stroke} strokeWidth={line.strokeWidth} fill="none" />;
          })}
      </Svg>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  chartWrap: {
    position: 'relative',
  },
});

export default TxBowtieGraph;
export { buildInputOutputData, computeBowtieLayout };
export type { BuildInputOutputResult, Xput };
