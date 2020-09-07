/* eslint-disable react-native/no-unused-styles */
import React from 'react';
import { StyleSheet } from 'react-native';

import { TxType } from 'app/consts';
import { palette } from 'app/styles';

import { Label } from './Label';

const i18n = require('../../loc');

const readableTransactionType = {
  [TxType.ALERT_PENDING]: i18n.transactions.label.pending,
  [TxType.ALERT_RECOVERED]: i18n.transactions.label.annulled,
  [TxType.ALERT_CONFIRMED]: i18n.transactions.label.done,
  [TxType.RECOVERY]: i18n.transactions.label.canceled,
};

export const TranscationLabelStatus = ({ type }: { type: TxType }) =>
  readableTransactionType[type] ? <Label labelStyle={styles[type]}>{readableTransactionType[type]}</Label> : null;

const styles = StyleSheet.create({
  ALERT_PENDING: {
    backgroundColor: palette.textSecondary,
  },
  ALERT_CONFIRMED: {
    backgroundColor: palette.green,
  },
  RECOVERY: {
    backgroundColor: palette.textRed,
  },
  ALERT_RECOVERED: {
    backgroundColor: palette.mediumGrey,
  },
});
