import { TransactionsAction, TransactionsActionType } from './actions';

export interface TransactionsNotesState {
  transactionNotes: Record<string, string>;
}

const initialState: TransactionsNotesState = {
  transactionNotes: {},
};

export const transactionsNotesReducer = (
  state = initialState,
  action: TransactionsActionType,
): TransactionsNotesState => {
  switch (action.type) {
    case TransactionsAction.CreateTransactionNoteSuccess:
      return {
        ...state,
        transactionNotes: {
          ...state.transactionNotes,
          [action.payload.txHash]: action.payload.note,
        },
      };
    case TransactionsAction.UpdateTransactionNote:
      return {
        ...state,
        transactionNotes: {
          ...state.transactionNotes,
          [action.txHash]: action.note,
        },
      };
    case TransactionsAction.DeleteTransactionNote:
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [action.txHash]: deleted, ...transactionNotes } = state.transactionNotes;
      return {
        ...state,
        transactionNotes,
      };
    default:
      return state;
  }
};
