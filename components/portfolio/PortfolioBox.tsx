import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../themes';
import { useStorage } from '../../hooks/context/useStorage';
import { Chain } from '../../models/bitcoinUnits';
import loc from '../../loc';

const PortfolioBox: React.FC = () => {
  const { wallets } = useStorage();
  const { colors } = useTheme();
  const navigation = useNavigation();

  // Only show if user has at least one on-chain wallet
  const hasOnChainWallet = wallets.some(wallet => wallet.chain === Chain.ONCHAIN);

  if (!hasOnChainWallet) {
    return null;
  }

  const handlePress = () => {
    navigation.navigate('Portfolio' as never);
  };

  const stylesHook = StyleSheet.create({
    text: {
      color: colors.foregroundColor,
    },
  });

  return (
    <TouchableOpacity onPress={handlePress} style={styles.container}>
      <Text style={[styles.text, stylesHook.text]}>{loc.portfolio.title || 'Portfolio'}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: 'flex-start',
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default PortfolioBox;

