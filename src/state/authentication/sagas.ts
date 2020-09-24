import SplashScreen from 'react-native-splash-screen';
import { takeLatest, takeEvery, put, call } from 'redux-saga/effects';

import { CONST } from 'app/consts';
import { BlueApp } from 'app/legacy';
import { SecureStorageService } from 'app/services';

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
} from './actions';

export function* checkCredentialsSaga(action: CheckCredentialsAction | unknown) {
  const { meta } = action as CheckCredentialsAction;

  try {
    BlueApp.startAndDecrypt();
    const pin = yield call(SecureStorageService.getSecuredValue, CONST.pin);
    const transactionPassword = yield call(SecureStorageService.getSecuredValue, CONST.transactionPassword);
    SplashScreen.hide();
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
    yield call(SecureStorageService.setSecuredValue, CONST.transactionPassword, payload.txPassword);
    if (meta?.onSuccess) {
      meta.onSuccess();
    }
    yield put(createTxPasswordSuccess());
  } catch (e) {
    yield put(createTxPasswordFailure(e.message));
    if (meta?.onFailure) {
      meta.onFailure();
    }
  }
}

export default [
  takeLatest(AuthenticationAction.CheckCredentials, checkCredentialsSaga),
  takeEvery(AuthenticationAction.Authenticate, authenticateSaga),
  takeEvery(AuthenticationAction.CreatePin, createPinSaga),
  takeEvery(AuthenticationAction.CreateTxPassword, createTxPasswordSaga),
];
