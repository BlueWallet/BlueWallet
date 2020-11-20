import { createSelector } from 'reselect';

import { ApplicationState } from 'app/state';

import { AuthenticationState } from './reducer';

const local = (state: ApplicationState): AuthenticationState => state.authentication;

export const error = createSelector(local, state => state.error);
export const isLoading = createSelector(local, state => state.isLoading);
export const isPinSet = createSelector(local, state => state.isPinSet);
export const isTcAccepted = createSelector(local, state => state.isTcAccepted);
export const isAuthenticated = createSelector(local, state => state.isAuthenticated);
export const isTxPasswordSet = createSelector(local, state => state.isTxPasswordSet);
