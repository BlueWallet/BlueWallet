import { Contact } from 'app/consts';

export enum ContactsAction {
  CreateContact = 'CreateContact',
  UpdateContact = 'UpdateContact',
  DeleteContact = 'DeleteContact',
}

export interface CreateContactAction {
  type: ContactsAction.CreateContact;
  contact: Contact;
}

export interface UpdateContactAction {
  type: ContactsAction.UpdateContact;
  contact: Contact;
}

export interface DeleteContactAction {
  type: ContactsAction.DeleteContact;
  contact: Contact;
}

export type ContactsActionType = CreateContactAction | UpdateContactAction | DeleteContactAction;

export const createContact = (contact: Contact): CreateContactAction => ({
  type: ContactsAction.CreateContact,
  contact,
});

export const updateContact = (contact: Contact): UpdateContactAction => ({
  type: ContactsAction.UpdateContact,
  contact,
});

export const deleteContact = (contact: Contact): DeleteContactAction => ({
  type: ContactsAction.DeleteContact,
  contact,
});
