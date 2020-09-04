import { takeLatest, takeEvery, put, select } from 'redux-saga/effects';

import { BlueApp, Authenticator } from 'app/legacy';

import {
  loadAuthenticatorsFailure,
  loadAuthenticatorsSuccess,
  AuthenticatorsAction,
  deleteAuthenticatorSuccess,
  deleteAuthenticatorFailure,
  DeleteAuthenticatorAction,
  createAuthenticatorSuccess,
  createAuthenticatorFailure,
  CreateAuthenticatorAction,
  signTransactionSuccess,
  signTransactionFailure,
  SignTransactionAction,
} from './actions';
import { list } from './selectors';

const i18n = require('../../../loc');

export function* loadAuthenticatorsSaga() {
  try {
    const authenticators = BlueApp.getAuthenticators();

    yield put(loadAuthenticatorsSuccess(authenticators));
  } catch (e) {
    yield put(loadAuthenticatorsFailure(e.message));
  }
}

export function* deleteAuthenticatorSaga(action: DeleteAuthenticatorAction | unknown) {
  const {
    payload: { id },
    meta,
  } = action as DeleteAuthenticatorAction;

  try {
    const authenticator = BlueApp.removeAuthenticatorById(id);
    yield BlueApp.saveToDisk();
    yield put(deleteAuthenticatorSuccess(authenticator));

    if (meta?.onSuccess) {
      meta.onSuccess(authenticator);
    }
  } catch (e) {
    yield put(deleteAuthenticatorFailure(e.message));
    if (meta?.onFailure) {
      meta.onFailure(e.message);
    }
  }
}

export function* createAuthenticatorSaga(action: CreateAuthenticatorAction | unknown) {
  const {
    payload: { name, entropy, mnemonic },
    meta,
  } = action as CreateAuthenticatorAction;
  try {
    const authenticator = new Authenticator(name);
    yield authenticator.init({ entropy, mnemonic });
    BlueApp.addAuthenticator(authenticator);
    yield BlueApp.saveToDisk();
    yield put(createAuthenticatorSuccess(authenticator));
    if (meta?.onSuccess) {
      meta.onSuccess(authenticator);
    }
  } catch (e) {
    yield put(createAuthenticatorFailure(e.message));
    if (meta?.onFailure) {
      meta.onFailure(e.message);
    }
  }
}

export function* signTransactionSaga(action: SignTransactionAction | unknown) {
  const {
    payload: { encodedPsbt },
    meta,
  } = action as SignTransactionAction;

  try {
    const authenticators = yield select(list);

    for (let i = 0; i < authenticators.length; i++) {
      try {
        const authenticator = authenticators[i];
        const finalizedPsbt = yield authenticator.signAndFinalizePSBT(encodedPsbt);
        yield put(signTransactionSuccess());
        if (meta?.onSuccess) {
          meta.onSuccess({ authenticator, finalizedPsbt });
        }
      } catch (_) {}
    }
    throw new Error(i18n.authenticators.sign.error);
  } catch (e) {
    yield put(signTransactionFailure(e.message));
    if (meta?.onFailure) {
      meta.onFailure(e.message);
    }
  }
}

export default [
  takeLatest(AuthenticatorsAction.LoadAuthenticators, loadAuthenticatorsSaga),
  takeEvery(AuthenticatorsAction.DeleteAuthenticator, deleteAuthenticatorSaga),
  takeEvery(AuthenticatorsAction.CreateAuthenticator, createAuthenticatorSaga),
  takeEvery(AuthenticatorsAction.SignTransaction, signTransactionSaga),
];
