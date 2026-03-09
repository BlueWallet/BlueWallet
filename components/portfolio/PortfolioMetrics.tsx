import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../themes';
import { PortfolioMetrics as PortfolioMetricsType } from '../../class/portfolio/portfolio-calculator';
import { formatBalanceWithoutSuffix } from '../../loc';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import loc from '../../loc';

interface PortfolioMetricsProps {
  metrics: PortfolioMetricsType | null;
  currency: string;
  isLoading?: boolean;
}

const PortfolioMetrics: React.FC<PortfolioMetricsProps> = ({ metrics, currency, isLoading }) => {
  const { colors } = useTheme();

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number): string => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const metricBg = colors.buttonDisabledBackgroundColor || '#F3F4F6';

  if (isLoading || !metrics) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.brandingColor} />
          <Text style={[styles.loadingText, { color: colors.alternativeTextColor }]}>
            {loc.portfolio.loading || 'Loading...'}
          </Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: metricBg }]}>
          <View style={[styles.placeholder, { backgroundColor: colors.alternativeTextColor }]} />
          <View style={[styles.placeholderValue, { backgroundColor: colors.alternativeTextColor }]} />
        </View>
        <View style={[styles.metricCard, { backgroundColor: metricBg }]}>
          <View style={[styles.placeholder, { backgroundColor: colors.alternativeTextColor }]} />
          <View style={[styles.placeholderValue, { backgroundColor: colors.alternativeTextColor }]} />
        </View>
        <View style={[styles.metricCard, { backgroundColor: metricBg }]}>
          <View style={[styles.placeholder, { backgroundColor: colors.alternativeTextColor }]} />
          <View style={[styles.placeholderValue, { backgroundColor: colors.alternativeTextColor }]} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Unrealized Return */}
      <View style={[styles.metricCard, { backgroundColor: metricBg }]}>
        <View style={styles.metricLabelBlock}>
          <Text style={[styles.metricTitle, { color: colors.foregroundColor }]}>Return</Text>
          <Text style={[styles.metricSubtitle, { color: colors.alternativeTextColor }]}>Unrealized</Text>
        </View>
        <View style={styles.metricValueContainer}>
          <Text style={[styles.metricValue, { color: colors.foregroundColor }]}>
            {formatCurrency(metrics.unrealizedReturn)}
          </Text>
          <Text style={[styles.metricPercent, { color: colors.foregroundColor }]}>
            {formatPercent(metrics.unrealizedReturnPercent)}
          </Text>
        </View>
      </View>

      {/* Average Buy Price */}
      <View style={[styles.metricCard, { backgroundColor: metricBg }]}>
        <View style={styles.metricLabelBlock}>
          <Text style={[styles.metricTitle, { color: colors.foregroundColor }]}>Buy Price</Text>
          <Text style={[styles.metricSubtitle, { color: colors.alternativeTextColor }]}>Average</Text>
        </View>
        <Text style={[styles.metricValue, { color: colors.foregroundColor }]}>
          {metrics.averageBuyPrice > 0 ? formatCurrency(metrics.averageBuyPrice) : 'N/A'}
        </Text>
      </View>

      {/* Cost Basis */}
      <View style={[styles.metricCard, { backgroundColor: metricBg }]}>
        <View style={styles.metricLabelBlock}>
          <Text style={[styles.metricTitle, { color: colors.foregroundColor }]}>Cost</Text>
          <Text style={[styles.metricSubtitle, { color: colors.alternativeTextColor }]}>Basis</Text>
        </View>
        <Text style={[styles.metricValue, { color: colors.foregroundColor }]}>
          {formatCurrency(metrics.costBasis)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
  },
  metricCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 6,
    marginBottom: 12,
  },
  placeholder: {
    height: 14,
    width: 120,
    borderRadius: 4,
    opacity: 0.3,
  },
  placeholderValue: {
    height: 16,
    width: 80,
    borderRadius: 4,
    opacity: 0.3,
  },
  metricLabelBlock: {
    flex: 1,
  },
  metricTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  metricSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  metricValueContainer: {
    alignItems: 'flex-end',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  metricPercent: {
    fontSize: 12,
    marginTop: 2,
  },
});

export default PortfolioMetrics;

