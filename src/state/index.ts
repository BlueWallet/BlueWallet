import { combineReducers } from 'redux';

import { appSettingsReducer, AppSettingsState } from './appSettings/reducer';
import { contactsReducer, ContactsState } from './contacts/reducer';
import { transactionsReducer, TransactionsState } from './transactions/reducer';

export interface ApplicationState {
  contacts: ContactsState;
  transactions: TransactionsState;
  appSettings: AppSettingsState;
}

export const rootReducer = combineReducers({
  contacts: contactsReducer,
  transactions: transactionsReducer,
  appSettings: appSettingsReducer,
});
