import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../themes';
import { useStorage } from '../../hooks/context/useStorage';
import { formatBalanceWithoutSuffix } from '../../loc';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import { PortfolioCalculator } from '../../class/portfolio/portfolio-calculator';
import { PriceService } from '../../class/portfolio/price-service';

interface PortfolioTotalBalanceProps {
  currency: string;
  currencySymbol: string;
}

const PortfolioTotalBalance: React.FC<PortfolioTotalBalanceProps> = ({ currency, currencySymbol }) => {
  const { wallets } = useStorage();
  const { colors } = useTheme();
  const [localCurrencyBalance, setLocalCurrencyBalance] = useState<number | null>(null);

  // Memoize onChainWallets to prevent creating new array on every render
  const onChainWallets = useMemo(() => wallets.filter(w => w.chain === 'ONCHAIN'), [wallets]);
  const onChainWalletsLength = onChainWallets.length;
  
  // Create a stable key from wallet IDs to detect actual wallet changes
  const walletsKey = useMemo(() => wallets.map(w => w.getID()).join(','), [wallets]);
  
  useEffect(() => {
    const updateLocalCurrency = async () => {
      if (onChainWalletsLength === 0) {
        setLocalCurrencyBalance(null);
        return;
      }

      try {
        const price = await PriceService.getHistoricalPrice(new Date(), currency);
        if (price && price > 0) {
          const totalBalanceSats = PortfolioCalculator.calculateTotalBalance(wallets);
          const btcBalance = totalBalanceSats / 100000000;
          setLocalCurrencyBalance(btcBalance * price);
        }
      } catch (error) {
        console.warn('PortfolioTotalBalance: Failed to get current price:', error);
        setLocalCurrencyBalance(null);
      }
    };
    updateLocalCurrency();
  }, [walletsKey, currency, onChainWalletsLength]); // Use walletsKey to detect actual wallet changes

  if (onChainWallets.length === 0) {
    return null;
  }

  const totalBalanceSats = PortfolioCalculator.calculateTotalBalance(wallets);
  const btcFormatted = formatBalanceWithoutSuffix(totalBalanceSats, BitcoinUnit.BTC, true);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.label, { color: colors.alternativeTextColor }]}>Total Balance</Text>
      <Text style={[styles.btcBalance, { color: colors.foregroundColor }]}>
        {btcFormatted} BTC
      </Text>
      {localCurrencyBalance !== null && localCurrencyBalance > 0 && (
        <Text style={[styles.localCurrencyBalance, { color: colors.alternativeTextColor }]}>
          {currencySymbol} {localCurrencyBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  btcBalance: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  localCurrencyBalance: {
    fontSize: 18,
    fontWeight: '600',
  },
});

export default PortfolioTotalBalance;

