import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { difference, noop } from 'lodash';
import { flatten, compose, map } from 'lodash/fp';
import RNBootSplash from 'react-native-bootsplash';
import { eventChannel } from 'redux-saga';
import { takeLatest, put, take, call, select, delay } from 'redux-saga/effects';

import { Wallet } from 'app/consts';

import logger from '../../../logger';
import { addToastMessage } from '../toastMessages/actions';
import * as walletsActions from '../wallets/actions';
import {
  setBlockHeight,
  fetchBlockHeightFailure,
  fetchBlockHeightSuccess,
  ElectrumXAction,
  scriptHashChanged,
  setSubscribedScriptHashes,
  setInternetConnection,
  setServerConnection,
  connectionClosed,
  connectionConnected,
} from './actions';
import {
  subscribedScriptHashes,
  isInternetReachable as isInternetReachableSelector,
  isServerConnected as isServerConnectedSelector,
} from './selectors';

const BlueElectrum = require('../../../BlueElectrum');
const i18n = require('../../../loc');

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
  const chan = yield call(emitScriptHashesChange);

  while (true) {
    const event = yield take(chan);
    const [scriptHash] = event;

    yield put(scriptHashChanged(scriptHash));
  }
}

function emitOnConnect() {
  return eventChannel(emitter => {
    BlueElectrum.subscribeToOnConnect(() => {
      emitter(true);
    });

    return () => {
      logger.info('electrmumX sagas', 'unsubscribed from BlueElectrum.subscribeToOnConnect');
      BlueElectrum.subscribeToOnConnect(noop);
    };
  });
}

export function* listenOnConnect() {
  const chan = yield call(emitOnConnect);

  while (true) {
    yield take(chan);
    yield put(connectionConnected());
  }
}

function emitOnClose() {
  return eventChannel(emitter => {
    BlueElectrum.subscribeToOnClose(() => {
      emitter(true);
    });

    return () => {
      logger.info('electrmumX sagas', 'unsubscribed from BlueElectrum.subscribeToOnClose');
      BlueElectrum.subscribeToOnClose(noop);
    };
  });
}

export function* listenOnClose() {
  const chan = yield call(emitOnClose);

  while (true) {
    yield take(chan);
    const isInternetReachable = yield select(isInternetReachableSelector);
    const { isInitialized } = (yield select()).wallets;
    if (isInternetReachable && isInitialized) {
      yield put(
        addToastMessage({
          title: i18n.connectionIssue.noNetworkTitle,
          description: i18n.connectionIssue.noNetworkDescription,
        }),
      );
    }

    yield put(connectionClosed());
  }
}

export function* subscribeToScriptHashes() {
  try {
    const { wallets } = (yield select()).wallets;

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
  } catch (e) {
    logger.error('electrumX sagas', `subscribeToScriptHashes error: ${e.message}`);
  }
}

export function* checkConnection() {
  try {
    const currentIsInternetReachable = yield select(isInternetReachableSelector);
    const currentIsServerConnectedSelector = yield select(isServerConnectedSelector);

    let internetState: NetInfoState | undefined = undefined;

    while (internetState === undefined || internetState?.isInternetReachable === null) {
      if (internetState !== undefined) {
        yield delay(500);
      }
      internetState = yield call(() => NetInfo.fetch());
    }
    const { isInternetReachable } = internetState;

    const isServerConnected = yield call(() => BlueElectrum.ping());
    const { isInitialized } = (yield select()).wallets;

    if (isInitialized && currentIsInternetReachable && !isInternetReachable) {
      yield put(
        addToastMessage({
          title: i18n.connectionIssue.offlineMessageTitle,
          description: i18n.connectionIssue.offlineMessageDescription,
        }),
      );
    }

    if (isInitialized && isInternetReachable && !isServerConnected && currentIsServerConnectedSelector) {
      yield put(
        addToastMessage({
          title: i18n.connectionIssue.noNetworkTitle,
          description: i18n.connectionIssue.noNetworkDescription,
        }),
      );
    }

    yield put(setInternetConnection(!!isInternetReachable));
    yield put(setServerConnection(isServerConnected));
  } catch (e) {
    logger.error('electrumX sagas', `checkConnection error: ${e.message}`);
  }
  RNBootSplash.hide({ duration: 250 });
}

function emitInternetConnectionChange() {
  return eventChannel(emitter => {
    const unsubscribe = NetInfo.addEventListener(state => {
      emitter(state);
    });
    return () => {
      unsubscribe();
    };
  });
}

export function* listenToInternetConnection() {
  const chan = yield call(emitInternetConnectionChange);

  while (true) {
    const { isInternetReachable } = yield take(chan);
    const currentIsInternetReachable = yield select(isInternetReachableSelector);
    const { isInitialized } = (yield select()).wallets;

    if (isInitialized && currentIsInternetReachable && !isInternetReachable) {
      yield put(
        addToastMessage({
          title: i18n.connectionIssue.offlineMessageTitle,
          description: i18n.connectionIssue.offlineMessageDescription,
        }),
      );
    }
    yield put(setInternetConnection(!!isInternetReachable));
  }
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
  takeLatest(ElectrumXAction.StartListeners, listenToInternetConnection),
  takeLatest(ElectrumXAction.CheckConnection, checkConnection),
  takeLatest(ElectrumXAction.StartListeners, listenOnClose),
  takeLatest(ElectrumXAction.StartListeners, listenOnConnect),
  takeLatest([ElectrumXAction.ConnectionConnected], listenScriptHashesSaga),
  takeLatest([ElectrumXAction.ConnectionConnected], listenBlockchainHeadersSaga),
  takeLatest(
    [ElectrumXAction.StartListeners, ElectrumXAction.FetchBlockHeight, ElectrumXAction.ConnectionConnected],
    fetchBlockchainHeadersSaga,
  ),
];
