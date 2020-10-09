import { createSelector } from 'reselect';

import { ApplicationState } from 'app/state';

import { ElectrumXState } from './reducer';

const local = (state: ApplicationState): ElectrumXState => state.electrumX;

export const blockHeight = createSelector(local, state => state.blockHeight);

export const subscribedScriptHashes = createSelector(local, state => state.subscribedScriptHashes);
