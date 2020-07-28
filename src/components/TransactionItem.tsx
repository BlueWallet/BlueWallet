import moment from 'moment';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { icons } from 'app/assets';
import { Label, Image } from 'app/components';
import { CONST, Transaction, TxType } from 'app/consts';
import { typography, palette } from 'app/styles';

const i18n = require('../../loc');

const renderLabel = (txType: TxType) => {
  switch (txType) {
    case TxType.ALERT_PENDING:
      return <Label type="warning">{i18n.transactions.label.pending}</Label>;
    case TxType.ALERT_RECOVERED:
      return <Label type="neutral">{i18n.transactions.label.cancelled}</Label>;
    case TxType.ALERT_CONFIRMED:
      return <Label type="success">{i18n.transactions.label.done}</Label>;
    case TxType.RECOVERY:
      return <Label type="error">{i18n.transactions.label.recovered}</Label>;
    default:
      return null;
  }
};

const renderArrowIcon = (value: number) => (
  <Image source={value > 0 ? icons.arrowRight : icons.arrowLeft} style={styles.arrow} resizeMode="contain" />
);

const renderCofirmations = (txType: TxType, confirmations: number) => {
  if (txType === TxType.ALERT_RECOVERED) {
    return null;
  }

  const maxConfirmations = [TxType.ALERT_PENDING, TxType.ALERT_CONFIRMED].includes(txType)
    ? CONST.alertBlocks
    : CONST.confirmationsBlocks;
  const confs = confirmations > maxConfirmations ? maxConfirmations : confirmations;

  return <Text style={styles.label}>{`${i18n.transactions.list.conf}: ${confs}/${maxConfirmations}`}</Text>;
};

export const TransactionItem = ({ item, onPress }: { item: Transaction; onPress: (item: any) => void }) => (
  <TouchableOpacity style={styles.container} onPress={() => onPress(item)}>
    <View style={styles.leftColumn}>
      <View style={styles.walletLabelWrapper}>
        {renderArrowIcon(item.value)}
        <Image source={icons.wallet} style={styles.wallet} resizeMode="contain" />
        <Text style={typography.headline5} numberOfLines={1}>
          {item.walletLabel === CONST.allWallets ? i18n.transactions.details.noLabel : item.walletLabel}
        </Text>
      </View>
      {!!item.note && <Text style={typography.caption}>{item.note}</Text>}
      <Text style={styles.label}>{moment(item.received).format('LT')}</Text>
      {renderCofirmations(item.tx_type, item.confirmations)}
      {renderLabel(item.tx_type)}
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
  leftColumn: { justifyContent: 'flex-start', maxWidth: '75%' },
  rightColumn: { marginTop: 3, alignItems: 'flex-end' },
});
