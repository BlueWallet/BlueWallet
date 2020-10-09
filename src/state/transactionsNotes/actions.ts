export enum TransactionsAction {
  CreateTransactionNote = 'CreateTransactionNote',
  CreateTransactionNoteSuccess = 'CreateTransactionNoteSuccess',
  CreateTransactionNoteFailure = 'CreateTransactionNoteFailure',
  UpdateTransactionNote = 'UpdateTransactionNote',
  DeleteTransactionNote = 'DeleteTransactionNote',
}
export interface CreateTransactionNoteAction {
  type: TransactionsAction.CreateTransactionNote;
  payload: {
    note: string;
    txid: string;
  };
}

export interface CreateTransactionNoteSuccessAction {
  type: TransactionsAction.CreateTransactionNoteSuccess;
  payload: {
    txHash: string;
    note: string;
  };
}

export interface CreateTransactionNoteFailureAction {
  type: TransactionsAction.CreateTransactionNoteFailure;
  error: string;
}

export interface UpdateTransactionNoteAction {
  type: TransactionsAction.UpdateTransactionNote;
  txHash: string;
  note: string;
}

export interface DeleteTransactionNoteAction {
  type: TransactionsAction.DeleteTransactionNote;
  txHash: string;
}

export type TransactionsActionType =
  | CreateTransactionNoteAction
  | CreateTransactionNoteSuccessAction
  | CreateTransactionNoteFailureAction
  | UpdateTransactionNoteAction
  | DeleteTransactionNoteAction;

export const createTransactionNote = (txid: string, note: string): CreateTransactionNoteAction => ({
  type: TransactionsAction.CreateTransactionNote,
  payload: { txid, note },
});

export const createTransactionNoteSuccess = (txHash: string, note: string): CreateTransactionNoteSuccessAction => ({
  type: TransactionsAction.CreateTransactionNoteSuccess,
  payload: { txHash, note },
});

export const createTransactionNoteFailure = (error: string): CreateTransactionNoteFailureAction => ({
  type: TransactionsAction.CreateTransactionNoteFailure,
  error,
});

export const updateTransactionNote = (txHash: string, note: string): UpdateTransactionNoteAction => ({
  type: TransactionsAction.UpdateTransactionNote,
  txHash,
  note,
});

export const deleteTransactionNote = (txHash: string): DeleteTransactionNoteAction => ({
  type: TransactionsAction.DeleteTransactionNote,
  txHash,
});
