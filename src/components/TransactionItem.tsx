import moment from 'moment';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import i18n from 'app/locale';
import { typography, palette } from 'app/styles';

export interface TransactionItemProps {
  confirmations: number;
  walletLabel: string;
  time: number;
  walletPreferredBalanceUnit: string;
  value: number;
}

export const TransactionItem = ({ item, onPress }: { item: TransactionItemProps; onPress: (item: any) => void }) => {
  const confirmations = () => {
    return i18n.transactions.list.conf + ': ' + (item.confirmations < 7 ? item.confirmations : '6') + '/6 ';
  };
  return (
    <TouchableOpacity style={styles.container} onPress={() => onPress(item)}>
      <View style={styles.leftColumn}>
        <Text style={typography.headline5}>{item.walletLabel}</Text>
        <Text style={styles.label}>{confirmations()}</Text>
        <Text style={styles.label}>{moment.unix(item.time).format('LT')}</Text>
      </View>
      <View style={styles.rightColumn}>
        <Text style={typography.headline5}>{i18n.formatBalanceWithoutSuffix(Number(item.value))}</Text>
        <Text style={typography.headline5}>{item.walletPreferredBalanceUnit}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 58,
    marginVertical: 8,
  },
  label: {
    ...typography.caption,
    color: palette.textGrey,
  },
  leftColumn: { justifyContent: 'space-between' },
  rightColumn: { alignItems: 'flex-end' },
});
