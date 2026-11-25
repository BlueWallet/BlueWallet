import React, { useState } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, Text, View } from 'react-native';

import { shortenFormattedAmount, splitFormattedAmount, splitShortenedAmount } from '../../blue_modules/neurai/amounts';
import { SILENT_PAYMENT_ACCENT } from '../../blue_modules/neurai/silentPayments';
import type { TWallet } from '../../class/wallets/types';
import { useSettings } from '../../hooks/context/useSettings';
import loc, { formatBalance, formatBalanceWithoutSuffix, transactionTimeToReadable } from '../../loc';
import { FiatUnit } from '../../models/fiatUnit';
import { XnaUnit } from '../../models/xnaUnits';
import Icon from '../Icon';
import { HOME_MAX_DECIMALS, useHomePalette } from './homeTheme';

interface HomeBalanceProps {
  wallet: TWallet;
  balance: bigint;
  /** The part of `balance` on silent payment addresses (ECDSA wallets). */
  silentBalance?: bigint;
  /** The private balance last read in the privacy pool, on top of `balance`, and when it was read. */
  poolBalance?: bigint;
  poolSeenAt?: number;
  /** Opens the privacy tab, where the pool is read again. */
  onOpenPool?: () => void;
  unit: XnaUnit;
  hidden: boolean;
  /** Testnet coins have no fiat value: no conversion line. */
  testnet: boolean;
  unitSwitching?: boolean;
  onCycleUnit: () => void;
  onToggleHidden: () => void;
}

const HIDDEN = '••••••';

/**
 * Colour of each part of the balance, on its line: the plain coins in grey,
 * the silent payments in their purple, the privacy pool in the orange of the
 * privacy tab.
 */
const PART_COLORS = {
  light: { wallet: '#d1d5db', silent: SILENT_PAYMENT_ACCENT, pool: '#ea580c' },
  dark: { wallet: '#4b5563', silent: '#a78bfa', pool: '#fb923c' },
};

/** Opening and closing the breakdown: a quick fade, the rows below sliding with it. */
const UNFOLD = LayoutAnimation.create(180, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity);

/** One line of the open breakdown: its colour, where that part is, and how much. */
const BreakdownRow: React.FC<{
  color: string;
  title: string;
  note?: string;
  amount: string;
  onPress?: () => void;
  testID?: string;
}> = ({ color, title, note, amount, onPress, testID }) => {
  const p = useHomePalette();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={[title, note, amount].filter(Boolean).join(', ')}
      testID={testID}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.rowTitle, { color: p.ink }]} numberOfLines={1}>
        {title}
        {note ? <Text style={[styles.rowNote, { color: p.mutedOnCard }]}>{` · ${note}`}</Text> : null}
      </Text>
      <Text style={[styles.rowAmount, { color: p.ink }]} numberOfLines={1}>
        {amount}
      </Text>
      {onPress ? <Icon name="chevron-right" type="material" size={16} color={p.mutedOnCard} /> : null}
    </Pressable>
  );
};

/**
 * The wallet's balance, with the eye that hides it beside its label; a tap on
 * the number switches its unit. With silent payments (ECDSA wallets) or a private balance read
 * in the privacy pool (testnet), a round button on the right of the number
 * unfolds a card with a line per part: the wallet, the
 * silent payments (spent apart, from Send) and the pool, which counts in the
 * total from its last reading. Folded, only the button shows.
 */
