import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { useTheme } from './themes';

const TOOLTIP_MIN_HEIGHT = 36;
const TOOLTIP_PADDING_V = 8;
const TOOLTIP_PADDING_H = 12;
const GAP = 4;

export type FlowStrandTooltipProps = {
  label: string;
  amount: string;
  bounds: { outerY: number; thickness: number; side: 'left' | 'right' };
  chartWidth: number;
  chartHeight: number;
  onDismiss: () => void;
};

const FlowStrandTooltip: React.FC<FlowStrandTooltipProps> = ({ label, amount, bounds, chartWidth, chartHeight, onDismiss }) => {
  const { colors } = useTheme();
  const preferAbove = bounds.outerY > chartHeight / 2;
  const tooltipHeight = TOOLTIP_MIN_HEIGHT;
  const aboveTop = bounds.outerY - bounds.thickness / 2 - tooltipHeight - GAP;
  const belowTop = bounds.outerY + bounds.thickness / 2 + GAP;
  const top = preferAbove ? Math.max(0, aboveTop) : Math.min(chartHeight - tooltipHeight, belowTop);
  const left = bounds.side === 'left' ? GAP : chartWidth - 120 - GAP;
  const clampedLeft = Math.max(GAP, Math.min(left, chartWidth - 124));

  const cardStyle = {
    backgroundColor: colors.elevated ?? colors.background,
    borderColor: colors.lightBorder,
  };

  return (
    <TouchableOpacity style={[styles.tooltip, { top, left: clampedLeft, ...cardStyle }]} onPress={onDismiss} activeOpacity={1}>
      <Text style={[styles.label, { color: colors.foregroundColor }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.amount, { color: colors.alternativeTextColor }]} numberOfLines={1}>
        {amount}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  tooltip: {
    position: 'absolute',
    minHeight: TOOLTIP_MIN_HEIGHT,
    paddingVertical: TOOLTIP_PADDING_V,
    paddingHorizontal: TOOLTIP_PADDING_H,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: 120,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  amount: {
    fontSize: 11,
    marginTop: 2,
  },
});

export default FlowStrandTooltip;
