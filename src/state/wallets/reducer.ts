import { cloneDeep } from 'lodash';

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
    case WalletsAction.LoadWallets:
    case WalletsAction.DeleteWallet:
    case WalletsAction.CreateWallet:
    case WalletsAction.ImportWallet:
      return {
        ...state,
        isLoading: true,
      };
    case WalletsAction.LoadWalletsSuccess:
      return {
        ...state,
        wallets: cloneDeep(action.wallets),
        isLoading: false,
        isInitialized: true,
        error: null,
      };
    case WalletsAction.DeleteWalletSuccess:
      return {
        ...state,
        wallets: state.wallets.filter(w => w.id !== action.wallet.id),
        isLoading: false,
        error: null,
      };
    case WalletsAction.ImportWalletSuccess:
    case WalletsAction.CreateWalletSuccess:
      return {
        ...state,
        wallets: [...state.wallets, cloneDeep(action.wallet)],
        isLoading: false,
        error: null,
      };
    case WalletsAction.DeleteWalletFailure:
    case WalletsAction.LoadWalletsFailure:
    case WalletsAction.CreateWalletFailure:
    case WalletsAction.ImportWalletFailure:
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
