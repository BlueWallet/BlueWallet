import React, { PureComponent } from 'react';
import { StatusBar } from 'react-native';
import { NavigationInjectedProps } from 'react-navigation';
import { connect } from 'react-redux';

import { ListEmptyState, SearchBar } from 'app/components';
import { Route, Contact } from 'app/consts';
import { ApplicationState } from 'app/state';

import { ContactList } from './ContactList';
import { ContactListHeader } from './ContactListHeader';

interface Props extends NavigationInjectedProps {
  contacts: Contact[];
}

export class ContactListScreen extends PureComponent<Props> {
  navigateToAddContact = () => this.props.navigation.navigate(Route.CreateContact);

  render() {
    return (
      <>
        <StatusBar barStyle="light-content" />
        <ContactListHeader onAddButtonPress={this.navigateToAddContact}>
          <SearchBar />
        </ContactListHeader>
        {this.props.contacts && this.props.contacts.length ? (
          <ContactList contacts={this.props.contacts} />
        ) : (
          <ListEmptyState variant={ListEmptyState.Variant.ContactList} onPress={this.navigateToAddContact} />
        )}
      </>
    );
  }
}

const mapStateToProps = (state: ApplicationState) => ({
  contacts: Object.values(state.contacts.contacts),
});

export default connect(mapStateToProps)(ContactListScreen);
