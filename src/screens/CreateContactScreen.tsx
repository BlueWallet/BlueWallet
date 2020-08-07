import { CompositeNavigationProp, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { connect } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';

import { icons } from 'app/assets';
import { Button, Header, InputItem, ScreenTemplate, Text, Image } from 'app/components';
import { Contact, Route, MainTabNavigatorParams, MainCardStackNavigatorParams } from 'app/consts';
import { checkAddress } from 'app/helpers/DataProcessing';
import { CreateMessage, MessageType } from 'app/helpers/MessageCreator';
import { createContact, CreateContactAction } from 'app/state/contacts/actions';
import { palette, typography } from 'app/styles';

const i18n = require('../../loc');

interface Props {
  navigation: CompositeNavigationProp<
    StackNavigationProp<MainTabNavigatorParams, Route.ContactList>,
    StackNavigationProp<MainCardStackNavigatorParams, Route.CreateContact>
  >;
  route: RouteProp<MainCardStackNavigatorParams, Route.CreateContact>;
  createContact: (contact: Contact) => CreateContactAction;
}

interface State {
  name: string;
  address: string;
  error: string;
}

export class CreateContactScreen extends React.PureComponent<Props, State> {
  state: State = {
    name: '',
    address: '',
    error: '',
  };

  static getDerivedStateFromProps(props: Props, state: State) {
    if (props.route.params.address && !state.address) {
      return {
        address: props.route.params.address,
      };
    }
    return null;
  }

  get canCreateContact(): boolean {
    return !!this.state.address && !!this.state.name;
  }

  setName = (name: string) => this.setState({ name });

  setAddress = (address: string) => this.setState({ address, error: '' });

  onBarCodeScan = (address: string) => {
    this.setAddress(address.split('?')[0].replace('bitcoin:', ''));
  };

  createContact = () => {
    try {
      this.validateAddress();
      if (this.state.error) return;
      this.props.createContact({
        id: uuidv4(),
        name: this.state.name.trim(),
        address: this.state.address.trim(),
      });
      this.showSuccessImportMessageScreen();
      this.setState({
        name: '',
        address: '',
      });
    } catch (_) {
      this.setState({
        error: i18n.send.details.address_field_is_not_valid,
      });
    }
  };

  validateAddress = () => {
    checkAddress(this.state.address);
  };

  onScanQrCodePress = () => {
    this.props.navigation.navigate(Route.ScanQrCode, {
      onBarCodeScan: this.onBarCodeScan,
    });
  };

  showSuccessImportMessageScreen = () =>
    CreateMessage({
      title: i18n.contactCreate.successTitle,
      description: i18n.contactCreate.successDescription,
      type: MessageType.success,
      buttonProps: {
        title: i18n.contactCreate.successButton,
        onPress: () => {
          this.props.navigation.navigate(Route.ContactList);
        },
      },
    });

  render() {
    const { address } = this.state;
    return (
      <ScreenTemplate
        footer={
          <Button
            disabled={!this.canCreateContact}
            onPress={this.createContact}
            title={i18n.contactCreate.buttonLabel}
          />
        }
        header={<Header navigation={this.props.navigation} isBackArrow title={i18n.contactCreate.screenTitle} />}
      >
        <Text style={styles.subtitle}>{i18n.contactCreate.subtitle}</Text>
        <Text style={styles.description}>{i18n.contactCreate.description}</Text>
        <InputItem setValue={this.setName} label={i18n.contactCreate.nameLabel} />
        <View>
          <InputItem
            error={this.state.error}
            focused={!!address}
            value={address}
            multiline
            setValue={this.setAddress}
            label={i18n.contactCreate.addressLabel}
          />
          <TouchableOpacity style={styles.scanQRCodeButton} onPress={this.onScanQrCodePress}>
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

export default connect(null, mapDispatchToProps)(CreateContactScreen);

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
