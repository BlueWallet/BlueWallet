import { RouteProp, CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { connect } from 'react-redux';

import { Button, Header, ScreenTemplate } from 'app/components';
import { Contact, Route, MainTabNavigatorParams, RootStackParams } from 'app/consts';
import { CreateMessage, MessageType } from 'app/helpers/MessageCreator';
import { deleteContact, DeleteContactAction } from 'app/state/contacts/actions';
import { typography, palette } from 'app/styles';

const i18n = require('../../loc');

interface Props {
  navigation: CompositeNavigationProp<
    StackNavigationProp<RootStackParams, Route.DeleteContact>,
    CompositeNavigationProp<
      StackNavigationProp<MainTabNavigatorParams, Route.ContactList>,
      StackNavigationProp<RootStackParams, Route.DeleteContact>
    >
  >;
  route: RouteProp<RootStackParams, Route.DeleteContact>;
  deleteContact: (contact: Contact) => DeleteContactAction;
}

export class DeleteContactScreen extends React.PureComponent<Props> {
  navigateBack = () => this.props.navigation.goBack();
  navigateToContactList = () => this.props.navigation.navigate(Route.ContactList);
  deleteContact = () => {
    const { contact } = this.props.route.params;
    this.props.deleteContact(contact as Contact);
    CreateMessage({
      title: i18n.contactDelete.success,
      description: i18n.contactDelete.successDescription,
      type: MessageType.success,
      buttonProps: {
        title: i18n.contactDelete.successButton,
        onPress: this.navigateToContactList,
      },
    });
  };

  render() {
    const { contact } = this.props.route.params;
    return (
      <ScreenTemplate
        footer={
          <View style={styles.buttonContainer}>
            <Button
              testID="cancel-button"
              title={i18n.contactDelete.no}
              onPress={this.navigateBack}
              type="outline"
              containerStyle={styles.noButton}
            />
            <Button
              testID="confirm-button"
              title={i18n.contactDelete.yes}
              onPress={this.deleteContact}
              containerStyle={styles.yesButton}
            />
          </View>
        }
        header={<Header title={i18n.contactDelete.header} />}
      >
        <Text style={styles.title}>{i18n.contactDelete.title}</Text>
        <Text style={styles.description}>
          {i18n.contactDelete.description1} {contact?.name}
          {i18n.contactDelete.description2}
        </Text>
      </ScreenTemplate>
    );
  }
}

const mapDispatchToProps = {
  deleteContact,
};

export default connect(null, mapDispatchToProps)(DeleteContactScreen);

const styles = StyleSheet.create({
  title: { ...typography.headline4, marginTop: 16, textAlign: 'center' },
  description: {
    ...typography.caption,
    color: palette.textGrey,
    textAlign: 'center',
    marginTop: 18,
  },
  buttonContainer: { flexDirection: 'row', width: '50%' },
  noButton: { paddingRight: 10, width: '100%' },
  yesButton: { paddingLeft: 10, width: '100%' },
});
