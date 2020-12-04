import { createSelector } from 'reselect';

import { ApplicationState } from 'app/state';

import { ElectrumXState } from './reducer';

const local = (state: ApplicationState): ElectrumXState => state.electrumX;

export const blockHeight = createSelector(local, state => state.blockHeight);

export const subscribedScriptHashes = createSelector(local, state => state.subscribedScriptHashes);

export const isInternetReachable = createSelector(local, state => state.isInternetReachable);

export const isServerConnected = createSelector(local, state => state.isServerConnected);

export const hasConnectionIssues = createSelector(
  isServerConnected,
  isInternetReachable,
  (serverConnection, internetReachable) => !(serverConnection && internetReachable),
);

export const hasConnectedToServerAtLeaseOnce = createSelector(local, state => state.hasConnectedToServerAtLeaseOnce);
