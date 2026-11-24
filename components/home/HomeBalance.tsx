import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { shortenFormattedAmount, splitFormattedAmount, splitShortenedAmount } from '../../blue_modules/neurai/amounts';
import { SILENT_PAYMENT_ACCENT } from '../../blue_modules/neurai/silentPayments';
import type { TWallet } from '../../class/wallets/types';
import { useSettings } from '../../hooks/context/useSettings';
import loc, { formatBalance, formatBalanceWithoutSuffix, transactionTimeToReadable } from '../../loc';
import { FiatUnit } from '../../models/fiatUnit';
import { XnaUnit } from '../../models/xnaUnits';
import Icon, { MaterialIconName } from '../Icon';
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
  onOpenDetails: () => void;
}

const HIDDEN = '••••••';

/** The purple of silent payments and the privacy pool, for the breakdown. */
const PRIVATE_TONE = {
  light: { bg: '#f3e8ff', fg: '#6b21a8' },
  dark: { bg: 'rgba(124, 58, 237, 0.24)', fg: '#d8b4fe' },
};

/** One line of the breakdown: where that part of the balance is, and how much. */
const BreakdownRow: React.FC<{
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle?: string;
  amount: string;
  amountColor: string;
  divider?: string;
  onPress?: () => void;
  testID?: string;
}> = ({ icon, iconBg, title, subtitle, amount, amountColor, divider, onPress, testID }) => {
  const p = useHomePalette();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={[title, subtitle, amount].filter(Boolean).join(', ')}
      testID={testID}
      style={({ pressed }) => [
        styles.breakdownRow,
        divider ? { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: divider } : null,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.breakdownIcon, { backgroundColor: iconBg }]}>{icon}</View>
      <View style={styles.breakdownTexts}>
        <Text style={[styles.breakdownTitle, { color: p.ink }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.breakdownSubtitle, { color: p.mutedOnCard }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.breakdownAmount, { color: amountColor }]} numberOfLines={1}>
        {amount}
      </Text>
      {onPress ? <Icon name="chevron-right" type="material" size={18} color={p.mutedOnCard} /> : null}
    </Pressable>
  );
};

/**
 * The wallet's balance, its unit switch, the eye to hide it and the link to
 * the wallet's details. With silent payments (ECDSA wallets) or a private
 * balance read in the privacy pool (testnet), a button beside it unfolds where
 * it is: the wallet, the silent payments (spent apart, from Send) and the
 * pool, which counts in the total from its last reading.
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
  onOpenDetails,
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

  // Testnet coins have no fiat value: the line stays empty there.
  let secondLine = '';
  if (!hidden && !wallet.amountsStale && !testnet) {
    if (fiat) secondLine = `≈ ${shortenFormattedAmount(formatBalance(total, XnaUnit.XNA, true), HOME_MAX_DECIMALS)}`;
    else secondLine = `≈ ${formatBalance(total, XnaUnit.LOCAL_CURRENCY, true)}`;
  }

  // Hidden with the balance, so a glance does not tell that there are private funds either.
  const canBreakDown = !hidden && !wallet.amountsStale && (silentBalance > 0n || poolBalance > 0n);
  const showBreakdown = canBreakDown && open;
  const tone = p.dark ? PRIVATE_TONE.dark : PRIVATE_TONE.light;
  const divider = p.dark ? 'rgba(255, 255, 255, 0.08)' : '#ececef';
  const amountOf = (sats: bigint) => {
    const text = String(formatBalance(sats, unit, true));
    return fiat ? text : shortenFormattedAmount(text, HOME_MAX_DECIMALS);
  };
  const walletPart = balance > silentBalance ? balance - silentBalance : 0n;
  const breakdownIcon = (name: MaterialIconName, color: string) => <Icon name={name} type="material" size={18} color={color} />;

  return (
    <View style={styles.root}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: p.muted }]}>{poolBalance > 0n ? loc.home.total_balance : loc.home.available_balance}</Text>
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
        {canBreakDown ? (
          <Pressable
            onPress={() => setOpen(on => !on)}
            accessibilityRole="button"
            accessibilityLabel={loc.home.breakdown}
            accessibilityState={{ expanded: open }}
            testID="HomeBalanceBreakdownToggle"
            hitSlop={6}
            style={({ pressed }) => [styles.unfold, { backgroundColor: tone.bg }, pressed && styles.pressed]}
          >
            <Icon name={open ? 'expand-less' : 'expand-more'} type="material" size={22} color={tone.fg} />
          </Pressable>
        ) : null}
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
      {showBreakdown ? (
        <View style={[styles.breakdown, { backgroundColor: p.card }]} testID="HomeBalanceBreakdown">
          <BreakdownRow
            icon={breakdownIcon('account-balance-wallet', p.mutedOnCard)}
            iconBg={p.ground}
            title={loc.home.breakdown_wallet}
            amount={amountOf(walletPart)}
            amountColor={p.ink}
            testID="HomeBalanceWalletPart"
          />
          {silentBalance > 0n ? (
            <BreakdownRow
              icon={<View style={[styles.silentDot, { backgroundColor: SILENT_PAYMENT_ACCENT }]} />}
              iconBg={tone.bg}
              title={loc.receive.silent_payments}
              amount={amountOf(silentBalance)}
              amountColor={tone.fg}
              divider={divider}
              testID="HomeBalanceSilent"
            />
          ) : null}
          {poolBalance > 0n ? (
            <BreakdownRow
              icon={breakdownIcon('shield', tone.fg)}
              iconBg={tone.bg}
              title={loc.home.breakdown_pool}
              subtitle={
                poolSeenAt ? String(loc.formatString(loc.home.breakdown_seen, { time: transactionTimeToReadable(poolSeenAt) })) : undefined
              }
              amount={amountOf(poolBalance)}
              amountColor={tone.fg}
              divider={divider}
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
  unfold: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  breakdown: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 2, marginTop: 2, marginBottom: 4 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', columnGap: 12, minHeight: 52, paddingVertical: 6 },
  breakdownIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  breakdownTexts: { flex: 1, rowGap: 1 },
  breakdownTitle: { fontSize: 15, fontWeight: '500' },
  breakdownSubtitle: { fontSize: 12 },
  breakdownAmount: { fontSize: 15, fontWeight: '600', flexShrink: 0 },
  silentDot: { width: 9, height: 9, borderRadius: 4.5 },
});

export default HomeBalance;
