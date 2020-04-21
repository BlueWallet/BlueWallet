import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { NavigationScreenProps } from 'react-navigation';
import { connect } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';

import { icons } from 'app/assets';
import { Button, Header, InputItem, ScreenTemplate, Text, Image } from 'app/components';
import { Contact } from 'app/consts';
import i18n from 'app/locale';
import { createContact, CreateContactAction } from 'app/state/contacts/actions';
import { palette, typography } from 'app/styles';

interface Props extends NavigationScreenProps {
  createContact: (contact: Contact) => CreateContactAction;
}

interface State {
  name: string;
  address: string;
}

export class CreateContactScreen extends React.PureComponent<Props, State> {
  static navigationOptions = (props: NavigationScreenProps) => ({
    header: <Header navigation={props.navigation} isBackArrow title={i18n.contactCreate.screenTitle} />,
  });

  state: State = {
    name: '',
    address: '',
  };

  get canCreateContact(): boolean {
    return !!this.state.address && !!this.state.name;
  }

  setName = (name: string) => this.setState({ name });

  setAddress = (address: string) => this.setState({ address });

  createContact = () => {
    this.props.createContact({
      id: uuidv4(),
      name: this.state.name,
      address: this.state.address,
    });
    this.props.navigation.goBack();
  };

  render() {
    return (
      <ScreenTemplate
        footer={
          <Button
            disabled={!this.canCreateContact}
            onPress={this.createContact}
            title={i18n.contactCreate.buttonLabel}
            containerStyle={styles.buttonContainer}
          />
        }>
        <Text style={styles.subtitle}>{i18n.contactCreate.subtitle}</Text>
        <Text style={styles.description}>{i18n.contactCreate.description}</Text>
        <InputItem setValue={this.setName} label={i18n.contactCreate.nameLabel} />
        <View>
          <InputItem setValue={this.setAddress} label={i18n.contactCreate.addressLabel} />
          <TouchableOpacity style={styles.scanQRCodeButton}>
            <Image style={styles.qrCodeImage} source={icons.qrCode} />
          </TouchableOpacity>
        </View>
      </ScreenTemplate>
    );
  }
}
const mapDispatchToProps = {
  createContact,
};

export default connect(
  null,
  mapDispatchToProps,
)(CreateContactScreen);

const styles = StyleSheet.create({
  subtitle: {
    marginTop: 12,
    marginBottom: 18,
    ...typography.headline4,
    textAlign: 'center',
  },
  description: {
    marginBottom: 52,
    color: palette.textGrey,
    ...typography.caption,
    textAlign: 'center',
  },
  buttonContainer: {
    marginBottom: 20,
  },
  scanQRCodeButton: {
    position: 'absolute',
    right: 0,
    bottom: 36,
  },
  qrCodeImage: {
    width: 24,
    height: 24,
    padding: 8,
  },
});
