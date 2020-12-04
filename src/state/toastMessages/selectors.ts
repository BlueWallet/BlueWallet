import { createSelector } from 'reselect';

import { ApplicationState } from 'app/state';

import { ToastMessagesState } from './reducer';

const local = (state: ApplicationState): ToastMessagesState => state.toastMessages;

export const toastMessages = createSelector(local, state => state.toastMessages);
