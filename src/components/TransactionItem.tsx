import moment from 'moment';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { CONST, Transaction } from 'app/consts';
import { typography, palette } from 'app/styles';

const i18n = require('../../loc');

export const TransactionItem = ({ item, onPress }: { item: Transaction; onPress: (item: any) => void }) => {
  const confirmations = () => {
    return i18n.transactions.list.conf + ': ' + (item.confirmations < 7 ? item.confirmations : '6') + '/6 ';
  };
  return (
    <TouchableOpacity style={styles.container} onPress={() => onPress(item)}>
      <View style={styles.leftColumn}>
        <Text style={typography.headline5} numberOfLines={1}>
          {item.walletLabel === CONST.allWallets ? i18n.transactions.details.noLabel : item.walletLabel}
        </Text>
        {!!item.note && <Text style={typography.caption}>{item.note}</Text>}
        <Text style={styles.label}>{moment(item.received).format('LT')}</Text>
        <Text style={styles.label}>{confirmations()}</Text>
        {!!item.status && (
          <View style={styles.statusContainer}>
            <Text style={typography.status}>{item.status}</Text>
          </View>
        )}
      </View>
      <View style={styles.rightColumn}>
        <Text style={[typography.headline5, { color: item.value < 0 ? palette.textRed : palette.textBlack }]}>
          {i18n.formatBalanceWithoutSuffix(Number(item.value), item.walletPreferredBalanceUnit)}
        </Text>
        <Text style={[typography.headline5, { color: item.value < 0 ? palette.textRed : palette.textBlack }]}>
          {item.walletPreferredBalanceUnit}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  statusContainer: {
    borderRadius: 3,
    backgroundColor: palette.secondary,
    alignSelf: 'baseline',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginVertical: 5,
  },
  label: {
    ...typography.caption,
    color: palette.textGrey,
  },
  leftColumn: { justifyContent: 'space-between', maxWidth: '75%' },
  rightColumn: { alignItems: 'flex-end' },
});
