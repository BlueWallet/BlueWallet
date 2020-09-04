import { takeEvery, put, all, call } from 'redux-saga/effects';

import { BlueApp } from 'app/legacy';

import {
  WalletsAction,
  loadWalletsSuccess,
  loadWalletsFailure,
  DeleteWalletAction,
  deleteWalletSuccess,
  deleteWalletFailure,
  CreateWalletAction,
  ImportWalletAction,
  createWalletSuccess,
  createWalletFailure,
  importWalletSuccess,
  importWalletFailure,
} from './actions';

const BlueElectrum = require('../../../BlueElectrum');

export function* loadWalletsSaga() {
  try {
    yield BlueElectrum.waitTillConnected();

    yield all([
      call(() => BlueApp.fetchWalletBalances()),
      call(() => BlueApp.fetchWalletTransactions()),
      call(() => BlueApp.fetchWalletUtxos()),
    ]);

    const wallets = BlueApp.getWallets();
    yield put(loadWalletsSuccess(wallets));
  } catch (e) {
    yield put(loadWalletsFailure(e.message));
  }
}

export function* deleteWalletSaga(action: DeleteWalletAction | unknown) {
  const {
    payload: { id },
    meta,
  } = action as DeleteWalletAction;
  try {
    const wallet = BlueApp.removeWalletById(id);
    yield BlueApp.saveToDisk();

    yield put(deleteWalletSuccess(wallet));
    if (meta?.onSuccess) {
      meta.onSuccess(wallet);
    }
  } catch (e) {
    yield put(deleteWalletFailure(e.message));
    if (meta?.onFailure) {
      meta.onFailure(e.message);
    }
  }
}

export function* createWalletSaga(action: CreateWalletAction | unknown) {
  const {
    payload: { wallet },
    meta,
  } = action as CreateWalletAction;
  try {
    yield wallet.generate();

    BlueApp.addWallet(wallet);
    yield BlueApp.saveToDisk();

    yield put(createWalletSuccess(wallet));
    if (meta?.onSuccess) {
      meta.onSuccess(wallet);
    }
  } catch (e) {
    yield put(createWalletFailure(e.message));
    if (meta?.onFailure) {
      meta.onFailure(e.message);
    }
  }
}

export function* importWalletSaga(action: ImportWalletAction | unknown) {
  const {
    payload: { wallet },
    meta,
  } = action as ImportWalletAction;
  try {
    yield all([
      call(() => wallet.fetchBalance()),
      call(() => wallet.fetchTransactions()),
      call(() => wallet.fetchUtxos()),
    ]);
    BlueApp.addWallet(wallet);
    yield BlueApp.saveToDisk();

    yield put(importWalletSuccess(wallet));
    if (meta?.onSuccess) {
      meta.onSuccess(wallet);
    }
  } catch (e) {
    yield put(importWalletFailure(e.message));
    if (meta?.onFailure) {
      meta.onFailure(e.message);
    }
  }
}

export default [
  takeEvery(WalletsAction.DeleteWallet, deleteWalletSaga),
  takeEvery(WalletsAction.LoadWallets, loadWalletsSaga),
  takeEvery(WalletsAction.CreateWallet, createWalletSaga),
  takeEvery(WalletsAction.ImportWallet, importWalletSaga),
];
