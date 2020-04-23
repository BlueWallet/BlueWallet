import { combineReducers } from 'redux';

import { contactsReducer, ContactsState } from './contacts/reducer';
import { transactionsReducer, TransactionsState } from './transactions/reducer';

export interface ApplicationState {
  contacts: ContactsState;
  transactions: TransactionsState;
}

export const rootReducer = combineReducers({
  contacts: contactsReducer,
  transactions: transactionsReducer,
});
