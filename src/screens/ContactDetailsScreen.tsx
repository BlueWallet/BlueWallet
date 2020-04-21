import React from 'react';
import { StyleSheet, View } from 'react-native';
import { NavigationScreenProps } from 'react-navigation';
import { connect } from 'react-redux';

import {
  Button,
  ButtonType,
  FlatButton,
  GenericInputItem,
  Header,
  ScreenTemplate,
  ContactAvatar,
} from 'app/components';
import { Contact } from 'app/consts';
import i18n from 'app/locale';
import { UpdateContactAction, updateContact } from 'app/state/contacts/actions';

interface Props extends NavigationScreenProps<{ contact: Contact }> {
  updateContact: (contact: Contact) => UpdateContactAction;
}

export class ContactDetailsScreen extends React.PureComponent<Props> {
  static navigationOptions = (props: NavigationScreenProps<{ contact: Contact }>) => ({
    header: <Header navigation={props.navigation} isBackArrow title={props.navigation.getParam('contact').name} />,
  });

  navigateToSendCoins = () => null;

  navigateToContactQRCode = () => null;

  deleteContact = () => null;

  render() {
    const contact = this.props.navigation.getParam('contact');
    return (
      <ScreenTemplate
        footer={
          <>
            <Button onPress={this.navigateToSendCoins} title={i18n.contactDetails.sendCoinsButton} />
            <Button
              onPress={this.navigateToContactQRCode}
              title={i18n.contactDetails.showQRCodeButton}
              containerStyle={styles.showWalletXPUBContainer}
            />
            <FlatButton
              onPress={this.deleteContact}
              title={i18n.contactDetails.deleteButton}
              containerStyle={styles.deleteWalletButtonContainer}
              buttonType={ButtonType.Warning}
            />
          </>
        }>
        <ContactAvatar contact={contact} />
        <View style={styles.nameInputContainer}>
          <GenericInputItem
            title={i18n.contactDetails.editName}
            label={i18n.contactDetails.nameLabel}
            value={contact.name}
          />
        </View>
        <View style={styles.addressInputContainer}>
          <GenericInputItem
            title={i18n.contactDetails.editAddress}
            label={i18n.contactDetails.addressLabel}
            value={contact.address}
          />
        </View>
      </ScreenTemplate>
    );
  }
}

const mapDispatchToProps = {
  updateContact,
};

export default connect(
  null,
  mapDispatchToProps,
)(ContactDetailsScreen);

const styles = StyleSheet.create({
  showWalletXPUBContainer: {
    marginTop: 20,
  },
  deleteWalletButtonContainer: {
    marginTop: 12,
  },
  nameInputContainer: {
    marginTop: 32,
  },
  addressInputContainer: {},
});
