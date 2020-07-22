import { createSelector } from 'reselect';

import { ApplicationState } from 'app/state';

import { AuthenticatorsState } from './reducer';

const local = (state: ApplicationState): AuthenticatorsState => state.authenticators;

export const error = createSelector(local, state => state.error);
export const isLoading = createSelector(local, state => state.isLoading);
export const list = createSelector(local, state => state.authenticators);

export const getById = createSelector(
  list,
  (_: AuthenticatorsState, id: string) => id,
  (data, id) => data.find(a => a.id === id),
);
