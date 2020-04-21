import { Contact } from 'app/consts';

export enum ContactsAction {
  CreateContact = 'CreateContact',
  UpdateContact = 'UpdateContact',
}

export interface CreateContactAction {
  type: ContactsAction.CreateContact;
  contact: Contact;
}

export interface UpdateContactAction {
  type: ContactsAction.UpdateContact;
  contact: Contact;
}

export type ContactsActionType = CreateContactAction | UpdateContactAction;

export const createContact = (contact: Contact): CreateContactAction => ({
  type: ContactsAction.CreateContact,
  contact,
});

export const updateContact = (contact: Contact): UpdateContactAction => ({
  type: ContactsAction.UpdateContact,
  contact,
});
