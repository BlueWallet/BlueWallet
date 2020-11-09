/* eslint-disable react-native/no-unused-styles */
import React from 'react';
import { StyleSheet } from 'react-native';

import { TransactionStatus } from 'app/consts';
import { palette } from 'app/styles';

import { Label } from './Label';

const i18n = require('../../loc');

export const TransactionLabelStatus = ({ status }: { status: TransactionStatus }) => {
  const readableTransactionStatus = {
    [TransactionStatus.PENDING]: i18n.transactions.label.pending,
    [TransactionStatus.CANCELED]: i18n.transactions.label.canceled,
    [TransactionStatus.DONE]: i18n.transactions.label.done,
    [TransactionStatus['CANCELED-DONE']]: i18n.transactions.label.canceledDone,
  };
  return readableTransactionStatus[status] ? (
    <Label labelStyle={styles[status]}>{readableTransactionStatus[status]}</Label>
  ) : null;
};

const styles = StyleSheet.create({
  PENDING: {
    backgroundColor: palette.textSecondary,
  },
  DONE: {
    backgroundColor: palette.green,
  },
  'CANCELED-DONE': {
    backgroundColor: palette.green,
  },
  CANCELED: {
    backgroundColor: palette.textRed,
  },
});
