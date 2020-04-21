import React, { PureComponent } from 'react';
import { StatusBar } from 'react-native';
import { NavigationInjectedProps } from 'react-navigation';

import { ListEmptyState, SearchBar } from 'app/components';
import { Route } from 'app/consts';

import { ContactListHeader } from './ContactListHeader';

type Props = NavigationInjectedProps;

export class ContactListScreen extends PureComponent<Props> {
  navigateToAddContact = () => this.props.navigation.navigate(Route.CreateContact);

  render() {
    return (
      <>
        <StatusBar barStyle="light-content" />
        <ContactListHeader onAddButtonPress={this.navigateToAddContact}>
          <SearchBar />
        </ContactListHeader>
        <ListEmptyState variant={ListEmptyState.Variant.ContactList} onPress={this.navigateToAddContact} />
      </>
    );
  }
}

export default ContactListScreen;
