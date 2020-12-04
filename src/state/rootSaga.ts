import { all } from 'redux-saga/effects';

import { sagas as authenticationSagas } from './authentication';
import { sagas as authenticatorsSagas } from './authenticators';
import { sagas as electrumXSagas } from './electrumX';
import { sagas as toastMessagesSagas } from './toastMessages';
import { sagas as transactionsNotesSagas } from './transactionsNotes';
import { sagas as walletsSagas } from './wallets';

export function* rootSaga() {
  yield all([
    ...authenticatorsSagas,
    ...walletsSagas,
    ...authenticationSagas,
    ...transactionsNotesSagas,
    ...electrumXSagas,
    ...toastMessagesSagas,
  ]);
}
