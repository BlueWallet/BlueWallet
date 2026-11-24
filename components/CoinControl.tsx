/**
 * Coin control on the send screen, as rows of a card: a switch row that
 * reveals the coins, then one checkbox row each with its amount and address,
 * so the send spends only the ticked ones. The screen has one for the wallet's
 * coins and another, apart, for its silent payments.
 */

import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { satsToXna } from '../blue_modules/neurai/amounts';
import type { WalletCoin } from '../class/wallets/abstract-neurai-wallet';
import Icon, { MaterialIconName } from './Icon';
import NeuraiLoader from './NeuraiLoader';
import { useSettingsPalette } from './settings/SettingsUI';

export const coinKey = (coin: WalletCoin) => `${coin.txid}:${coin.outputIndex}`;
export const sumSats = (coins: WalletCoin[]) => coins.reduce((sum, c) => sum + c.satoshis, 0n);

interface CoinControlProps {
  label: string;
  subtitle?: string;
  icon: MaterialIconName;
  /** Switch, icon and ticks. */
  accent: string;
  /** Circle behind the icon. */
  accentSoft: string;
  /** Prefix of the switch's and the rows' test IDs. */
  testID: string;
  coins: WalletCoin[];
  isOn: boolean;
  onSwitch: (on: boolean) => void;
  selected: ReadonlySet<string>;
  onToggleCoin: (coin: WalletCoin) => void;
  isLoading?: boolean;
  loadingText?: string;
  disabled?: boolean;
  emptyText?: string;
  /** Not the first rows of their card: a divider above. */
  divider?: boolean;
}

const CoinControl: React.FC<CoinControlProps> = ({
  label,
  subtitle,
  icon,
  accent,
  accentSoft,
  testID,
  coins,
  isOn,
  onSwitch,
  selected,
  onToggleCoin,
  isLoading = false,
  loadingText,
  disabled = false,
  emptyText,
  divider,
}) => {
  const p = useSettingsPalette();
  const line = { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: p.divider };

  return (
    <>
      <View style={[styles.row, divider && line]}>
        <View style={[styles.iconCircle, { backgroundColor: accentSoft }]}>
          <Icon name={icon} type="material" size={20} color={accent} />
        </View>
        <View style={styles.texts}>
          <Text style={[styles.title, { color: p.ink }]}>{label}</Text>
          {subtitle ? <Text style={[styles.subtitle, { color: p.mutedOnCard }]}>{subtitle}</Text> : null}
        </View>
        <Switch
          testID={`${testID}Switch`}
          value={isOn}
          onValueChange={onSwitch}
          disabled={disabled}
          accessibilityLabel={label}
          trackColor={{ false: p.switchOff, true: accent }}
          thumbColor="#ffffff"
          ios_backgroundColor={p.switchOff}
        />
      </View>
      {isOn &&
        (isLoading ? (
          <View style={[styles.note, line]}>
            <NeuraiLoader size={28} />
            <Text style={[styles.subtitle, { color: p.mutedOnCard }]}>{loadingText}</Text>
          </View>
        ) : coins.length === 0 ? (
          <View style={[styles.note, line]}>
            <Text style={[styles.subtitle, { color: p.mutedOnCard }]}>{emptyText}</Text>
          </View>
        ) : (
          coins.map(coin => {
            const checked = selected.has(coinKey(coin));
            return (
              <Pressable
                key={coinKey(coin)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                testID={`${testID}Coin-${coinKey(coin)}`}
                onPress={() => onToggleCoin(coin)}
                disabled={disabled}
                style={({ pressed }) => [styles.coin, line, pressed && styles.pressed]}
              >
                <Icon
                  name={checked ? 'check-circle' : 'radio-button-unchecked'}
                  type="material"
                  size={22}
                  color={checked ? accent : p.mutedOnCard}
                />
                <View style={styles.texts}>
                  <Text style={[styles.amount, { color: p.ink }]}>{`${satsToXna(coin.satoshis)} XNA`}</Text>
                  <Text style={[styles.address, { color: p.mutedOnCard }]} numberOfLines={1} ellipsizeMode="middle">
                    {coin.address}
                  </Text>
                </View>
              </Pressable>
            );
          })
        ))}
    </>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', columnGap: 12, minHeight: 64, paddingVertical: 10 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, rowGap: 2 },
  title: { fontSize: 15, fontWeight: '600' },
  subtitle: { fontSize: 13, lineHeight: 18 },
  note: { flexDirection: 'row', alignItems: 'center', columnGap: 12, paddingVertical: 12, paddingLeft: 52 },
  coin: { flexDirection: 'row', alignItems: 'center', columnGap: 12, minHeight: 56, paddingVertical: 8, paddingLeft: 9 },
  pressed: { opacity: 0.6 },
  amount: { fontSize: 15, fontWeight: '600' },
  address: { fontFamily: 'monospace', fontSize: 12 },
});

export default CoinControl;
