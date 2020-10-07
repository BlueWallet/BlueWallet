import { createSelector } from 'reselect';

import { ApplicationState } from 'app/state';

import { AppSettingsState } from './reducer';

const local = (state: ApplicationState): AppSettingsState => state.appSettings;

/* we need fallback as language can be undefined for older version of application that doesn't have language set,
 because it was added later and in the redux-persist-storage can be old state without it*/
export const language = createSelector(local, state => state.language || 'en');
