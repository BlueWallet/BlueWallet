import { Contact } from 'app/consts';

import { ContactsAction, ContactsActionType } from './actions';

export interface ContactsState {
  contacts: Record<string, Contact>;
}

const initialState: ContactsState = {
  contacts: {},
};

export const contactsReducer = (state = initialState, action: ContactsActionType): ContactsState => {
  switch (action.type) {
    case ContactsAction.CreateContact:
      return {
        ...state,
        contacts: {
          ...state.contacts,
          [action.contact.id]: action.contact,
        },
      };
    case ContactsAction.UpdateContact:
      return {
        ...state,
        contacts: {
          ...state.contacts,
          [action.contact.id]: action.contact,
        },
      };
    case ContactsAction.DeleteContact:
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [action.contact.id]: deleted, ...contacts } = state.contacts;
      return {
        ...state,
        contacts,
      };
    default:
      return state;
  }
};
