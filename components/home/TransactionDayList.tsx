/**
 * A wallet's transactions as the home draws them: newest first, one rounded
 * card per day under a day heading. The home shows the latest few and the
 * history screen all of them, a page at a time.
 */
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Transaction, TWallet } from '../../class/wallets/types';
import { groupTransactionsByDay, TransactionListEntry } from '../../helpers/group-transactions-by-day';
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
export function useTransactionEntries(sorted: Transaction[], count: number): TransactionListEntry[] {
  return useMemo(
    () =>
      groupTransactionsByDay(sorted.slice(0, count), {
        pending: loc.transactions.pending,
        today: loc.transactions.date_today,
        yesterday: loc.transactions.date_yesterday,
      }),
    [sorted, count],
  );
}

export const transactionEntryKey = (item: TransactionListEntry): string => item.key;

interface TransactionDayRowProps {
  item: TransactionListEntry;
  unit: XnaUnit;
  walletID: string;
}

/** One list row: a day heading, or a transaction inside its day's card. */
export const TransactionDayRow: React.FC<TransactionDayRowProps> = ({ item, unit, walletID }) => {
  const p = useHomePalette();
  const { colors } = useTheme();
  if (item.kind === 'header') {
    return (
      <Text style={[styles.dayHeader, { color: p.muted }]} numberOfLines={1} accessibilityRole="header">
        {item.title}
      </Text>
    );
  }
  return (
    <View style={[styles.card, { backgroundColor: p.card }, item.isFirst && styles.cardTop, item.isLast && styles.cardBottom]}>
      <TransactionListItem item={item.tx} itemPriceUnit={unit} walletID={walletID} style={styles.row} timeOnly />
      {!item.isLast && <View style={[styles.divider, { backgroundColor: colors.lightBorder }]} />}
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
  card: { marginHorizontal: 16, overflow: 'hidden' },
  cardTop: { borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  cardBottom: { borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  // Stable object: TransactionListItem's memo compares `style` by identity.
  row: { backgroundColor: 'transparent', borderBottomWidth: 0 },
  // Starts where the row's text does: 16 padding + 30 icon + 16 gap.
  divider: { position: 'absolute', bottom: 0, left: 62, right: 16, height: 1 },
});
