import { createSelector } from 'reselect';

import { ApplicationState } from 'app/state';

import { TransactionsState } from './reducer';

const local = (state: ApplicationState): TransactionsState => state.transactions;

export const transactionNotes = createSelector(local, state => state.transactionNotes);

export const getTxNoteByHash = createSelector(
  transactionNotes,
  (_: TransactionsState, hash: string) => hash,
  (txsNotes, hash) => txsNotes[hash] || '',
);
