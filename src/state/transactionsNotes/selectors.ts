import { createSelector } from 'reselect';

import { ApplicationState } from 'app/state';

import { TransactionsNotesState } from './reducer';

const local = (state: ApplicationState): TransactionsNotesState => state.transactions;

export const transactionNotes = createSelector(local, state => state.transactionNotes);

export const getTxNoteByHash = createSelector(
  transactionNotes,
  (_: TransactionsNotesState, hash: string) => hash,
  (txsNotes, hash) => txsNotes[hash] || '',
);
