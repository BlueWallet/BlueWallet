import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { NavigationInjectedProps } from 'react-navigation';
import { connect } from 'react-redux';

import { Button, Header, ScreenTemplate } from 'app/components';
import { Contact, Route } from 'app/consts';
import { CreateMessage, MessageType } from 'app/helpers/MessageCreator';
import i18n from 'app/locale';
import { deleteContact, DeleteContactAction } from 'app/state/contacts/actions';
import { typography, palette } from 'app/styles';

interface Props extends NavigationInjectedProps<{ contact: Contact }> {
  deleteContact: (contact: Contact) => DeleteContactAction;
}

export class DeleteContactScreen extends React.PureComponent<Props> {
  static navigationOptions = () => ({
    header: <Header title={i18n.contactDelete.header} />,
  });

  navigateBack = () => this.props.navigation.goBack();

  deleteContact = () => {
    const contact = this.props.navigation.getParam('contact');
    this.props.deleteContact(contact);
    CreateMessage({
      title: i18n.contactDelete.success,
      description: i18n.contactDelete.successDescription,
      type: MessageType.success,
      buttonProps: {
        title: i18n.contactDelete.successButton,
        onPress: () => this.props.navigation.navigate(Route.ContactList),
      },
    });
  };

  render() {
    const contact = this.props.navigation.getParam('contact');
    return (
      <ScreenTemplate
        footer={
          <View style={styles.buttonContainer}>
            <Button
              title={i18n.contactDelete.no}
              onPress={this.navigateBack}
              type="outline"
              containerStyle={styles.noButton}
            />
            <Button title={i18n.contactDelete.yes} onPress={this.deleteContact} containerStyle={styles.yesButton} />
          </View>
        }
      >
        <Text style={styles.title}>{i18n.contactDelete.title}</Text>
        <Text style={styles.description}>
          {i18n.contactDelete.description1} {contact.name}
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
