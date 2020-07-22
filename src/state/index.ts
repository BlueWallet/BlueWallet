import { combineReducers } from 'redux';

import { appSettingsReducer, AppSettingsState } from './appSettings/reducer';
import { AuthenticatorsState, authenticatorsReducer } from './authenticators/reducer';
import { contactsReducer, ContactsState } from './contacts/reducer';
import { transactionsReducer, TransactionsState } from './transactions/reducer';
import { WalletsState, walletsReducer } from './wallets/reducer';

export { actions, selectors } from './authenticators';
export interface ApplicationState {
  contacts: ContactsState;
  transactions: TransactionsState;
  appSettings: AppSettingsState;
  wallets: WalletsState;
  authenticators: AuthenticatorsState;
}

export const rootReducer = combineReducers({
  contacts: contactsReducer,
  transactions: transactionsReducer,
  appSettings: appSettingsReducer,
  wallets: walletsReducer,
  authenticators: authenticatorsReducer,
});
