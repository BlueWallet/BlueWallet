import React, { useState, useEffect, useCallback } from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../themes';
import { useStorage } from '../../hooks/context/useStorage';
import { useSettings } from '../../hooks/context/useSettings';
import { Chain } from '../../models/bitcoinUnits';
import { getPreferredCurrency } from '../../blue_modules/currency';
import { FiatUnit } from '../../models/fiatUnit';
import { PortfolioCalculator, PortfolioMetrics as PortfolioMetricsType } from '../../class/portfolio/portfolio-calculator';
import loc from '../../loc';

const PortfolioBox: React.FC = () => {
  const { wallets } = useStorage();
  const { preferredFiatCurrency } = useSettings();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [metrics, setMetrics] = useState<PortfolioMetricsType | null>(null);
  const [currency, setCurrency] = useState<string>('USD');
  const [currencySymbol, setCurrencySymbol] = useState<string>('$');

  const hasOnChainWallet = wallets.some(wallet => wallet.chain === Chain.ONCHAIN);

  useEffect(() => {
    const loadCurrency = async () => {
      const preferred = await getPreferredCurrency();
      setCurrency(preferred.endPointKey);
      const fiatUnit = FiatUnit[preferred.endPointKey];
      setCurrencySymbol(fiatUnit?.symbol ?? '$');
    };
    loadCurrency();
  }, [preferredFiatCurrency]);

  useEffect(() => {
    if (!hasOnChainWallet) {
      setMetrics(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const result = await PortfolioCalculator.getMetrics(wallets, currency);
        if (!cancelled) setMetrics(result);
      } catch {
        if (!cancelled) setMetrics(null);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [wallets, currency, hasOnChainWallet]);

  const handlePress = useCallback(() => {
    navigation.navigate('Portfolio' as never);
  }, [navigation]);

  if (!hasOnChainWallet) {
    return null;
  }

  const formatCurrency = (value: number): string =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  const formatPercent = (value: number): string => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const metricBg = colors.buttonDisabledBackgroundColor || '#F3F4F6';

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[styles.card, { backgroundColor: metricBg }]}
      activeOpacity={0.7}
    >
      <View style={styles.labelBlock}>
        <Text style={[styles.title, { color: colors.foregroundColor }]}>{loc.portfolio.title || 'Portfolio'}</Text>
      </View>
      <View style={styles.valueBlock}>
        {metrics == null ? (
          <ActivityIndicator size="small" color={colors.foregroundColor} />
        ) : (
          <>
            <Text style={[styles.value, { color: colors.foregroundColor }]}>
              {formatCurrency(metrics.unrealizedReturn)}
            </Text>
            <Text style={[styles.percent, { color: colors.foregroundColor }]}>
              {formatPercent(metrics.unrealizedReturnPercent)}
            </Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 6,
  },
  labelBlock: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  valueBlock: {
    alignItems: 'flex-end',
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
  },
  percent: {
    fontSize: 12,
    marginTop: 2,
  },
});

export default PortfolioBox;
