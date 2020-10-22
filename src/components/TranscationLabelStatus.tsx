/* eslint-disable react-native/no-unused-styles */
import React from 'react';
import { StyleSheet } from 'react-native';

import { TxType, CONST } from 'app/consts';
import { palette } from 'app/styles';

import { Label } from './Label';

const i18n = require('../../loc');

const readableTransactionType = {
  [TxType.ALERT_PENDING]: i18n.transactions.label.pending,
  [TxType.ALERT_RECOVERED]: i18n.transactions.label.canceled,
  [TxType.ALERT_CONFIRMED]: i18n.transactions.label.done,
  [TxType.RECOVERY]: i18n.transactions.label.canceledDone,
};

export const TranscationLabelStatus = ({ type, confirmations }: { type: TxType; confirmations: number }) => {
  let chosenStyleType = type;
  if (!readableTransactionType[type]) {
    chosenStyleType = TxType.ALERT_PENDING;
  }
  if (!readableTransactionType[type] && CONST.confirmationsBlocks <= confirmations) {
    chosenStyleType = TxType.ALERT_CONFIRMED;
  }
  return readableTransactionType[chosenStyleType] ? (
    <Label labelStyle={styles[chosenStyleType]}>{readableTransactionType[chosenStyleType]}</Label>
  ) : null;
};

const styles = StyleSheet.create({
  ALERT_PENDING: {
    backgroundColor: palette.textSecondary,
  },
  ALERT_CONFIRMED: {
    backgroundColor: palette.green,
  },
  RECOVERY: {
    backgroundColor: palette.green,
  },
  ALERT_RECOVERED: {
    backgroundColor: palette.textRed,
  },
});
