import { all } from 'redux-saga/effects';

import { sagas as authenticationSagas } from './authentication';
import { sagas as authenticatorsSagas } from './authenticators';
import { sagas as walletsSagas } from './wallets';

export function* rootSaga() {
  yield all([...authenticatorsSagas, ...walletsSagas, ...authenticationSagas]);
}
