import { createSelector } from 'reselect';

import { ApplicationState } from 'app/state';

import { AppSettingsState } from './reducer';

const local = (state: ApplicationState): AppSettingsState => state.appSettings;

export const language = createSelector(local, state => state.language);
