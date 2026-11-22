import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { shortenFormattedAmount, splitFormattedAmount, splitShortenedAmount } from '../../blue_modules/neurai/amounts';
import type { TWallet } from '../../class/wallets/types';
import { useSettings } from '../../hooks/context/useSettings';
import loc, { formatBalance, formatBalanceWithoutSuffix } from '../../loc';
import { FiatUnit } from '../../models/fiatUnit';
import { XnaUnit } from '../../models/xnaUnits';
import Icon from '../Icon';
import { HOME_MAX_DECIMALS, useHomePalette } from './homeTheme';

interface HomeBalanceProps {
  wallet: TWallet;
  balance: bigint;
  unit: XnaUnit;
  hidden: boolean;
  /** Testnet coins have no fiat value: no conversion line. */
  testnet: boolean;
  unitSwitching?: boolean;
  onCycleUnit: () => void;
  onToggleHidden: () => void;
  onOpenDetails: () => void;
}

const HIDDEN = '••••••';

/** The wallet's balance, its unit switch, the eye to hide it and the link to the wallet's details. */
const HomeBalance: React.FC<HomeBalanceProps> = ({
  wallet,
  balance,
  unit,
  hidden,
  testnet,
  unitSwitching,
  onCycleUnit,
  onToggleHidden,
  onOpenDetails,
}) => {
  const p = useHomePalette();
  const { preferredFiatCurrency } = useSettings();
  const fiat = unit === XnaUnit.LOCAL_CURRENCY;
  const fiatCode = preferredFiatCurrency?.endPointKey ?? FiatUnit.USD;
  const unitText = fiat ? fiatCode : loc.units[unit as 'XNA' | 'sats'];

  let integer = HIDDEN;
  let decimals = '';
  let suffix = '';
  if (!hidden) {
    const text = wallet.amountsStale
      ? loc.wallets.pull_to_refresh
      : fiat
        ? formatBalance(balance, unit, true)
        : formatBalanceWithoutSuffix(balance, unit, true);
    // XNA shows at most HOME_MAX_DECIMALS decimals, cut not rounded; fiat keeps its own format.
    [integer, decimals, suffix] = fiat
      ? splitFormattedAmount(String(text || '0'))
      : splitShortenedAmount(String(text || '0'), HOME_MAX_DECIMALS);
  }

  // Testnet coins have no fiat value: the line stays empty there.
  let secondLine = '';
  if (!hidden && !wallet.amountsStale && !testnet) {
    if (fiat) secondLine = `≈ ${shortenFormattedAmount(formatBalance(balance, XnaUnit.XNA, true), HOME_MAX_DECIMALS)}`;
    else secondLine = `≈ ${formatBalance(balance, XnaUnit.LOCAL_CURRENCY, true)}`;
  }

  return (
    <View style={styles.root}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: p.muted }]}>{loc.home.available_balance}</Text>
        <Pressable
          onPress={onCycleUnit}
          disabled={unitSwitching}
          accessibilityRole="button"
          accessibilityLabel={String(loc.formatString(loc.home.balance_unit, { unit: unitText }))}
          testID="HomeBalanceUnit"
          style={({ pressed }) => [styles.unitChip, { backgroundColor: p.card }, pressed && styles.pressed]}
        >
          <Text style={[styles.unitChipText, { color: p.ink }]}>{unitText}</Text>
          <Icon name="expand-more" type="material" size={18} color={p.ink} />
        </Pressable>
      </View>
      <View style={styles.amountRow}>
        {/* Only the number shrinks to fit a long balance; the unit beside it keeps its size. */}
        <View style={styles.amountLine}>
          <Text
            testID="WalletBalance"
            style={[styles.amount, { color: p.ink }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
          >
            {integer}
            {/* Decimals a size down, so the whole part stays big with all 8 of them. */}
            {decimals ? <Text style={[styles.amountDecimals, { color: p.muted }]}>{decimals}</Text> : null}
            {suffix}
          </Text>
          {!hidden && !fiat && !wallet.amountsStale ? (
            <Text style={[styles.amountUnit, { color: p.muted }]} numberOfLines={1}>
              {unitText}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={onToggleHidden}
          accessibilityRole="button"
          accessibilityLabel={loc.home.toggle_balance}
          testID="HomeBalanceVisibility"
          hitSlop={4}
          style={({ pressed }) => [styles.eye, pressed && styles.pressed]}
        >
          <Icon name={hidden ? 'visibility-off' : 'visibility'} type="material" size={22} color={p.muted} />
        </Pressable>
      </View>
      <View style={styles.footRow}>
        <Text style={[styles.second, { color: p.muted }]} numberOfLines={1}>
          {secondLine}
        </Text>
        <Pressable
          onPress={onOpenDetails}
          accessibilityRole="button"
          testID="WalletDetails"
          style={({ pressed }) => [styles.details, pressed && styles.pressed]}
        >
          <Text style={[styles.detailsText, { color: p.accentText }]}>{loc.home.view_details}</Text>
          <Icon name="chevron-right" type="material" size={18} color={p.accentText} />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { paddingHorizontal: 20, paddingTop: 8, rowGap: 2 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  label: { fontSize: 13 },
  unitChip: { flexDirection: 'row', alignItems: 'center', height: 40, paddingLeft: 14, paddingRight: 10, borderRadius: 20, columnGap: 2 },
  unitChipText: { fontSize: 14, fontWeight: '600' },
  pressed: { opacity: 0.6 },
  amountRow: { flexDirection: 'row', alignItems: 'center', columnGap: 4 },
  amountLine: { flexDirection: 'row', alignItems: 'baseline', columnGap: 6, flexShrink: 1 },
  amount: { fontSize: 40, fontWeight: '700', letterSpacing: -1, flexShrink: 1 },
  amountDecimals: { fontSize: 26, fontWeight: '600', letterSpacing: -0.5 },
  amountUnit: { fontSize: 18, fontWeight: '600' },
  eye: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  footRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', columnGap: 12 },
  second: { fontSize: 14, flexShrink: 1 },
  details: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  detailsText: { fontSize: 14, fontWeight: '600' },
});

export default HomeBalance;
