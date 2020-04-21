import { combineReducers } from 'redux';

import { contactsReducer, ContactsState } from './contacts/reducer';

export interface ApplicationState {
  contacts: ContactsState;
}

export const rootReducer = combineReducers({
  contacts: contactsReducer,
});
