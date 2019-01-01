import React, { Component } from 'react';
import { ActivityIndicator, View, TextInput, KeyboardAvoidingView, Keyboard, TouchableWithoutFeedback, Text } from 'react-native';
import { BlueNavigationStyle, BlueButton } from '../../BlueComponents';
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
      memo: '',
      isLoading: false,
    };
  }

  async createInvoice() {
    this.setState({ isLoading: true }, async () => {
      const invoiceRequest = await this.state.fromWallet.addInvoice(this.state.amount, this.state.memo);
      if (invoiceRequest === null) {
        ReactNativeHapticFeedback.trigger('notificationError', false);
      } else {
        EV(EV.enum.TRANSACTIONS_COUNT_CHANGED);
        ReactNativeHapticFeedback.trigger('notificationSuccess', false);
        this.props.navigation.navigate('LNDViewInvoice', {
          invoice: invoiceRequest,
          fromWallet: this.state.fromWallet,
        });
      }
      this.setState({ isLoading: false });
    });
  }

  renderCreateButton = () => {
    return (
      <View style={{ paddingHorizontal: 56, paddingVertical: 16, alignContent: 'center', backgroundColor: '#FFFFFF' }}>
        {this.state.isLoading ? (
          <ActivityIndicator />
        ) : (
          <BlueButton
            disabled={!(this.state.amount > 0 && this.state.memo.length > 0)}
            onPress={() => this.createInvoice()}
            title={loc.send.details.create}
          />
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
              <View style={{ flexDirection: 'row', justifyContent: 'center', paddingTop: 16, paddingBottom: 16 }}>
                <TextInput
                  keyboardType="numeric"
                  onChangeText={text => this.setState({ amount: text.replace(',', '').replace('.', '') })}
                  placeholder="0"
                  maxLength={10}
                  editable={!this.state.isLoading}
                  value={this.state.amount}
                  placeholderTextColor="#0f5cc0"
                  style={{
                    color: '#0f5cc0',
                    fontSize: 36,
                    fontWeight: '600',
                  }}
                />
                <Text
                  style={{
                    color: '#0f5cc0',
                    fontSize: 16,
                    marginHorizontal: 4,
                    paddingBottom: 6,
                    fontWeight: '600',
                    alignSelf: 'flex-end',
                  }}
                >
                  {' ' + 'satoshis'}
                </Text>
              </View>
              <View style={{ alignItems: 'center', marginBottom: 22, marginTop: 4 }}>
                <Text style={{ fontSize: 18, color: '#d4d4d4', fontWeight: '600' }}>
                  {loc.formatBalance(
                    loc.formatBalanceWithoutSuffix(this.state.amount || 0, BitcoinUnit.BTC) || 0,
                    BitcoinUnit.LOCAL_CURRENCY,
                  )}
                </Text>
              </View>
              <View
                hide={!this.state.showMemoRow}
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
                  onChangeText={text => this.setState({ memo: text })}
                  placeholder={loc.receive.details.label}
                  value={this.state.memo}
                  numberOfLines={1}
                  style={{ flex: 1, marginHorizontal: 8, minHeight: 33 }}
                  editable={!this.state.isLoading}
                />
              </View>
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
    goBack: PropTypes.function,
    navigate: PropTypes.func,
    getParam: PropTypes.func,
  }),
};
