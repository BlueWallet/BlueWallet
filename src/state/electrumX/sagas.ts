import { difference } from 'lodash';
import { flatten, compose, map } from 'lodash/fp';
import { eventChannel } from 'redux-saga';
import { takeLatest, put, take, call, select } from 'redux-saga/effects';

import { Wallet } from 'app/consts';

import { actions as walletsActions, selectors as walletsSelectors } from '../wallets';
import {
  setBlockHeight,
  fetchBlockHeightFailure,
  fetchBlockHeightSuccess,
  ElectrumXAction,
  scriptHashChanged,
  setSubscribedScriptHashes,
} from './actions';
import { subscribedScriptHashes } from './selectors';

const BlueElectrum = require('../../../BlueElectrum');

function emitBlockchainHeaders() {
  return eventChannel(emitter => {
    const eventName = 'blockchain.headers.subscribe';

    BlueElectrum.subscribe(eventName, (event: [{ height: number; hex: string }]) => {
      emitter(event[0]);
    });

    return () => {
      BlueElectrum.unsubscribe(eventName);
    };
  });
}

export function* listenBlockchainHeadersSaga() {
  const chan = yield call(emitBlockchainHeaders);

  while (true) {
    const { height } = yield take(chan);
    yield put(setBlockHeight(height));
  }
}

export function* fetchBlockchainHeadersSaga() {
  try {
    yield BlueElectrum.waitTillConnected();
    const { height: blockHeight } = yield BlueElectrum.getBlockchainHeaders();
    yield put(fetchBlockHeightSuccess(blockHeight));
  } catch (err) {
    yield put(fetchBlockHeightFailure(err.message));
  }
}

function emitScriptHashesChange() {
  return eventChannel(emitter => {
    const eventName = 'blockchain.scripthash.subscribe';

    BlueElectrum.subscribe(eventName, (event: string[]) => {
      emitter(event);
    });

    return () => {
      BlueElectrum.unsubscribe(eventName);
    };
  });
}

export function* listenScriptHashesSaga() {
  yield BlueElectrum.waitTillConnected();

  const chan = yield call(emitScriptHashesChange);

  while (true) {
    const event = yield take(chan);
    const [scriptHash] = event;

    yield put(scriptHashChanged(scriptHash));
  }
}

export function* subscribeToScriptHashes() {
  const wallets = yield select(walletsSelectors.wallets);

  const walletsScriptHashes = compose(
    flatten,
    map((wallet: Wallet) => wallet.getScriptHashes()),
  )(wallets);

  const subScriptHashes: string[] = yield select(subscribedScriptHashes);

  const scriptHashesToSub = difference(walletsScriptHashes, subScriptHashes);

  yield BlueElectrum.subscribeToSriptHashes(scriptHashesToSub);

  const scriptHashesToUnsub = difference(subScriptHashes, walletsScriptHashes);

  yield BlueElectrum.unsubscribeFromSriptHashes(scriptHashesToUnsub);

  yield put(setSubscribedScriptHashes(walletsScriptHashes));
}

export default [
  takeLatest(
    [
      walletsActions.WalletsAction.LoadWalletsSuccess,
      walletsActions.WalletsAction.ImportWalletSuccess,
      walletsActions.WalletsAction.CreateWalletSuccess,
      walletsActions.WalletsAction.DeleteWalletSuccess,
    ],
    subscribeToScriptHashes,
  ),
  takeLatest(ElectrumXAction.StartListeners, listenScriptHashesSaga),
  takeLatest(ElectrumXAction.StartListeners, listenBlockchainHeadersSaga),
  takeLatest(ElectrumXAction.FetchBlockHeight, fetchBlockchainHeadersSaga),
];
