/* global alert */
import React, { Component } from 'react';
import { ActivityIndicator, View, TextInput, KeyboardAvoidingView, Keyboard, TouchableWithoutFeedback, Text } from 'react-native';
import { BlueNavigationStyle, BlueButton, BlueReadQRButton, BlueBitcoinAmount, BlueDismissKeyboardInputAccessory } from '../../BlueComponents';
import PropTypes from 'prop-types';
import bech32 from 'bech32';
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
      amount: '',
      description: '',
      isLoading: false,
      lnurl: '',
      lnurlParams: null,
    };
  }

  async createInvoice() {
    this.setState({ isLoading: true }, async () => {
      try {
        const invoiceRequest = await this.state.fromWallet.addInvoice(this.state.amount, this.state.description);
        EV(EV.enum.TRANSACTIONS_COUNT_CHANGED);
        ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });

        // send to lnurl-withdraw callback url if that exists
        if (this.state.lnurlParams) {
          let {callback, k1} = this.state.lnurlParams;
          let callbackUrl = callback + (callback.indexOf('?') !== -1 ? '&' : '?') + 'k1=' + k1 + '&pr=' + invoiceRequest;
          let resp = await fetch(callbackUrl, {method: 'GET'});
          if (resp.status >= 300) {
            let text = await resp.text();
            throw new Error(text);
          }
          let reply = await resp.json();
          if (reply.status === 'ERROR') {
            throw new Error('Reply from server: ' + reply.reason);
          }
        }

        this.props.navigation.navigate('LNDViewInvoice', {
          invoice: invoiceRequest,
          fromWallet: this.state.fromWallet,
          isModal: true,
        });
      } catch (Err) {
        ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
        this.setState({ isLoading: false });
        alert(Err.message);
      }
    });
  }

  processLnurl = data => {
    this.setState({ isLoading: true }, async () => {
      if (!this.state.fromWallet) {
        ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
        alert('Before paying a Lightning invoice, you must first add a Lightning wallet.');
        return this.props.navigation.goBack();
      }

      // handling fallback lnurl
      let ind = data.indexOf('lightning=');
      if (ind !== -1) {
        data = data.substring(ind + 10).split('&')[0];
      }

      data = data.replace('LIGHTNING:', '').replace('lightning:', '');
      console.log(data);

      // decoding the lnurl
      let decoded = bech32.decode(data, 1500);
      let url = Buffer.from(bech32.fromWords(decoded.words)).toString();

      // calling the url
      try {
        let resp = await fetch(url, {method: 'GET'})
        if (resp.status >= 300) {
          throw new Error("Bad response from server");
        }
        let reply = await resp.json();
        if (reply.status === 'ERROR') {
          throw new Error('Reply from server: ' + reply.reason);
        }

        // setting the invoice creating screen with the parameters
        this.setState({
          isLoading: false,
          lnurlParams: {k1: reply.k1, callback: reply.callback, amountIsFixed: reply.amountIsFixed},
          amount: (reply.maxWithdrawable / 1000).toString(),
          description: reply.defaultDescription,
        });
      } catch (Err) {
        Keyboard.dismiss();
        this.setState({ isLoading: false });
        ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
        alert(Err.message);
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

  renderScanButton = () => {
    return (
      <View style={{ marginHorizontal: 56, marginVertical: 4, minHeight: 25, alignContent: 'center', backgroundColor: '#FFFFFF' }}>
        <BlueReadQRButton
          onBarScanned={this.processLnurl}
          suffix="lnurl"
        />
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
                  if (this.state.lnurlParams && this.state.lnurlParams.amountIsFixed) {
                    // in this case we prevent the user from changing the amount
                    return;
                  }
                  this.setState({ amount: text });
                }}
                disabled={this.state.isLoading || (this.state.lnurlParams && this.state.lnurlParams.amountIsFixed)}
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
              {this.renderScanButton()}
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
