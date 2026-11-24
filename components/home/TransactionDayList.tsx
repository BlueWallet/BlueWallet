/**
 * A wallet's transactions as the home draws them: newest first, one rounded
 * card per day under a day heading. The home shows the latest few and the
 * history screen all of them, a page at a time.
 *
 * Each day is a single card holding its rows. Rows with their own background,
 * one per list item, left a hairline of the ground showing between them at
 * some scroll offsets.
 */
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Transaction, TWallet } from '../../class/wallets/types';
import { groupTransactionsIntoDays, TransactionDay } from '../../helpers/group-transactions-by-day';
import loc from '../../loc';
import { XnaUnit } from '../../models/xnaUnits';
import { useTheme } from '../themes';
import { TransactionListItem } from '../TransactionListItem';
import { useHomePalette } from './homeTheme';

/** Newest first. `wallet` is a subscribed proxy, so this follows every fetch. */
export function useSortedTransactions(wallet: TWallet): Transaction[] {
  return useMemo(() => {
    const txs = wallet.getTransactions().slice();
    txs.sort((a, b) => b.timestamp - a.timestamp);
    return txs;
  }, [wallet]);
}

/** The first `count` transactions of `sorted`, grouped by day. */
export function useTransactionDays(sorted: Transaction[], count: number): TransactionDay[] {
  return useMemo(
    () =>
      groupTransactionsIntoDays(sorted.slice(0, count), {
        pending: loc.transactions.pending,
        today: loc.transactions.date_today,
        yesterday: loc.transactions.date_yesterday,
      }),
    [sorted, count],
  );
}

export const transactionDayKey = (day: TransactionDay): string => day.key;

interface TransactionDayCardProps {
  day: TransactionDay;
  unit: XnaUnit;
  walletID: string;
}

/** A day heading and the card with that day's transactions. */
export const TransactionDayCard: React.FC<TransactionDayCardProps> = ({ day, unit, walletID }) => {
  const p = useHomePalette();
  const { colors } = useTheme();
  return (
    <View>
      <Text style={[styles.dayHeader, { color: p.muted }]} numberOfLines={1} accessibilityRole="header">
        {day.title}
      </Text>
      <View style={[styles.card, { backgroundColor: p.card }]}>
        {day.txs.map((tx, i) => (
          <View key={tx.hash ?? `${day.key}:${i}`}>
            <TransactionListItem item={tx} itemPriceUnit={unit} walletID={walletID} style={styles.row} timeOnly />
            {i < day.txs.length - 1 && <View style={[styles.divider, { backgroundColor: colors.lightBorder }]} />}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  dayHeader: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  card: { marginHorizontal: 16, borderRadius: 20, overflow: 'hidden' },
  // Stable object: TransactionListItem's memo compares `style` by identity.
  row: { backgroundColor: 'transparent', borderBottomWidth: 0 },
  // Starts where the row's text does: 16 padding + 30 icon + 16 gap.
  divider: { position: 'absolute', bottom: 0, left: 62, right: 16, height: 1 },
});
