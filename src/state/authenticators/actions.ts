import { Authenticator as IAuthenticator, ActionMeta } from 'app/consts';

export enum AuthenticatorsAction {
  CreateAuthenticator = 'CreateAuthenticator',
  CreateAuthenticatorSuccess = 'CreateAuthenticatorSuccess',
  CreateAuthenticatorFailure = 'CreateAuthenticatorFailure',
  LoadAuthenticators = 'LoadAuthenticators',
  LoadAuthenticatorsSuccess = 'LoadAuthenticatorsSuccess',
  LoadAuthenticatorsFailure = 'LoadAuthenticatorsFailure',
  DeleteAuthenticator = 'DeleteAuthenticator',
  DeleteAuthenticatorSuccess = 'DeleteAuthenticatorSuccess',
  DeleteAuthenticatorFailure = 'DeleteAuthenticatorFailure',
  SignTransaction = 'SignTransaction',
  SignTransactionSuccess = 'SignTransactionSuccess',
  SignTransactionFailure = 'SignTransactionFailure',
}

export interface CreateAuthenticatorAction {
  type: AuthenticatorsAction.CreateAuthenticator;
  payload: CreateAuthenticator;
  meta: ActionMeta;
}

export interface CreateAuthenticatorSuccessAction {
  type: AuthenticatorsAction.CreateAuthenticatorSuccess;
  authenticator: IAuthenticator;
}
export interface CreateAuthenticatorFailureAction {
  type: AuthenticatorsAction.CreateAuthenticatorFailure;
  error: string;
}
export interface LoadAuthenticatorsAction {
  type: AuthenticatorsAction.LoadAuthenticators;
}

export interface LoadAuthenticatorsSuccessAction {
  type: AuthenticatorsAction.LoadAuthenticatorsSuccess;
  authenticators: IAuthenticator[];
}
export interface LoadAuthenticatorsFailureAction {
  type: AuthenticatorsAction.LoadAuthenticatorsFailure;
  error: string;
}

export interface DeleteAuthenticatorAction {
  type: AuthenticatorsAction.DeleteAuthenticator;
  payload: {
    id: string;
  };
  meta?: ActionMeta;
}

export interface DeleteAuthenticatorSuccessAction {
  type: AuthenticatorsAction.DeleteAuthenticatorSuccess;
  authenticator: IAuthenticator;
}
export interface DeleteAuthenticatorFailureAction {
  type: AuthenticatorsAction.DeleteAuthenticatorFailure;
  error: string;
}

export interface SignTransactionAction {
  type: AuthenticatorsAction.SignTransaction;
  payload: {
    encodedPsbt: string;
  };
  meta?: ActionMeta;
}
export interface SignTransactionSuccessAction {
  type: AuthenticatorsAction.SignTransactionSuccess;
}
export interface SignTransactionFailureAction {
  type: AuthenticatorsAction.SignTransactionFailure;
  error: string;
}

export type AuthenticatorsActionType =
  | CreateAuthenticatorAction
  | CreateAuthenticatorSuccessAction
  | CreateAuthenticatorFailureAction
  | LoadAuthenticatorsAction
  | LoadAuthenticatorsSuccessAction
  | LoadAuthenticatorsFailureAction
  | DeleteAuthenticatorAction
  | DeleteAuthenticatorSuccessAction
  | DeleteAuthenticatorFailureAction
  | SignTransactionSuccessAction
  | SignTransactionFailureAction
  | SignTransactionAction;

interface CreateAuthenticator {
  name: string;
  entropy?: string;
  mnemonic?: string;
}

export const createAuthenticator = (payload: CreateAuthenticator, meta: ActionMeta): CreateAuthenticatorAction => ({
  type: AuthenticatorsAction.CreateAuthenticator,
  payload,
  meta,
});

export const createAuthenticatorSuccess = (authenticator: IAuthenticator): CreateAuthenticatorSuccessAction => ({
  type: AuthenticatorsAction.CreateAuthenticatorSuccess,
  authenticator,
});

export const createAuthenticatorFailure = (error: string): CreateAuthenticatorFailureAction => ({
  type: AuthenticatorsAction.CreateAuthenticatorFailure,
  error,
});

export const loadAuthenticators = (): LoadAuthenticatorsAction => ({
  type: AuthenticatorsAction.LoadAuthenticators,
});

export const loadAuthenticatorsSuccess = (authenticators: IAuthenticator[]): LoadAuthenticatorsSuccessAction => ({
  type: AuthenticatorsAction.LoadAuthenticatorsSuccess,
  authenticators,
});

export const loadAuthenticatorsFailure = (error: string): LoadAuthenticatorsFailureAction => ({
  type: AuthenticatorsAction.LoadAuthenticatorsFailure,
  error,
});

export const deleteAuthenticator = (id: string, meta: ActionMeta): DeleteAuthenticatorAction => ({
  type: AuthenticatorsAction.DeleteAuthenticator,
  payload: { id },
  meta,
});

export const deleteAuthenticatorSuccess = (authenticator: IAuthenticator): DeleteAuthenticatorSuccessAction => ({
  type: AuthenticatorsAction.DeleteAuthenticatorSuccess,
  authenticator,
});

export const deleteAuthenticatorFailure = (error: string): DeleteAuthenticatorFailureAction => ({
  type: AuthenticatorsAction.DeleteAuthenticatorFailure,
  error,
});

export const signTransaction = (encodedPsbt: string, meta?: ActionMeta): SignTransactionAction => ({
  type: AuthenticatorsAction.SignTransaction,
  payload: { encodedPsbt },
  meta,
});

export const signTransactionSuccess = (): SignTransactionSuccessAction => ({
  type: AuthenticatorsAction.SignTransactionSuccess,
});

export const signTransactionFailure = (error: string): SignTransactionFailureAction => ({
  type: AuthenticatorsAction.SignTransactionFailure,
  error,
});
