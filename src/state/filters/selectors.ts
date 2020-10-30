import { createSelector } from 'reselect';

import { Filters, CONST } from 'app/consts';
import { ApplicationState } from 'app/state';

const local = (state: ApplicationState): Filters => state.filters;

export const getTags = createSelector(local, state =>
  state.transactionType === CONST.receive ? state.transactionReceivedTags : state.transactionSentTags,
);
