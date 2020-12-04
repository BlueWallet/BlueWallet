import { takeLatest, takeEvery, put, call } from 'redux-saga/effects';

import { CONST } from 'app/consts';
import { BlueApp } from 'app/legacy';
import { SecureStorageService, StoreService } from 'app/services';

import {
  createTxPasswordSuccess,
  createTxPasswordFailure,
  createPinSuccess,
  createPinFailure,
  CreatePinAction,
  authenticateSuccess,
  authenticateFailure,
  AuthenticateAction,
  checkCredentialsFailure,
  checkCredentialsSuccess,
  CreateTxPasswordAction,
  CheckCredentialsAction,
  AuthenticationAction,
  setIsTcAccepted,
} from './actions';

export function* checkCredentialsSaga(action: CheckCredentialsAction | unknown) {
  const { meta } = action as CheckCredentialsAction;

  try {
    yield BlueApp.startAndDecrypt();
    const pin = yield call(SecureStorageService.getSecuredValue, CONST.pin);
    const transactionPassword = yield call(SecureStorageService.getSecuredValue, CONST.transactionPassword);
    const credentials = {
      isPinSet: !!pin,
      isTxPasswordSet: !!transactionPassword,
    };

    yield put(checkCredentialsSuccess(credentials));
    if (meta?.onSuccess) {
      meta.onSuccess(credentials);
    }
  } catch (e) {
    yield put(checkCredentialsFailure(e.message));
    if (meta?.onFailure) {
      meta.onFailure(e.message);
    }
  }
}

export function* authenticateSaga(action: AuthenticateAction | unknown) {
  const { meta, payload } = action as AuthenticateAction;
  try {
    const storedPin = yield call(SecureStorageService.getSecuredValue, CONST.pin);
    if (payload.pin !== storedPin) {
      throw new Error('Wrong pin');
    }
    yield put(authenticateSuccess());

    if (meta?.onSuccess) {
      meta.onSuccess();
    }
  } catch (e) {
    yield put(authenticateFailure(e.message));

    if (meta?.onFailure) {
      meta.onFailure();
    }
  }
}

export function* createPinSaga(action: CreatePinAction | unknown) {
  const { meta, payload } = action as CreatePinAction;
  try {
    yield call(SecureStorageService.setSecuredValue, CONST.pin, payload.pin);

    yield put(createPinSuccess());

    if (meta?.onSuccess) {
      meta.onSuccess();
    }
  } catch (e) {
    yield put(createPinFailure(e.message));
    if (meta?.onFailure) {
      meta.onFailure();
    }
  }
}

export function* createTxPasswordSaga(action: CreateTxPasswordAction | unknown) {
  const { meta, payload } = action as CreateTxPasswordAction;
  try {
    yield call(SecureStorageService.setSecuredValue, CONST.transactionPassword, payload.txPassword, true);
    yield put(createTxPasswordSuccess());
    if (meta?.onSuccess) {
      meta.onSuccess();
    }
  } catch (e) {
    yield put(createTxPasswordFailure(e.message));
    if (meta?.onFailure) {
      meta.onFailure();
    }
  }
}

export function* checkTcSaga() {
  const tcVersion = yield call(StoreService.getStoreValue, CONST.tcVersion);
  if (tcVersion && Number(tcVersion) >= CONST.tcVersionRequired) {
    yield put(setIsTcAccepted(true));
  }
}

export function* createTcSaga() {
  yield call(StoreService.setStoreValue, CONST.tcVersion, CONST.tcVersionRequired);
  yield put(setIsTcAccepted(true));
}

export default [
  takeLatest(AuthenticationAction.CheckCredentials, checkCredentialsSaga),
  takeEvery(AuthenticationAction.Authenticate, authenticateSaga),
  takeEvery(AuthenticationAction.CreatePin, createPinSaga),
  takeEvery(AuthenticationAction.CreateTxPassword, createTxPasswordSaga),
  takeEvery(AuthenticationAction.CheckTc, checkTcSaga),
  takeEvery(AuthenticationAction.CreateTc, createTcSaga),
];