const HomeBalance: React.FC<HomeBalanceProps> = ({
  wallet,
  balance,
  silentBalance = 0n,
  poolBalance = 0n,
  poolSeenAt = 0,
  onOpenPool,
  unit,
  hidden,
  testnet,
  unitSwitching,
  onCycleUnit,
  onToggleHidden,
}) => {
  const p = useHomePalette();
  const { preferredFiatCurrency } = useSettings();
  const fiat = unit === XnaUnit.LOCAL_CURRENCY;
  const fiatCode = preferredFiatCurrency?.endPointKey ?? FiatUnit.USD;
  const unitText = fiat ? fiatCode : loc.units[unit as 'XNA' | 'sats'];
  const [open, setOpen] = useState(false);
  // The pool's coins are not on the wallet's addresses: they count on top.
  const total = balance + poolBalance;

  let integer = HIDDEN;
  let decimals = '';
  let suffix = '';
  if (!hidden) {
    const text = wallet.amountsStale
      ? loc.wallets.pull_to_refresh
      : fiat
        ? formatBalance(total, unit, true)
        : formatBalanceWithoutSuffix(total, unit, true);
    // XNA shows at most HOME_MAX_DECIMALS decimals, cut not rounded; fiat keeps its own format.
    [integer, decimals, suffix] = fiat
      ? splitFormattedAmount(String(text || '0'))
      : splitShortenedAmount(String(text || '0'), HOME_MAX_DECIMALS);
  }

  // Testnet coins have no fiat value: no line there.
  let fiatLine = '';
  if (!hidden && !wallet.amountsStale && !testnet) {
    if (fiat) fiatLine = `≈ ${shortenFormattedAmount(formatBalance(total, XnaUnit.XNA, true), HOME_MAX_DECIMALS)}`;
    else fiatLine = `≈ ${formatBalance(total, XnaUnit.LOCAL_CURRENCY, true)}`;
  }

  // Hidden with the balance, so a glance does not tell that there are private funds either.
  const canBreakDown = !hidden && !wallet.amountsStale && (silentBalance > 0n || poolBalance > 0n);
  const colors = p.dark ? PART_COLORS.dark : PART_COLORS.light;
  const amountOf = (sats: bigint) => {
    const text = String(formatBalance(sats, unit, true));
    return fiat ? text : shortenFormattedAmount(text, HOME_MAX_DECIMALS);
  };
  const walletPart = balance > silentBalance ? balance - silentBalance : 0n;
  const toggle = () => {
    LayoutAnimation.configureNext(UNFOLD);
    setOpen(on => !on);
  };

  return (
    <View style={styles.root}>
      <View style={styles.labelRow}>
        <Pressable
          onPress={onToggleHidden}
          accessibilityRole="button"
          accessibilityLabel={loc.home.toggle_balance}
          testID="HomeBalanceVisibility"
          hitSlop={8}
          style={({ pressed }) => [styles.labelButton, pressed && styles.pressed]}
        >
          <Text style={[styles.label, { color: p.muted }]}>{poolBalance > 0n ? loc.home.total_balance : loc.home.available_balance}</Text>
          <Icon name={hidden ? 'visibility-off' : 'visibility'} type="material" size={17} color={p.muted} />
        </Pressable>
      </View>
      <View style={styles.amountRow}>
        {/* Tapping the balance switches its unit: XNA, sats, the local currency (not on testnet). */}
        <Pressable
          onPress={onCycleUnit}
          disabled={unitSwitching || hidden}
          accessibilityRole="button"
          accessibilityLabel={hidden ? loc.home.available_balance : `${integer}${decimals}${suffix} ${fiat ? '' : unitText}`.trim()}
          accessibilityHint={String(loc.formatString(loc.home.balance_unit, { unit: unitText }))}
          testID="HomeBalanceUnit"
          style={({ pressed }) => [styles.amountLine, pressed && styles.pressed]}
        >
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
        </Pressable>
        {canBreakDown ? (
          <Pressable
            onPress={toggle}
            accessibilityRole="button"
            accessibilityLabel={loc.home.breakdown}
            accessibilityState={{ expanded: open }}
            testID="HomeBalanceBreakdownToggle"
            style={({ pressed }) => [styles.toggle, { backgroundColor: p.card }, pressed && styles.pressed]}
          >
            <Icon name={open ? 'expand-less' : 'expand-more'} type="material" size={22} color={p.ink} />
          </Pressable>
        ) : null}
      </View>
      {fiatLine ? (
        <Text style={[styles.fiat, { color: p.muted }]} numberOfLines={1}>
          {fiatLine}
        </Text>
      ) : null}
      {canBreakDown && open ? (
        <View style={[styles.card, { backgroundColor: p.card }]} testID="HomeBalanceBreakdown">
          <BreakdownRow
            color={colors.wallet}
            title={loc.home.breakdown_wallet}
            amount={amountOf(walletPart)}
            testID="HomeBalanceWalletPart"
          />
          {silentBalance > 0n ? (
            <BreakdownRow
              color={colors.silent}
              title={loc.receive.silent_payments}
              amount={amountOf(silentBalance)}
              testID="HomeBalanceSilent"
            />
          ) : null}
          {poolBalance > 0n ? (
            <BreakdownRow
              color={colors.pool}
              title={loc.home.breakdown_pool}
              note={poolSeenAt ? transactionTimeToReadable(poolSeenAt) : undefined}
              amount={amountOf(poolBalance)}
              onPress={onOpenPool}
              testID="HomeBalancePool"
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4, rowGap: 2 },
  labelRow: { flexDirection: 'row', alignItems: 'center', minHeight: 36 },
  labelButton: { flexDirection: 'row', alignItems: 'center', columnGap: 6, minHeight: 36 },
  label: { fontSize: 13 },
  pressed: { opacity: 0.6 },
  amountRow: { flexDirection: 'row', alignItems: 'center', minHeight: 52 },
  amountLine: { flexDirection: 'row', alignItems: 'baseline', columnGap: 6, flexShrink: 1 },
  amount: { fontSize: 40, fontWeight: '700', letterSpacing: -1, flexShrink: 1 },
  amountDecimals: { fontSize: 26, fontWeight: '600', letterSpacing: -0.5 },
  amountUnit: { fontSize: 18, fontWeight: '600' },
  fiat: { fontSize: 14 },
  toggle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },
  card: { marginTop: 8, marginBottom: 2, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
  row: { flexDirection: 'row', alignItems: 'center', columnGap: 10, minHeight: 40 },
  rowTitle: { flex: 1, fontSize: 14 },
  rowNote: { fontSize: 12 },
  rowAmount: { fontSize: 14, fontWeight: '600' },
  dot: { width: 8, height: 8, borderRadius: 4 },
});

export default HomeBalance;
