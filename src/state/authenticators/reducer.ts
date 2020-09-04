import { Authenticator } from 'app/consts';

import { AuthenticatorsAction, AuthenticatorsActionType } from './actions';

export interface AuthenticatorsState {
  authenticators: Authenticator[];
  isLoading: boolean;
  error: string;
}

const initialState: AuthenticatorsState = {
  authenticators: [],
  isLoading: false,
  error: '',
};

export const authenticatorsReducer = (state = initialState, action: AuthenticatorsActionType): AuthenticatorsState => {
  switch (action.type) {
    case AuthenticatorsAction.CreateAuthenticator:
    case AuthenticatorsAction.LoadAuthenticators:
    case AuthenticatorsAction.DeleteAuthenticator:
      return {
        ...state,
        isLoading: true,
      };
    case AuthenticatorsAction.CreateAuthenticatorSuccess:
      return {
        ...state,
        authenticators: [...state.authenticators, action.authenticator],
        isLoading: false,
        error: '',
      };
    case AuthenticatorsAction.LoadAuthenticatorsSuccess:
      return {
        ...state,
        authenticators: action.authenticators,
        isLoading: false,
        error: '',
      };
    case AuthenticatorsAction.DeleteAuthenticatorSuccess:
      return {
        ...state,
        authenticators: state.authenticators.filter(a => a.id !== action.authenticator.id),
        isLoading: false,
        error: '',
      };
    case AuthenticatorsAction.LoadAuthenticatorsFailure:
    case AuthenticatorsAction.CreateAuthenticatorFailure:
    case AuthenticatorsAction.DeleteAuthenticatorFailure:
      return {
        ...state,
        isLoading: false,
        error: action.error,
      };

    default:
      return state;
  }
};
