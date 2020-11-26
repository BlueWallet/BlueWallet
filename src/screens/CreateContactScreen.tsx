import { CompositeNavigationProp, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { connect } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';

import { icons } from 'app/assets';
import { Button, Header, InputItem, ScreenTemplate, Text, Image } from 'app/components';
import { Contact, Route, MainTabNavigatorParams, MainCardStackNavigatorParams, CONST } from 'app/consts';
import { checkAddress } from 'app/helpers/DataProcessing';
import { CreateMessage, MessageType } from 'app/helpers/MessageCreator';
import { createContact, CreateContactAction } from 'app/state/contacts/actions';
import { palette, typography } from 'app/styles';

const i18n = require('../../loc');

interface Props {
  navigation: CompositeNavigationProp<
    StackNavigationProp<MainCardStackNavigatorParams, Route.CreateContact>,
    CompositeNavigationProp<
      StackNavigationProp<MainTabNavigatorParams, Route.ContactList>,
      StackNavigationProp<MainCardStackNavigatorParams, Route.ScanQrCode>
    >
  >;
  route: RouteProp<MainCardStackNavigatorParams, Route.CreateContact>;
  createContact: (contact: Contact) => CreateContactAction;
}

interface Input {
  value: string;
  error: string;
}

interface State {
  name: Input;
  address: Input;
}

export class CreateContactScreen extends React.PureComponent<Props, State> {
  state: State = {
    name: {
      value: '',
      error: '',
    },
    address: {
      value: '',
      error: '',
    },
  };

  static getDerivedStateFromProps(props: Props, state: State) {
    if (props.route.params?.address && !state.address.value) {
      return {
        address: {
          value: props.route.params.address,
        },
      };
    }
    return null;
  }

  get canCreateContact(): boolean {
    return !!this.state.address && !!this.state.name;
  }

  setName = (value: string): void => this.setState({ name: { value, error: '' } });

  setAddress = (value: string): void => this.setState({ address: { value, error: '' } });

  onBarCodeScan = (address: string): void => {
    this.setAddress(address.split('?')[0].replace('bitcoin:', ''));
  };

  createContact = () => {
    const { name, address } = this.state;
    const nameError = this.validateName();
    const addressError = this.validateAddress();

    if (addressError || nameError) {
      this.setState({
        name: { value: name.value, error: nameError },
        address: { value: address.value, error: addressError },
      });
      return;
    }
    this.props.createContact({
      id: uuidv4(),
      name: name.value.trim(),
      address: address.value.trim(),
    });
    this.setState(
      {
        name: { value: '', error: '' },
        address: { value: '', error: '' },
      },
      this.showSuccessImportMessageScreen,
    );
  };

  validateAddress = () => {
    let error = '';
    try {
      checkAddress(this.state.address.value);
    } catch (_) {
      error = i18n.send.details.address_field_is_not_valid;
    }
    return error;
  };

  validateName = () => {
    const { name } = this.state;
    let error = '';
    if (name.value.match(/[!@#$%^&*()\[\]\\\/,.?":{}|<>]/g)?.length) {
      error = i18n.contactCreate.nameCannotContainSpecialCharactersError;
    }
    if (!name.value.match(/\w/)?.length) {
      error = i18n.contactCreate.nameMissingAlphanumericCharacterError;
    }
    return error;
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
    const { address, name } = this.state;
    return (
      <ScreenTemplate
        footer={
          <Button
            disabled={!this.canCreateContact}
            onPress={this.createContact}
            title={i18n.contactCreate.buttonLabel}
          />
        }
        header={<Header isBackArrow title={i18n.contactCreate.screenTitle} />}
      >
        <Text style={styles.subtitle}>{i18n.contactCreate.subtitle}</Text>
        <Text style={styles.description}>{i18n.contactCreate.description}</Text>
        <InputItem setValue={this.setName} label={i18n.contactCreate.nameLabel} error={name.error} />
        <View style={styles.inputContainer}>
          <InputItem
            error={address.error}
            focused={!!address.value}
            value={address.value}
            multiline
            maxLength={CONST.maxAddressLength}
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
    marginBottom: 40,
    color: palette.textGrey,
    ...typography.caption,
    textAlign: 'center',
  },
  scanQRCodeButton: {
    position: 'absolute',
    right: 0,
    top: 20,
    padding: 8,
  },
  inputContainer: {
    height: 100,
  },
  qrCodeImage: {
    width: 24,
    height: 24,
    padding: 8,
  },
});
