import { createSelector } from 'reselect';

import { ApplicationState } from 'app/state';

import { TransactionsState } from './reducer';

const local = (state: ApplicationState): TransactionsState => state.transactions;

export const transactionNotes = createSelector(local, state => state.transactionNotes);
