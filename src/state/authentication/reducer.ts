import { AuthenticationAction, AuthenticationActionType } from './actions';

export interface AuthenticationState {
  isPinSet: boolean;
  isTcAccepted: boolean;
  isTxPasswordSet: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string;
}

const initialState: AuthenticationState = {
  isTxPasswordSet: false,
  isPinSet: false,
  isTcAccepted: false,
  isAuthenticated: false,
  isLoading: true,
  error: '',
};

export const authenticationReducer = (state = initialState, action: AuthenticationActionType): AuthenticationState => {
  switch (action.type) {
    case AuthenticationAction.SetIsTcAccepted:
      return {
        ...state,
        isTcAccepted: action.isTcAccepted,
      };
    case AuthenticationAction.SetIsAuthenticated:
      return {
        ...state,
        isAuthenticated: action.isAuthenticated,
      };
    case AuthenticationAction.CheckCredentials:
    case AuthenticationAction.CreateTxPassword:
      return {
        ...state,
        isLoading: true,
      };
    case AuthenticationAction.AuthenticateSuccess:
      return {
        ...state,
        error: '',
        isAuthenticated: true,
        isLoading: false,
      };
    case AuthenticationAction.CheckCredentialsSuccess:
      return {
        ...state,
        error: '',
        isPinSet: action.credentials.isPinSet,
        isTxPasswordSet: action.credentials.isTxPasswordSet,
        isLoading: false,
      };
    case AuthenticationAction.CreatePinSuccess:
      return {
        ...state,
        error: '',
        isPinSet: true,
      };
    case AuthenticationAction.CreateTxPasswordSuccess:
      return {
        ...state,
        error: '',
        isLoading: false,
        isTxPasswordSet: true,
        isAuthenticated: true,
      };
    case AuthenticationAction.CheckCredentialsFailure:
    case AuthenticationAction.AuthenticateFailure:
    case AuthenticationAction.CreatePinFailure:
      return {
        ...state,
        isAuthenticated: false,
        error: action.error,
        isLoading: false,
      };
    default:
      return state;
  }
};
