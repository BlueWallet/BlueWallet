import { AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';

import { Authenticator as IAuthenticator } from 'app/consts';
import { BlueApp, Authenticator } from 'app/legacy';

export enum AuthenticatorsAction {
  CreateAuthenticatorRequest = 'CreateAuthenticatorRequest',
  CreateAuthenticatorSuccess = 'CreateAuthenticatorSuccess',
  CreateAuthenticatorFailure = 'CreateAuthenticatorFailure',
  LoadAuthenticatorsRequest = 'LoadAuthenticatorsRequest',
  LoadAuthenticatorsSuccess = 'LoadAuthenticatorsSuccess',
  LoadAuthenticatorsFailure = 'LoadAuthenticatorsFailure',
  DeleteAuthenticatorRequest = 'DeleteAuthenticatorRequest',
  DeleteAuthenticatorSuccess = 'DeleteAuthenticatorSuccess',
  DeleteAuthenticatorFailure = 'DeleteAuthenticatorFailure',
}

export interface CreateAuthenticatorRequestAction {
  type: AuthenticatorsAction.CreateAuthenticatorRequest;
}

export interface CreateAuthenticatorSuccessAction {
  type: AuthenticatorsAction.CreateAuthenticatorSuccess;
  authenticator: IAuthenticator;
}
export interface CreateAuthenticatorFailureAction {
  type: AuthenticatorsAction.CreateAuthenticatorFailure;
  error: string;
}
export interface LoadAuthenticatorsRequestAction {
  type: AuthenticatorsAction.LoadAuthenticatorsRequest;
}

export interface LoadAuthenticatorsSuccessAction {
  type: AuthenticatorsAction.LoadAuthenticatorsSuccess;
  authenticators: IAuthenticator[];
}
export interface LoadAuthenticatorsFailureAction {
  type: AuthenticatorsAction.LoadAuthenticatorsFailure;
  error: string;
}

export interface DeleteAuthenticatorRequestAction {
  type: AuthenticatorsAction.DeleteAuthenticatorRequest;
}

export interface DeleteAuthenticatorSuccessAction {
  type: AuthenticatorsAction.DeleteAuthenticatorSuccess;
  authenticator: IAuthenticator;
}
export interface DeleteAuthenticatorFailureAction {
  type: AuthenticatorsAction.DeleteAuthenticatorFailure;
  error: string;
}

export type AuthenticatorsActionType =
  | CreateAuthenticatorRequestAction
  | CreateAuthenticatorSuccessAction
  | CreateAuthenticatorFailureAction
  | LoadAuthenticatorsRequestAction
  | LoadAuthenticatorsSuccessAction
  | LoadAuthenticatorsFailureAction
  | DeleteAuthenticatorRequestAction
  | DeleteAuthenticatorSuccessAction
  | DeleteAuthenticatorFailureAction;

const createAuthenticatorRequest = (): CreateAuthenticatorRequestAction => ({
  type: AuthenticatorsAction.CreateAuthenticatorRequest,
});

const createAuthenticatorSuccess = (authenticator: IAuthenticator): CreateAuthenticatorSuccessAction => ({
  type: AuthenticatorsAction.CreateAuthenticatorSuccess,
  authenticator,
});

const createAuthenticatorFailure = (error: string): CreateAuthenticatorFailureAction => ({
  type: AuthenticatorsAction.CreateAuthenticatorFailure,
  error,
});

const loadAuthenticatorsRequest = (): LoadAuthenticatorsRequestAction => ({
  type: AuthenticatorsAction.LoadAuthenticatorsRequest,
});

const loadAuthenticatorsSuccess = (authenticators: IAuthenticator[]): LoadAuthenticatorsSuccessAction => ({
  type: AuthenticatorsAction.LoadAuthenticatorsSuccess,
  authenticators,
});

const loadAuthenticatorsFailure = (error: string): LoadAuthenticatorsFailureAction => ({
  type: AuthenticatorsAction.LoadAuthenticatorsFailure,
  error,
});

const deleteAuthenticatorRequest = (): DeleteAuthenticatorRequestAction => ({
  type: AuthenticatorsAction.DeleteAuthenticatorRequest,
});

const deleteAuthenticatorSuccess = (authenticator: IAuthenticator): DeleteAuthenticatorSuccessAction => ({
  type: AuthenticatorsAction.DeleteAuthenticatorSuccess,
  authenticator,
});

const deleteAuthenticatorFailure = (error: string): DeleteAuthenticatorFailureAction => ({
  type: AuthenticatorsAction.DeleteAuthenticatorFailure,
  error,
});

interface CreateAuthenticator {
  name: string;
  entropy?: string;
  mnemonic?: string;
}
interface Meta {
  onSuccess?: Function;
  onFailure?: Function;
}

export const createAuthenticator = ({ name, entropy, mnemonic }: CreateAuthenticator, meta?: Meta) => async (
  dispatch: ThunkDispatch<any, any, AnyAction>,
): Promise<AuthenticatorsActionType> => {
  try {
    dispatch(createAuthenticatorRequest());
    const authenticator = new Authenticator(name);
    await authenticator.init({ entropy, mnemonic });
    BlueApp.addAuthenticator(authenticator);
    await BlueApp.saveToDisk();
    const createAuthenticatorSuccessDispatch = dispatch(createAuthenticatorSuccess(authenticator));
    if (meta?.onSuccess) {
      meta.onSuccess(authenticator);
    }
    return createAuthenticatorSuccessDispatch;
  } catch (e) {
    const createAuthenticatorFailureDispatch = dispatch(createAuthenticatorFailure(e.message));
    if (meta?.onFailure) {
      meta.onFailure(e.message);
    }
    return createAuthenticatorFailureDispatch;
  }
};

export const loadAuthenticators = () => async (
  dispatch: ThunkDispatch<any, any, AnyAction>,
): Promise<AuthenticatorsActionType> => {
  try {
    dispatch(loadAuthenticatorsRequest());
    const authenticators = BlueApp.getAuthenticators();
    return dispatch(loadAuthenticatorsSuccess(authenticators));
  } catch (e) {
    return dispatch(loadAuthenticatorsFailure(e.message));
  }
};

export const deleteAuthenticator = (id: string, meta: Meta) => async (
  dispatch: ThunkDispatch<any, any, AnyAction>,
): Promise<AuthenticatorsActionType> => {
  try {
    dispatch(deleteAuthenticatorRequest());
    const authenticator = BlueApp.removeAuthenticatorById(id);
    await BlueApp.saveToDisk();
    const deleteAuthenticatorSuccessDispatch = dispatch(deleteAuthenticatorSuccess(authenticator));
    if (meta?.onSuccess) {
      meta.onSuccess(authenticator);
    }
    return deleteAuthenticatorSuccessDispatch;
  } catch (e) {
    const deleteAuthenticatorFailureDispatch = dispatch(deleteAuthenticatorFailure(e.message));
    if (meta?.onFailure) {
      meta.onFailure(e.message);
    }
    return deleteAuthenticatorFailureDispatch;
  }
};
