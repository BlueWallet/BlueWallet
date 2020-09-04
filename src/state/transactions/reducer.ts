import { TransactionsAction, TransactionsActionType } from './actions';

export interface TransactionsState {
  transactionNotes: Record<string, string>;
}

const initialState: TransactionsState = {
  transactionNotes: {},
};

export const transactionsReducer = (state = initialState, action: TransactionsActionType): TransactionsState => {
  switch (action.type) {
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
