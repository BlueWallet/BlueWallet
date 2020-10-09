import { combineReducers } from 'redux';

import { Filters } from 'app/consts';

import { appSettingsReducer, AppSettingsState } from './appSettings/reducer';
import { AuthenticationState, authenticationReducer } from './authentication/reducer';
import { AuthenticatorsState, authenticatorsReducer } from './authenticators/reducer';
import { contactsReducer, ContactsState } from './contacts/reducer';
import { ElectrumXState, electrumXReducer } from './electrumX/reducer';
import { filtersReducer } from './filters/reducer';
import { TimeCounterState, timeCounterReducer } from './timeCounter/reducer';
import { transactionsNotesReducer, TransactionsNotesState } from './transactionsNotes/reducer';
import { WalletsState, walletsReducer } from './wallets/reducer';

export { actions, selectors } from './authenticators';
export interface ApplicationState {
  contacts: ContactsState;
  transactions: TransactionsNotesState;
  appSettings: AppSettingsState;
  wallets: WalletsState;
  electrumX: ElectrumXState;
  timeCounter: TimeCounterState;
  authenticators: AuthenticatorsState;
  authentication: AuthenticationState;
  filters: Filters;
}

export const rootReducer = combineReducers({
  contacts: contactsReducer,
  transactions: transactionsNotesReducer,
  appSettings: appSettingsReducer,
  wallets: walletsReducer,
  electrumX: electrumXReducer,
  timeCounter: timeCounterReducer,
  authenticators: authenticatorsReducer,
  authentication: authenticationReducer,
  filters: filtersReducer,
});
