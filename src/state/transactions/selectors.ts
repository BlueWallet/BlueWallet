import { compose, flatten, values } from 'lodash/fp';
import { createSelector } from 'reselect';

import { Transaction, TxType } from 'app/consts';
import { ApplicationState } from 'app/state';

import { TransactionsState } from './reducer';

const local = (state: ApplicationState): TransactionsState => state.transactions;

export const transactions = createSelector(local, state => state.transactions);

export const allTransactions = createSelector(transactions, compose(flatten, values));

export const getTranasctionsByWalletSecret = createSelector(
  transactions,
  (_: TransactionsState, secret: string) => secret,
  (txs: Record<string, Transaction[]>, secret) => txs[secret] || [],
);

export const getRecoveryTransactions = createSelector(getTranasctionsByWalletSecret, txs =>
  txs.filter(t => t.tx_type === TxType.RECOVERY),
);

export const getAlertPendingTransactions = createSelector(getTranasctionsByWalletSecret, txs =>
  txs.filter(t => t.tx_type === TxType.ALERT_PENDING),
);

export const getTransactionsToRecoverByWalletSecret = createSelector(getAlertPendingTransactions, txs =>
  txs.filter(tx => tx.value < 0 && tx.confirmations > 0),
);
