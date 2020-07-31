import { AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';

import { Wallet, Transaction } from 'app/consts';
import { isAllWallets } from 'app/helpers/helpers';
import { BlueApp } from 'app/legacy';

import { loadTransactionsSuccess } from '../transactions/actions';

const BlueElectrum = require('../../../BlueElectrum');

export enum WalletsAction {
  LoadWallets = 'LoadWallets',
  LoadWalletsRequest = 'LoadWalletsRequest',
  LoadWalletsSuccess = 'LoadWalletsSuccess',
  LoadWalletsFailure = 'LoadWalletsFailure',
  UpdateWallet = 'UpdateWallet',
}

export interface LoadWalletsAction {
  type: WalletsAction.LoadWallets;
}

export interface LoadWalletsRequestAction {
  type: WalletsAction.LoadWalletsRequest;
}

export interface LoadWalletsSuccessAction {
  type: WalletsAction.LoadWalletsSuccess;
  wallets: Wallet[];
}

export interface LoadWalletsFailureAction {
  type: WalletsAction.LoadWalletsFailure;
  error: Error;
}

export interface UpdateWalletAction {
  type: WalletsAction.UpdateWallet;
  wallet: Wallet;
}

export type WalletsActionType =
  | LoadWalletsRequestAction
  | LoadWalletsSuccessAction
  | LoadWalletsFailureAction
  | LoadWalletsAction
  | UpdateWalletAction;

export const loadWallets = (walletIndex?: number) => async (
  dispatch: ThunkDispatch<any, any, AnyAction>,
): Promise<WalletsActionType> => {
  dispatch(loadWalletsRequest());
  try {
    await BlueElectrum.waitTillConnected();
    await BlueApp.fetchWalletBalances(walletIndex);
    await BlueApp.fetchWalletTransactions(walletIndex);
    await BlueApp.saveToDisk();
    const allWalletsBalance = BlueApp.getBalance();
    const allWalletsIncomingBalance = BlueApp.getIncomingBalance();

    const allWallets = BlueApp.getWallets();
    const wallets: Wallet[] =
      allWallets.length > 1
        ? [
            {
              label: 'All wallets',
              balance: allWalletsBalance,
              incoming_balance: allWalletsIncomingBalance,
              preferredBalanceUnit: 'BTCV',
              type: '',
            },
            ...allWallets,
          ]
        : allWallets;
    wallets.forEach(wallet => {
      if (!isAllWallets(wallet)) {
        const walletBalanceUnit = wallet.getPreferredBalanceUnit();
        const walletLabel = wallet.getLabel();

        // mutating objects on purpose
        const enhanceTransactions = (t: Transaction) => {
          t.walletPreferredBalanceUnit = walletBalanceUnit;
          t.walletLabel = walletLabel;
        };
        wallet.transactions.forEach(enhanceTransactions);
        dispatch(loadTransactionsSuccess(wallet.secret, wallet.transactions));
      }
    });
    return dispatch(loadWalletsSuccess(wallets));
  } catch (e) {
    console.log('fetch wallets error:', e);
    return dispatch(loadWalletsFailure(e));
  }
};

const loadWalletsRequest = (): LoadWalletsRequestAction => ({
  type: WalletsAction.LoadWalletsRequest,
});

const loadWalletsSuccess = (wallets: Wallet[]): LoadWalletsSuccessAction => ({
  type: WalletsAction.LoadWalletsSuccess,
  wallets,
});

const loadWalletsFailure = (error: Error): LoadWalletsFailureAction => ({
  type: WalletsAction.LoadWalletsFailure,
  error,
});

export const updateWallet = (wallet: Wallet): UpdateWalletAction => ({
  type: WalletsAction.UpdateWallet,
  wallet,
});
