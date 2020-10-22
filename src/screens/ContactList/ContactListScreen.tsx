import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { PureComponent } from 'react';
import { StatusBar } from 'react-native';
import { connect } from 'react-redux';

import { ListEmptyState, SearchBar, ScreenTemplate } from 'app/components';
import { Route, Contact, MainCardStackNavigatorParams } from 'app/consts';
import { ApplicationState } from 'app/state';

import { ContactList } from './ContactList';
import { ContactListHeader } from './ContactListHeader';

const i18n = require('../../../loc');

interface Props {
  navigation: StackNavigationProp<MainCardStackNavigatorParams, Route.ChooseContactList>;
  route: RouteProp<MainCardStackNavigatorParams, Route.ChooseContactList>;
  contacts: Contact[];
}

interface State {
  query: string;
}

export class ContactListScreen extends PureComponent<Props, State> {
  static navigationOptions = () => {
    return {
      header: null,
      tabBarLabel: i18n.contactList.bottomNavigationLabel,
    };
  };

  state: State = {
    query: '',
  };

  // @ts-ignore - TODO: fix it later
  navigateToAddContact = () => this.props.navigation.navigate(Route.CreateContact);

  navigateToContactDetails = (contact: Contact) => {
    const { navigation, route } = this.props;
    if (route.params?.onContactPress) {
      route.params?.onContactPress(contact.address);
      return navigation.goBack();
    }
    navigation.navigate(Route.ContactDetails, { contact });
  };

  setQuery = (query: string) => this.setState({ query });

  get filteredContacts(): Contact[] {
    return this.props.contacts.filter(contact => contact.name.toLowerCase().includes(this.state.query.toLowerCase()));
  }

  goBack = () => {
    this.props.navigation.goBack();
  };

  render() {
    const {
      contacts,
      route: { params },
    } = this.props;
    return (
      <ScreenTemplate
        header={
          <ContactListHeader
            onAddButtonPress={!params?.onContactPress ? this.navigateToAddContact : undefined}
            onBackArrowPress={params?.onContactPress && this.goBack}
            title={params?.title}
          >
            <SearchBar query={this.state.query} setQuery={this.setQuery} />
          </ContactListHeader>
        }
      >
        <StatusBar barStyle="light-content" />
        {contacts && contacts.length ? (
          <ContactList
            query={this.state.query}
            contacts={this.filteredContacts}
            navigateToContactDetails={this.navigateToContactDetails}
          />
        ) : (
          <ListEmptyState variant={ListEmptyState.Variant.ContactList} onPress={this.navigateToAddContact} />
        )}
      </ScreenTemplate>
    );
  }
}

const mapStateToProps = (state: ApplicationState) => ({
  contacts: Object.values(state.contacts.contacts),
});

export default connect(mapStateToProps)(ContactListScreen);
