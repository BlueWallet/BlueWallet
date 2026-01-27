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

  if (isLoading || !metrics) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.foregroundColor }]}>
          {loc.portfolio.metrics_title || 'Portfolio Metrics'}
        </Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.brandingColor} />
          <Text style={[styles.loadingText, { color: colors.foregroundColor }]}>
            {loc.portfolio.loading || 'Loading...'}
          </Text>
        </View>
        {/* Placeholder rows to maintain height */}
        <View style={styles.metricRow}>
          <View style={[styles.placeholder, { backgroundColor: colors.buttonDisabledBackgroundColor }]} />
          <View style={[styles.placeholderValue, { backgroundColor: colors.buttonDisabledBackgroundColor }]} />
        </View>
        <View style={styles.metricRow}>
          <View style={[styles.placeholder, { backgroundColor: colors.buttonDisabledBackgroundColor }]} />
          <View style={[styles.placeholderValue, { backgroundColor: colors.buttonDisabledBackgroundColor }]} />
        </View>
        <View style={styles.metricRow}>
          <View style={[styles.placeholder, { backgroundColor: colors.buttonDisabledBackgroundColor }]} />
          <View style={[styles.placeholderValue, { backgroundColor: colors.buttonDisabledBackgroundColor }]} />
        </View>
      </View>
    );
  }

  const unrealizedReturnColor = metrics.unrealizedReturn >= 0 ? colors.success : colors.danger;


  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.foregroundColor }]}>
        {loc.portfolio.metrics_title || 'Portfolio Metrics'}
      </Text>

      {/* Unrealized Return */}
      <View style={styles.metricRow}>
        <Text style={[styles.metricLabel, { color: colors.alternativeTextColor }]}>
          {loc.portfolio.unrealized_return || 'Unrealized Return'}
        </Text>
        <View style={styles.metricValueContainer}>
          <Text style={[styles.metricValue, { color: unrealizedReturnColor }]}>
            {formatCurrency(metrics.unrealizedReturn)}
          </Text>
          <Text style={[styles.metricPercent, { color: unrealizedReturnColor }]}>
            {formatPercent(metrics.unrealizedReturnPercent)}
          </Text>
        </View>
      </View>

      {/* Average Buy Price */}
      <View style={styles.metricRow}>
        <Text style={[styles.metricLabel, { color: colors.alternativeTextColor }]}>
          {loc.portfolio.average_buy_price || 'Average Buy Price'}
        </Text>
        <Text style={[styles.metricValue, { color: colors.foregroundColor }]}>
          {metrics.averageBuyPrice > 0 ? formatCurrency(metrics.averageBuyPrice) : 'N/A'}
        </Text>
      </View>

      {/* Cost Basis */}
      <View style={styles.metricRow}>
        <Text style={[styles.metricLabel, { color: colors.alternativeTextColor }]}>
          {loc.portfolio.cost_basis || 'Cost Basis'}
        </Text>
        <Text style={[styles.metricValue, { color: colors.foregroundColor }]}>
          {formatCurrency(metrics.costBasis)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    margin: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#9BA0A9',
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
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricLabel: {
    fontSize: 14,
    flex: 1,
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

