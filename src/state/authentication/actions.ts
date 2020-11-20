import { ActionMeta } from 'app/consts';

export enum AuthenticationAction {
  Authenticate = 'Authenticate',
  AuthenticateSuccess = 'AuthenticateSuccess',
  AuthenticateFailure = 'AuthenticateFailure',
  CheckTc = 'CheckTc',
  CreateTc = 'CreateTc',
  CheckCredentials = 'CheckCredentials',
  CheckCredentialsSuccess = 'CheckCredentialsSuccess',
  CheckCredentialsFailure = 'CheckCredentialsFailure',
  CreatePin = 'CreatePin',
  CreatePinSuccess = 'CreatePinSuccess',
  CreatePinFailure = 'CreatePinFailure',
  CreateTxPassword = 'CreateTxPassword',
  CreateTxPasswordSuccess = 'CreateTxPasswordSuccess',
  CreateTxPasswordFailure = 'CreateTxPasswordFailure',
  SetIsAuthenticated = 'SetIsAuthenticated',
  SetIsTcAccepted = 'SetIsTcAccepted',
}

interface CheckCredentials {
  isPinSet: boolean;
  isTxPasswordSet: boolean;
}

export interface AuthenticateAction {
  type: AuthenticationAction.Authenticate;
  meta?: ActionMeta;
  payload: {
    pin: string;
  };
}

export interface AuthenticateSuccessAction {
  type: AuthenticationAction.AuthenticateSuccess;
}

export interface AuthenticateFailureAction {
  type: AuthenticationAction.AuthenticateFailure;
  error: string;
}

export interface CheckTcAction {
  type: AuthenticationAction.CheckTc;
  meta?: ActionMeta;
}

export interface CreateTcAction {
  type: AuthenticationAction.CreateTc;
}

export interface CheckCredentialsAction {
  type: AuthenticationAction.CheckCredentials;
  meta?: ActionMeta;
}

export interface CheckCredentialsSuccessAction {
  type: AuthenticationAction.CheckCredentialsSuccess;
  credentials: CheckCredentials;
}

export interface CheckCredentialsFailureAction {
  type: AuthenticationAction.CheckCredentialsFailure;
  error: string;
}

export interface CreatePinAction {
  type: AuthenticationAction.CreatePin;
  payload: {
    pin: string;
  };
  meta?: ActionMeta;
}

export interface CreatePinSuccessAction {
  type: AuthenticationAction.CreatePinSuccess;
}

export interface CreatePinFailureAction {
  type: AuthenticationAction.CreatePinFailure;
  error: string;
}

export interface CreateTxPasswordAction {
  type: AuthenticationAction.CreateTxPassword;
  payload: {
    txPassword: string;
  };
  meta?: ActionMeta;
}

export interface CreateTxPasswordSuccessAction {
  type: AuthenticationAction.CreateTxPasswordSuccess;
}

export interface CreateTxPasswordFailureAction {
  type: AuthenticationAction.CreateTxPasswordFailure;
  error: string;
}

export interface SetIsAuthenticatedAction {
  type: AuthenticationAction.SetIsAuthenticated;
  isAuthenticated: boolean;
}

export interface SetIsTcAcceptedAction {
  type: AuthenticationAction.SetIsTcAccepted;
  isTcAccepted: boolean;
}

export type AuthenticationActionType =
  | AuthenticateAction
  | AuthenticateSuccessAction
  | AuthenticateFailureAction
  | CheckTcAction
  | CreateTcAction
  | CheckCredentialsAction
  | CheckCredentialsSuccessAction
  | CheckCredentialsFailureAction
  | CreatePinAction
  | CreatePinSuccessAction
  | CreatePinFailureAction
  | CreateTxPasswordAction
  | CreateTxPasswordSuccessAction
  | CreateTxPasswordFailureAction
  | SetIsTcAcceptedAction
  | SetIsAuthenticatedAction;

export const authenticate = (pin: string, meta?: ActionMeta): AuthenticateAction => ({
  type: AuthenticationAction.Authenticate,
  payload: { pin },
  meta,
});

export const authenticateSuccess = (): AuthenticateSuccessAction => ({
  type: AuthenticationAction.AuthenticateSuccess,
});

export const authenticateFailure = (error: string): AuthenticateFailureAction => ({
  type: AuthenticationAction.AuthenticateFailure,
  error,
});

export const checkTc = (): CheckTcAction => ({
  type: AuthenticationAction.CheckTc,
});

export const createTc = (): CreateTcAction => ({
  type: AuthenticationAction.CreateTc,
});

export const checkCredentials = (meta?: ActionMeta): CheckCredentialsAction => ({
  type: AuthenticationAction.CheckCredentials,
  meta,
});

export const checkCredentialsSuccess = (credentials: CheckCredentials): CheckCredentialsSuccessAction => ({
  type: AuthenticationAction.CheckCredentialsSuccess,
  credentials,
});

export const checkCredentialsFailure = (error: string): CheckCredentialsFailureAction => ({
  type: AuthenticationAction.CheckCredentialsFailure,
  error,
});

export const createPin = (pin: string, meta?: ActionMeta): CreatePinAction => ({
  type: AuthenticationAction.CreatePin,
  payload: { pin },
  meta,
});

export const createPinSuccess = (): CreatePinSuccessAction => ({
  type: AuthenticationAction.CreatePinSuccess,
});

export const createPinFailure = (error: string): CreatePinFailureAction => ({
  type: AuthenticationAction.CreatePinFailure,
  error,
});

export const createTxPassword = (txPassword: string, meta?: ActionMeta): CreateTxPasswordAction => ({
  type: AuthenticationAction.CreateTxPassword,
  payload: { txPassword },
  meta,
});

export const createTxPasswordSuccess = (): CreateTxPasswordSuccessAction => ({
  type: AuthenticationAction.CreateTxPasswordSuccess,
});

export const createTxPasswordFailure = (error: string): CreateTxPasswordFailureAction => ({
  type: AuthenticationAction.CreateTxPasswordFailure,
  error,
});

export const setIsAuthenticated = (isAuthenticated: boolean): SetIsAuthenticatedAction => ({
  type: AuthenticationAction.SetIsAuthenticated,
  isAuthenticated,
});

export const setIsTcAccepted = (isTcAccepted: boolean): SetIsTcAcceptedAction => ({
  type: AuthenticationAction.SetIsTcAccepted,
  isTcAccepted,
});
