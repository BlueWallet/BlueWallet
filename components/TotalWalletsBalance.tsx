import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useStorage } from '../hooks/context/useStorage';
import { color } from '@rneui/base';
import { pad } from 'crypto-js';
import loc, { formatBalanceWithoutSuffix } from '../loc';
import { BitcoinUnit } from '../models/bitcoinUnits';
import ToolTipMenu from './TooltipMenu';
import { CommonToolTipActions } from '../typings/CommonToolTipActions';
import { useSettings } from '../hooks/context/useSettings';

export const TotalWalletsBalanceKey = 'TotalWalletsBalance';
const TotalWalletsBalance: React.FC = () => {
  const { wallets } = useStorage();
  const { preferredFiatCurrency } = useSettings();

  // Calculate total balance from all wallets
  const totalBalance = wallets.reduce((prev, curr) => {
    if (!curr.hideBalance) {
      return prev + curr.getBalance();
    }
    return prev;
  }, 0);

  const formattedBalance = formatBalanceWithoutSuffix(Number(totalBalance), BitcoinUnit.BTC, true);

  const toolTipActions = useMemo(() => {
    const viewInFiat = CommonToolTipActions.ViewInFiat;
    viewInFiat.text = loc.formatString(loc.wallets.view_in_fiat, { currency: preferredFiatCurrency.endPointKey });

    return [viewInFiat, CommonToolTipActions.HideBalance];
  }, [preferredFiatCurrency]);

  return (
    <ToolTipMenu actions={toolTipActions}>
      <View style={styles.container}>
        <Text style={styles.label}>{loc.wallets.total_balance}</Text>
        <Text style={styles.balance}>
          {formattedBalance} <Text style={styles.currency}>{BitcoinUnit.BTC}</Text>
        </Text>
      </View>
    </ToolTipMenu>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
    color: '#9BA0A9',
  },
  balance: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1D2B53',
  },
  currency: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1D2B53',
  },
});

export default TotalWalletsBalance;
