import React from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import {
  buildInputOutputData,
  computeBowtieLayout,
  type Xput,
  type BuildInputOutputResult,
} from './txBowtieGraphUtils';

const CHART_HEIGHT = 180;

/** Mempool-style bowtie colors: primary (blue), accent (light blue) */
const MEMPOOL_COLORS = {
  primary: '#007cfa',
  mainnetAlt: '#DBEFFD',
  feeMuted: 'rgba(0, 124, 250, 0.75)',
} as const;

const GRADIENT_IDS = {
  input: 'txBowtieInputGradient',
  output: 'txBowtieOutputGradient',
  fee: 'txBowtieFeeGradient',
  middle: 'txBowtieMiddleGradient',
} as const;

const FALLBACK_INPUT_COLOR = MEMPOOL_COLORS.mainnetAlt;

export type TxBowtieGraphProps = {
  inputData: Xput[];
  outputData: Xput[];
  totalValue: number;
  width: number;
  height?: number;
  colors?: {
    output?: string;
    fee?: string;
    middle?: string;
  };
};

const TxBowtieGraph: React.FC<TxBowtieGraphProps> = ({
  inputData,
  outputData,
  totalValue,
  width,
  height = CHART_HEIGHT,
  colors: colorsProp,
}) => {
  const { inputs, outputs, middle, hasLine } = computeBowtieLayout(
    inputData,
    outputData,
    totalValue,
    { width, height },
  );

  if (!hasLine) {
    return null;
  }

  return (
    <View style={{ width, height }}>
      <Svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width, height }}
      >
        <Defs>
          {/* Input: left (mainnet-alt) → right (primary), like mempool input-gradient */}
          <LinearGradient id={GRADIENT_IDS.input} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={MEMPOOL_COLORS.mainnetAlt} />
            <Stop offset="100%" stopColor={MEMPOOL_COLORS.primary} />
          </LinearGradient>
          {/* Output: left (primary) → right (mainnet-alt), like mempool output-gradient */}
          <LinearGradient id={GRADIENT_IDS.output} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={MEMPOOL_COLORS.primary} />
            <Stop offset="100%" stopColor={MEMPOOL_COLORS.mainnetAlt} />
          </LinearGradient>
          {/* Fee: primary fading to transparent, like mempool fee-gradient */}
          <LinearGradient id={GRADIENT_IDS.fee} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={MEMPOOL_COLORS.primary} />
            <Stop offset="50%" stopColor={MEMPOOL_COLORS.primary} />
            <Stop offset="100%" stopColor={MEMPOOL_COLORS.primary} stopOpacity="0" />
          </LinearGradient>
          {/* Middle bar: primary (solid in mempool) */}
          <LinearGradient id={GRADIENT_IDS.middle} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={MEMPOOL_COLORS.primary} />
            <Stop offset="100%" stopColor={MEMPOOL_COLORS.primary} />
          </LinearGradient>
        </Defs>
        <Path
          d={middle.path}
          stroke={`url(#${GRADIENT_IDS.middle})`}
          strokeWidth={middle.strokeWidth}
          fill="none"
        />
        {inputs.map((line, i) => (
          <Path
            key={`in-${i}`}
            d={line.path}
            stroke={line.stroke ?? `url(#${GRADIENT_IDS.input})`}
            strokeWidth={line.strokeWidth}
            fill="none"
          />
        ))}
        {outputs.map((line, i) => {
          const isFee = outputData[i]?.type === 'fee';
          const stroke = isFee ? `url(#${GRADIENT_IDS.fee})` : `url(#${GRADIENT_IDS.output})`;
          return (
            <Path
              key={`out-${i}`}
              d={line.path}
              stroke={stroke}
              strokeWidth={line.strokeWidth}
              fill="none"
            />
          );
        })}
      </Svg>
    </View>
  );
};

export default TxBowtieGraph;
export { buildInputOutputData, computeBowtieLayout };
export type { BuildInputOutputResult, Xput };
