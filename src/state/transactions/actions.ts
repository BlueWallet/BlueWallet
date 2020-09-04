export enum TransactionsAction {
  CreateTransactionNote = 'CreateTransactionNote',
  UpdateTransactionNote = 'UpdateTransactionNote',
  DeleteTransactionNote = 'DeleteTransactionNote',
}
export interface CreateTransactionNoteAction {
  type: TransactionsAction.CreateTransactionNote;
  transactionID: string;
  note: string;
}

export interface UpdateTransactionNoteAction {
  type: TransactionsAction.UpdateTransactionNote;
  transactionID: string;
  note: string;
}

export interface DeleteTransactionNoteAction {
  type: TransactionsAction.DeleteTransactionNote;
  transactionID: string;
}

export type TransactionsActionType =
  | CreateTransactionNoteAction
  | UpdateTransactionNoteAction
  | DeleteTransactionNoteAction;

export const createTransactionNote = (transactionID: string, note: string): CreateTransactionNoteAction => ({
  type: TransactionsAction.CreateTransactionNote,
  transactionID,
  note,
});

export const updateTransactionNote = (transactionID: string, note: string): UpdateTransactionNoteAction => ({
  type: TransactionsAction.UpdateTransactionNote,
  transactionID,
  note,
});

export const deleteTransactionNote = (transactionID: string): DeleteTransactionNoteAction => ({
  type: TransactionsAction.DeleteTransactionNote,
  transactionID,
});
