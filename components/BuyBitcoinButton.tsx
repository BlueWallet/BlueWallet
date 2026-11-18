import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text } from 'react-native';

import loc from '../loc';
import { Chain } from '../models/bitcoinUnits';
import { useTheme } from './themes';

/** MoonPay publishable key. Safe to ship in the client. */
export const MOONPAY_API_KEY = 'pk_live_IkhSI2lIXSiolwakfd95QFD4p3908cZa';

/** Matches ReceiveDetails: don't wait on a full gap-limit Electrum scan before showing an address. */
export const BUY_BITCOIN_ADDRESS_TIMEOUT_MS = 1000;

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

type BuyBitcoinAddressWallet = {
  getAddressAsync(): Promise<string | false | undefined>;
  getAddress(): string | false | undefined;
  _getExternalAddressByIndex?(index: number): string | false | undefined;
  getNextFreeAddressIndex?(): number;
};

const isUsableAddress = (address: string | false | null | undefined): address is string =>
  typeof address === 'string' && address.length > 0;

/**
 * Prefer a freshly scanned receive address, but only wait `timeoutMs` for Electrum.
 * After that, derive the next address locally — the same fallback ReceiveDetails uses.
 */
export const resolveBuyBitcoinReceiveAddress = async (
  wallet: BuyBitcoinAddressWallet,
  {
    isElectrumDisabled,
    sleep,
    saveToDisk,
    timeoutMs = BUY_BITCOIN_ADDRESS_TIMEOUT_MS,
  }: {
    isElectrumDisabled: boolean;
    sleep: (ms: number) => Promise<void>;
    saveToDisk: () => Promise<unknown>;
    timeoutMs?: number;
  },
): Promise<string | undefined> => {
  if (!isElectrumDisabled) {
    try {
      const address = await Promise.race([wallet.getAddressAsync(), sleep(timeoutMs).then(() => undefined)]);
      if (isUsableAddress(address)) {
        try {
          await saveToDisk();
        } catch (error) {
          console.warn('Failed to persist buy-bitcoin receive address:', error);
        }
        return address;
      }
    } catch (error) {
      console.warn('Failed to fetch buy-bitcoin receive address:', error);
    }
  }

  if (wallet._getExternalAddressByIndex && wallet.getNextFreeAddressIndex) {
    try {
      const address = wallet._getExternalAddressByIndex(wallet.getNextFreeAddressIndex());
      if (isUsableAddress(address)) return address;
    } catch (error) {
      console.warn('Failed to derive buy-bitcoin receive address:', error);
    }
  }

  try {
    const address = wallet.getAddress();
    return isUsableAddress(address) ? address : undefined;
  } catch (error) {
    console.warn('Failed to read buy-bitcoin receive address:', error);
    return undefined;
  }
};

interface BuyBitcoinButtonProps {
  variant: BuyBitcoinButtonVariant;
  getReceiveAddress: () => Promise<string | false | undefined>;
}

export const BuyBitcoinButton: React.FC<BuyBitcoinButtonProps> = ({ variant, getReceiveAddress }) => {
  const { colors } = useTheme();
  const isEmpty = variant === 'empty';
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const stylesHook = StyleSheet.create({
    empty: {
      backgroundColor: colors.mainColor,
    },
    list: {
      backgroundColor: colors.lightButton,
    },
    label: {
      color: colors.buttonTextColor,
    },
  });

  const onPress = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
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
      try {
        await Linking.openURL(buyBitcoinUrl(address));
      } catch {
        Alert.alert(loc.errors.error, loc.transactions.open_url_error);
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: busy, busy }}
      testID="BuyBitcoinButton"
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        isEmpty ? styles.empty : styles.list,
        isEmpty ? stylesHook.empty : stylesHook.list,
        pressed && styles.pressed,
      ]}
    >
      {busy ? (
        <ActivityIndicator testID="BuyBitcoinButtonActivity" color={colors.buttonTextColor} />
      ) : (
        <Text style={[styles.label, stylesHook.label]}>{loc.wallets.buy_bitcoin}</Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  empty: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: 9,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  list: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 49,
    flexShrink: 0,
    borderRadius: 9,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  label: {
    alignSelf: 'stretch',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
