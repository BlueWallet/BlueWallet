import moment from 'moment';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { icons } from 'app/assets';
import { TranscationLabelStatus, Image } from 'app/components';
import { CONST, Transaction, TxType } from 'app/consts';
import { getConfirmationsText } from 'app/helpers/helpers';
import { typography, palette } from 'app/styles';

const i18n = require('../../loc');

const renderArrowIcon = (value: number) => (
  <Image source={value > 0 ? icons.arrowRight : icons.arrowLeft} style={styles.arrow} resizeMode="contain" />
);

const renderCofirmations = (txType: TxType, confirmations: number) =>
  txType !== TxType.ALERT_RECOVERED && (
    <Text style={styles.label}>{`${i18n.transactions.list.conf}: ${getConfirmationsText(txType, confirmations)}`}</Text>
  );

export const TransactionItem = ({ item, onPress }: { item: Transaction; onPress: (item: any) => void }) => (
  <TouchableOpacity style={styles.container} onPress={() => onPress(item)}>
    <View style={styles.leftColumn}>
      <View style={styles.walletLabelWrapper}>
        {renderArrowIcon(item.value)}
        <Image source={icons.wallet} style={styles.wallet} resizeMode="contain" />
        <Text style={styles.walletLabel}>
          {item.walletLabel === CONST.allWallets ? i18n.transactions.details.noLabel : item.walletLabel}
        </Text>
      </View>
      {!!item.note && <Text style={typography.caption}>{item.note}</Text>}
      <Text style={styles.label}>
        {item.time ? moment(item.received).format('LT') : i18n.transactions.details.timePending}
      </Text>
      {renderCofirmations(item.tx_type, item.confirmations)}
      <TranscationLabelStatus type={item.tx_type} />
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

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
    flexGrow: 1,
  },
  walletLabelWrapper: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  wallet: {
    width: 14,
    height: 14,
    marginHorizontal: 3,
  },
  arrow: {
    width: 24,
    height: 24,
  },
  label: {
    ...typography.caption,
    color: palette.textGrey,
  },
  walletLabel: {
    ...typography.headline5,
    flexShrink: 1,
  },
  leftColumn: { justifyContent: 'flex-start', maxWidth: '75%' },
  rightColumn: { marginTop: 3, alignItems: 'flex-end' },
});
