/* global alert */
import React, { Component } from 'react';
import { ActivityIndicator, View, TextInput, KeyboardAvoidingView, Keyboard, TouchableWithoutFeedback, Text } from 'react-native';
import { BlueNavigationStyle, BlueButton, BlueBitcoinAmount, BlueDismissKeyboardInputAccessory } from '../../BlueComponents';
import PropTypes from 'prop-types';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
let EV = require('../../events');
let loc = require('../../loc');

export default class LNDCreateInvoice extends Component {
  static navigationOptions = ({ navigation }) => ({
    ...BlueNavigationStyle(navigation, true),
    title: loc.receive.header,
  });

  constructor(props) {
    super(props);
    // fallback to first wallet if it exists

    const fromWallet = props.navigation.getParam('fromWallet');
    this.state = {
      fromWallet,
      description: '',
      isLoading: false,
    };
  }

  async createInvoice() {
    this.setState({ isLoading: true }, async () => {
      try {
        const invoiceRequest = await this.state.fromWallet.addInvoice(this.state.amount, this.state.description);
        EV(EV.enum.TRANSACTIONS_COUNT_CHANGED);
        ReactNativeHapticFeedback.trigger('notificationSuccess', false);
        this.props.navigation.navigate('LNDViewInvoice', {
          invoice: invoiceRequest,
          fromWallet: this.state.fromWallet,
          isModal: true,
        });
      } catch (_error) {
        ReactNativeHapticFeedback.trigger('notificationError', false);
        this.setState({ isLoading: false });
        alert('Error');
      }
    });
  }

  renderCreateButton = () => {
    return (
      <View style={{ marginHorizontal: 56, marginVertical: 16, minHeight: 45, alignContent: 'center', backgroundColor: '#FFFFFF' }}>
        {this.state.isLoading ? (
          <ActivityIndicator />
        ) : (
          <BlueButton disabled={!this.state.amount > 0} onPress={() => this.createInvoice()} title={loc.send.details.create} />
        )}
      </View>
    );
  };

  render() {
    if (!this.state.fromWallet) {
      return (
        <View style={{ flex: 1, paddingTop: 20 }}>
          <Text>System error: Source wallet not found (this should never happen)</Text>
        </View>
      );
    }

    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ flex: 1, justifyContent: 'space-between' }}>
          <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
            <KeyboardAvoidingView behavior="position">
              <BlueBitcoinAmount
                isLoading={this.state.isLoading}
                amount={this.state.amount}
                onChangeText={text => {
                  this.setState({ amount: text });
                }}
                disabled={this.state.isLoading}
                unit={BitcoinUnit.SATS}
                inputAccessoryViewID={BlueDismissKeyboardInputAccessory.InputAccessoryViewID}
              />
              <View
                style={{
                  flexDirection: 'row',
                  borderColor: '#d2d2d2',
                  borderBottomColor: '#d2d2d2',
                  borderWidth: 1.0,
                  borderBottomWidth: 0.5,
                  backgroundColor: '#f5f5f5',
                  minHeight: 44,
                  height: 44,
                  marginHorizontal: 20,
                  alignItems: 'center',
                  marginVertical: 8,
                  borderRadius: 4,
                }}
              >
                <TextInput
                  onChangeText={text => this.setState({ description: text })}
                  placeholder={loc.receive.details.label}
                  value={this.state.description}
                  numberOfLines={1}
                  style={{ flex: 1, marginHorizontal: 8, minHeight: 33 }}
                  editable={!this.state.isLoading}
                  onSubmitEditing={Keyboard.dismiss}
                  inputAccessoryViewID={BlueDismissKeyboardInputAccessory.InputAccessoryViewID}
                />
              </View>
              <BlueDismissKeyboardInputAccessory />
              {this.renderCreateButton()}
            </KeyboardAvoidingView>
          </View>
        </View>
      </TouchableWithoutFeedback>
    );
  }
}

LNDCreateInvoice.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func,
    navigate: PropTypes.func,
    getParam: PropTypes.func,
  }),
};
