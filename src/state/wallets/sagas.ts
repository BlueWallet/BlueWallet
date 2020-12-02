import { cloneDeep } from 'lodash';
import { Alert } from 'react-native';
import { takeEvery, takeLatest, put, all, call, select, delay, debounce } from 'redux-saga/effects';

import { Wallet } from 'app/consts';
import { takeLatestPerKey } from 'app/helpers/sagas';
import { BlueApp } from 'app/legacy';

import config from '../../../config';
import { messages } from '../../../error';
import { checkAddressNetworkName } from '../../../utils/bitcoin';
import { actions as electrumXActions } from '../electrumX';
import {
  WalletsAction,
  loadWallets,
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
  UpdateWalletAction,
  updateWalletSuccess,
  updateWalletFailure,
  SendTransactionAction,
  sendTransactionSuccess,
  sendTransactionFailure,
  refreshWallet,
  refreshWalletSuccess,
  refreshWalletFailure,
  RefreshWalletAction,
} from './actions';
import { getById as getByIdWallet, wallets as walletsSelector } from './selectors';

const BlueElectrum = require('../../../BlueElectrum');
const i18n = require('../../../loc');

export function* loadWalletsSaga() {
  try {
    yield BlueElectrum.ping();
    yield BlueElectrum.waitTillConnected();

    yield all([call(() => BlueApp.fetchWalletBalances()), call(() => BlueApp.fetchWalletTransactions())]);

    const wallets = BlueApp.getWallets();
    yield put(loadWalletsSuccess(wallets));
  } catch ({ message }) {
    if (message.includes(messages.noMatchingScript)) {
      const [address] = message.split(' ');
      const walletNetworkName = checkAddressNetworkName(address);
      Alert.alert(
        i18n.send.error.title,
        i18n.formatString(i18n.wallets.errors.wrongNetwork, {
          walletNetworkName,
          appNetworkName: config.networkName,
        }),
      );
    }
    yield put(loadWalletsFailure(message));
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
    yield all([call(() => wallet.fetchBalance()), call(() => wallet.fetchTransactions())]);
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

export function* updateWalletSaga(action: UpdateWalletAction | unknown) {
  const { wallet } = action as UpdateWalletAction;
  try {
    const updatedWallet = cloneDeep(BlueApp.updateWallet(wallet));
    yield BlueApp.saveToDisk();

    yield put(updateWalletSuccess(updatedWallet));
  } catch (e) {
    yield put(updateWalletFailure(e.message));
  }
}

export function* refreshWalletSaga(action: RefreshWalletAction | unknown) {
  // delay for debouncing refresh actions for the same wallet
  yield delay(2500);

  const { id } = action as RefreshWalletAction;

  const walletToRefresh: Wallet = cloneDeep(yield select(getByIdWallet, id));

  try {
    if (!walletToRefresh) {
      throw new Error(`No wallet to refresh`);
    }
    yield BlueElectrum.ping();
    yield BlueElectrum.waitTillConnected();

    yield all([call(() => walletToRefresh.fetchBalance()), call(() => walletToRefresh.fetchTransactions())]);

    yield put(refreshWalletSuccess(walletToRefresh));
  } catch (e) {
    yield put(refreshWalletFailure(e.message));
  }
}

export function* sendTransactionSaga(action: SendTransactionAction | unknown) {
  const {
    payload: { txDecoded },
    meta,
  } = action as SendTransactionAction;

  try {
    yield BlueElectrum.ping();
    yield BlueElectrum.waitTillConnected();
    const result = yield BlueElectrum.broadcast(txDecoded.toHex());

    yield put(sendTransactionSuccess());
    if (meta?.onSuccess) {
      meta.onSuccess(result);
    }
  } catch (e) {
    yield put(sendTransactionFailure(e.message));
    if (meta?.onFailure) {
      meta.onFailure(e.message);
    }
  }
}

export function* scripHashHasChangedSaga(action: electrumXActions.ScriptHashChangedAction | unknown) {
  const { scriptHash } = action as electrumXActions.ScriptHashChangedAction;

  const wallets: Wallet[] = yield select(walletsSelector);

  const walletToRefresh = wallets.find(w => w.getScriptHashes().includes(scriptHash));

  if (walletToRefresh) {
    yield put(refreshWallet(walletToRefresh.id));
  }
}

function* refreshWallets() {
  yield put(loadWallets());
}

export function* refreshAllWalletsSaga() {
  yield debounce(10000, WalletsAction.RefreshAllWallets, refreshWallets);
}

export default [
  takeLatestPerKey(WalletsAction.RefreshWallet, refreshWalletSaga, ({ id }: { id: string }) => id),
  takeEvery(electrumXActions.ElectrumXAction.ScriptHashChanged, scripHashHasChangedSaga),
  takeEvery(WalletsAction.DeleteWallet, deleteWalletSaga),
  takeLatest(WalletsAction.LoadWallets, loadWalletsSaga),
  takeEvery(WalletsAction.CreateWallet, createWalletSaga),
  takeEvery(WalletsAction.ImportWallet, importWalletSaga),
  takeEvery(WalletsAction.UpdateWallet, updateWalletSaga),
  takeEvery(WalletsAction.SendTransaction, sendTransactionSaga),
  takeLatest(electrumXActions.ElectrumXAction.StartListeners, refreshAllWalletsSaga),
];
