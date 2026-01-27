import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../themes';
import { FeesData } from '../../class/portfolio/portfolio-calculator';
import { formatBalanceWithoutSuffix } from '../../loc';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import loc from '../../loc';

interface FeesDisplayProps {
  feesData: FeesData | null;
  currency: string;
  isLoading?: boolean;
}

const FeesDisplay: React.FC<FeesDisplayProps> = ({ feesData, currency, isLoading }) => {
  const { colors } = useTheme();

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  if (isLoading || !feesData) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.foregroundColor }]}>
          {loc.portfolio.fees_title || 'Transaction Fees'}
        </Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.brandingColor} />
          <Text style={[styles.loadingText, { color: colors.foregroundColor }]}>
            {loc.portfolio.loading || 'Loading...'}
          </Text>
        </View>
        {/* Placeholder rows to maintain height */}
        <View style={styles.feeRow}>
          <View style={[styles.placeholder, { backgroundColor: colors.buttonDisabledBackgroundColor }]} />
          <View style={[styles.placeholderValue, { backgroundColor: colors.buttonDisabledBackgroundColor }]} />
        </View>
        <View style={styles.feeRow}>
          <View style={[styles.placeholder, { backgroundColor: colors.buttonDisabledBackgroundColor }]} />
          <View style={[styles.placeholderValue, { backgroundColor: colors.buttonDisabledBackgroundColor }]} />
        </View>
        <View style={styles.feeRow}>
          <View style={[styles.placeholder, { backgroundColor: colors.buttonDisabledBackgroundColor }]} />
          <View style={[styles.placeholderValue, { backgroundColor: colors.buttonDisabledBackgroundColor }]} />
        </View>
        <View style={styles.thresholdInfo}>
          <View style={[styles.placeholderThreshold, { backgroundColor: colors.buttonDisabledBackgroundColor }]} />
        </View>
      </View>
    );
  }

  const feesColor = feesData.isGood ? colors.success : colors.danger;
  const statusText = feesData.isGood
    ? loc.portfolio.fees_good || 'Good'
    : loc.portfolio.fees_bad || 'High';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.foregroundColor }]}>
        {loc.portfolio.fees_title || 'Transaction Fees'}
      </Text>

      {/* Total Fees in Bitcoin */}
      <View style={styles.feeRow}>
        <Text style={[styles.feeLabel, { color: colors.alternativeTextColor }]}>
          {loc.portfolio.fees_total_btc || 'Total Fees (BTC)'}
        </Text>
        <Text style={[styles.feeValue, { color: colors.foregroundColor }]}>
          {formatBalanceWithoutSuffix(feesData.totalFeesSats, BitcoinUnit.BTC, true)}
        </Text>
      </View>

      {/* Total Fees in Local Currency */}
      <View style={styles.feeRow}>
        <Text style={[styles.feeLabel, { color: colors.alternativeTextColor }]}>
          {loc.portfolio.fees_total_currency || 'Total Fees'}
        </Text>
        <Text style={[styles.feeValue, { color: colors.foregroundColor }]}>
          {formatCurrency(feesData.totalFeesValue)}
        </Text>
      </View>

      {/* Fees Percentage with Status */}
      <View style={styles.feeRow}>
        <Text style={[styles.feeLabel, { color: colors.alternativeTextColor }]}>
          {loc.portfolio.fees_percentage || 'Fees %'}
        </Text>
        <View style={styles.feeStatusContainer}>
          <Text style={[styles.feeValue, { color: feesColor }]}>
            {feesData.feesPercent.toFixed(2)}%
          </Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: feesColor,
              },
            ]}
          >
            <Text style={[styles.statusText, { color: colors.buttonTextColor }]}>{statusText}</Text>
          </View>
        </View>
      </View>

      {/* Threshold Info */}
      <View style={styles.thresholdInfo}>
        <Text style={[styles.thresholdText, { color: colors.alternativeTextColor }]}>
          {loc.portfolio.fees_threshold_info || '< 0.5% is considered good'}
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
  placeholderThreshold: {
    height: 12,
    width: 180,
    borderRadius: 4,
    opacity: 0.3,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  feeLabel: {
    fontSize: 14,
    flex: 1,
  },
  feeValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  feeStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  thresholdInfo: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  thresholdText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});

export default FeesDisplay;

