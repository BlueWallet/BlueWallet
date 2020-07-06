import { Wallet } from 'app/consts';

import { WalletsAction, WalletsActionType } from './actions';

export interface WalletsState {
  wallets: Wallet[];
  isInitialized: boolean;
  isLoading: boolean;
  error: Error | null;
}

const initialState: WalletsState = {
  wallets: [],
  isInitialized: false,
  isLoading: false,
  error: null,
};

export const walletsReducer = (state = initialState, action: WalletsActionType): WalletsState => {
  switch (action.type) {
    case WalletsAction.LoadWalletsRequest:
      return {
        ...state,
        isLoading: true,
      };
    case WalletsAction.LoadWalletsSuccess:
      return {
        ...state,
        wallets: action.wallets,
        isLoading: false,
        isInitialized: true,
        error: null,
      };
    case WalletsAction.LoadWalletsFailure:
      return {
        ...state,
        isLoading: false,
        isInitialized: true,
        error: action.error,
      };
    case WalletsAction.UpdateWallet:
      return {
        ...state,
        wallets: state.wallets.map(wallet => (wallet !== action.wallet ? wallet : action.wallet)),
      };
    default:
      return state;
  }
};
