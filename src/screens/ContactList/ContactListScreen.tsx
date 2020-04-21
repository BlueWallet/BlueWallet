import React, { PureComponent } from 'react';
import { StatusBar } from 'react-native';
import { NavigationInjectedProps } from 'react-navigation';

import { ListEmptyState, SearchBar } from 'app/components';

import { ContactListHeader } from './ContactListHeader';

type Props = NavigationInjectedProps;

export class ContactListScreen extends PureComponent<Props> {
  navigateToAddContact = () => null;

  render() {
    return (
      <>
        <StatusBar barStyle="light-content" />
        <ContactListHeader onAddButtonPress={this.navigateToAddContact}>
          <SearchBar />
        </ContactListHeader>
        <ListEmptyState variant={ListEmptyState.Variant.ContactList} onPress={() => {}} />
      </>
    );
  }
}

export default ContactListScreen;
