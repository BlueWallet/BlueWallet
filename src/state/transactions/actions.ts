import { AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';

import { Transaction } from 'app/consts';
import { sleep } from 'app/helpers/helpers';

export enum TransactionsAction {
  LoadTransactions = 'LoadTransactions',
  LoadTransactionsRequest = 'LoadTransactionsRequest',
  LoadTransactionsSuccess = 'LoadTransactionsSuccess',
  LoadTransactionsFailure = 'LoadTransactionsFailure',
  CreateTransactionNote = 'CreateTransactionNote',
  UpdateTransactionNote = 'UpdateTransactionNote',
  DeleteTransactionNote = 'DeleteTransactionNote',
}

export interface LoadTransactionsAction {
  type: TransactionsAction.LoadTransactions;
  walletAddress: string;
}

export interface LoadTransactionsRequestAction {
  type: TransactionsAction.LoadTransactionsRequest;
  walletAddress: string;
}

export interface LoadTransactionsSuccessAction {
  type: TransactionsAction.LoadTransactionsSuccess;
  transactions: Transaction[];
  walletAddress: string;
}

export interface LoadTransactionsFailureAction {
  type: TransactionsAction.LoadTransactionsFailure;
  error: Error;
  walletAddress: string;
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
  | LoadTransactionsAction
  | LoadTransactionsRequestAction
  | LoadTransactionsSuccessAction
  | LoadTransactionsFailureAction
  | CreateTransactionNoteAction
  | UpdateTransactionNoteAction
  | DeleteTransactionNoteAction;

export const loadTransactions = (walletAddress: string) => async (
  dispatch: ThunkDispatch<any, any, AnyAction>,
): Promise<TransactionsActionType> => {
  dispatch(loadTransactionsRequest(walletAddress));
  try {
    // TODO implement fetching transactions for single wallet
    await sleep(1000);
    return dispatch(loadTransactionsSuccess(walletAddress, []));
  } catch (e) {
    return dispatch(loadTransactionsFailure(walletAddress, e));
  }
};

const loadTransactionsRequest = (walletAddress: string): LoadTransactionsRequestAction => ({
  type: TransactionsAction.LoadTransactionsRequest,
  walletAddress,
});

export const loadTransactionsSuccess = (
  walletAddress: string,
  transactions: Transaction[],
): LoadTransactionsSuccessAction => ({
  type: TransactionsAction.LoadTransactionsSuccess,
  transactions,
  walletAddress,
});

const loadTransactionsFailure = (walletAddress: string, error: Error): LoadTransactionsFailureAction => ({
  type: TransactionsAction.LoadTransactionsFailure,
  error,
  walletAddress,
});

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
