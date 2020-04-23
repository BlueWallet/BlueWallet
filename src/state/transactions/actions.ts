import { Transaction } from 'app/consts';

export enum TransactionsAction {
  CreateTransaction = 'CreateTransaction',
  UpdateTransaction = 'UpdateTransaction',
  DeleteTransaction = 'DeleteTransaction',
}

export interface CreateTransactionAction {
  type: TransactionsAction.CreateTransaction;
  transaction: Transaction;
}

export interface UpdateTransactionAction {
  type: TransactionsAction.UpdateTransaction;
  transaction: Transaction;
}

export interface DeleteTransactionAction {
  type: TransactionsAction.DeleteTransaction;
  transaction: Transaction;
}

export type TransactionsActionType = CreateTransactionAction | UpdateTransactionAction | DeleteTransactionAction;

export const createTransaction = (transaction: Transaction): CreateTransactionAction => ({
  type: TransactionsAction.CreateTransaction,
  transaction,
});

export const updateTransaction = (transaction: Transaction): UpdateTransactionAction => ({
  type: TransactionsAction.UpdateTransaction,
  transaction,
});

export const deleteTransaction = (transaction: Transaction): DeleteTransactionAction => ({
  type: TransactionsAction.DeleteTransaction,
  transaction,
});
