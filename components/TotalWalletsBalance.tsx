import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useStorage } from '../hooks/context/useStorage';
import { color } from '@rneui/base';
import { pad } from 'crypto-js';
import loc from '../loc';

const TotalWalletsBalance: React.FC = () => {

  const { wallets } = useStorage();
  
  // Calculate total balance from all wallets
  const totalBalance = wallets.reduce((prev, curr) => {
    if (!curr.hideBalance) {
      return prev + curr.getBalance();
    }
    return prev;
  }, 0);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{loc.wallets.total_balance}</Text>
      <Text style={styles.balance}>
        {totalBalance.toFixed(5)} <Text style={styles.currency}>BTC</Text>
      </Text>
    </View>
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