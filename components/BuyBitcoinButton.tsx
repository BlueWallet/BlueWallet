import React from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text } from 'react-native';

import loc from '../loc';
import { Chain } from '../models/bitcoinUnits';

/** MoonPay publishable key. Safe to ship in the client. */
export const MOONPAY_API_KEY = 'pk_live_IkhSI2lIXSiolwakfd95QFD4p3908cZa';

export const buyBitcoinUrl = (address: string): string =>
  `https://moonpay-redirect.herokuapp.com/?apiKey=${MOONPAY_API_KEY}&walletAddress=${address}`;

export type BuyBitcoinButtonVariant = 'empty' | 'list';

/** ISO 3166-1 alpha-2 codes where Buy Bitcoin stays hidden. */
export const BUY_BITCOIN_HIDDEN_COUNTRIES = new Set<string>(['GB']);

/** Where the buy-bitcoin button sits on an on-chain wallet. Lightning wallets and blocked countries get none. */
export const buyBitcoinButtonVariant = (chain: Chain, transactionCount: number, country: string): BuyBitcoinButtonVariant | null => {
  if (chain !== Chain.ONCHAIN) return null;
  if (BUY_BITCOIN_HIDDEN_COUNTRIES.has(country.toUpperCase())) return null;
  return transactionCount > 0 ? 'list' : 'empty';
};

interface BuyBitcoinButtonProps {
  variant: BuyBitcoinButtonVariant;
  getReceiveAddress: () => Promise<string | false | undefined>;
}

export const BuyBitcoinButton: React.FC<BuyBitcoinButtonProps> = ({ variant, getReceiveAddress }) => {
  const isEmpty = variant === 'empty';

  const onPress = async () => {
    let address: string | false | undefined;
    try {
      address = await getReceiveAddress();
    } catch (error) {
      console.warn('Failed to fetch buy-bitcoin receive address:', error);
    }
    if (!address) {
      Alert.alert(loc.errors.error, loc.receive.address_not_found);
      return;
    }
    Linking.openURL(buyBitcoinUrl(address)).catch(() => {
      Alert.alert(loc.errors.error, loc.transactions.open_url_error);
    });
  };

  return (
    <Pressable
      accessibilityRole="button"
      testID="BuyBitcoinButton"
      onPress={onPress}
      style={({ pressed }) => [isEmpty ? styles.empty : styles.list, pressed && styles.pressed]}
    >
      <Text style={isEmpty ? styles.emptyText : styles.listText}>{loc.wallets.buy_bitcoin}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  empty: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3478F6',
    minWidth: 260,
    width: 260,
    height: 44,
    minHeight: 44,
    flexShrink: 0,
    borderRadius: 9,
    paddingHorizontal: 32,
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  list: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F2',
    height: 49,
    minHeight: 49,
    flexShrink: 0,
    borderRadius: 9,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  listText: {
    color: '#13244D',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
