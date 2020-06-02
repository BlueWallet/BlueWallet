import { Transaction } from 'app/consts';

import { TransactionsAction, TransactionsActionType } from './actions';

export interface TransactionsState {
  transactions: Record<string, Transaction[]>;
  transactionNotes: Record<string, string>;
}

const initialState: TransactionsState = {
  transactions: {},
  transactionNotes: {},
};

export const transactionsReducer = (state = initialState, action: TransactionsActionType): TransactionsState => {
  switch (action.type) {
    case TransactionsAction.LoadTransactionsSuccess:
      return {
        ...state,
        transactions: {
          ...state.transactions,
          [action.walletAddress]: action.transactions,
        },
      };
    case TransactionsAction.CreateTransactionNote:
      return {
        ...state,
        transactionNotes: {
          ...state.transactionNotes,
          [action.transactionID]: action.note,
        },
      };
    case TransactionsAction.UpdateTransactionNote:
      return {
        ...state,
        transactionNotes: {
          ...state.transactionNotes,
          [action.transactionID]: action.note,
        },
      };
    case TransactionsAction.DeleteTransactionNote:
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [action.transactionID]: deleted, ...transactionNotes } = state.transactionNotes;
      return {
        ...state,
        transactionNotes,
      };
    default:
      return state;
  }
};
