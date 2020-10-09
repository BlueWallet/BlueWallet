import { takeEvery, put } from 'redux-saga/effects';

import {
  TransactionsAction,
  CreateTransactionNoteAction,
  createTransactionNoteSuccess,
  createTransactionNoteFailure,
} from './actions';

const BlueElectrum = require('../../../BlueElectrum');

export function* createTransactionNoteSaga(action: CreateTransactionNoteAction | unknown) {
  const {
    payload: { note, txid },
  } = action as CreateTransactionNoteAction;

  try {
    const {
      [txid]: { hash },
    } = yield BlueElectrum.multiGetTransactionByTxid([txid]);

    yield put(createTransactionNoteSuccess(hash, note));
  } catch (e) {
    yield put(createTransactionNoteFailure(e.message));
  }
}

export default [takeEvery(TransactionsAction.CreateTransactionNote, createTransactionNoteSaga)];
