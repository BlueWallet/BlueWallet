/* global alert */
import React from 'react';
import { Text, Dimensions, ActivityIndicator, View, TouchableOpacity, TouchableWithoutFeedback, TextInput, Keyboard } from 'react-native';
import { Icon } from 'react-native-elements';
import PropTypes from 'prop-types';
import { BlueSpacing20, BlueButton, SafeBlueArea, BlueCard, BlueHeaderDefaultSub } from '../../BlueComponents';
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let currency = require('../../currency');
let EV = require('../../events');
let loc = require('../../loc');
const { width } = Dimensions.get('window');

export default class ScanLndInvoice extends React.Component {
  static navigationOptions = {
    header: ({ navigation }) => {
      return <BlueHeaderDefaultSub leftText={'Pay invoice'} onClose={() => navigation.goBack(null)} />;
    },
  };

  state = {
    isLoading: false,
  };

  constructor(props) {
    super(props);
    let fromSecret;
    if (props.navigation.state.params.fromSecret) fromSecret = props.navigation.state.params.fromSecret;
    let fromWallet = {};

    for (let w of BlueApp.getWallets()) {
      if (w.getSecret() === fromSecret) {
        fromWallet = w;
        break;
      }
    }

    this.state = {
      fromWallet,
      fromSecret,
    };
  }

  async componentDidMount() {
    EV(
      EV.enum.CREATE_TRANSACTION_NEW_DESTINATION_ADDRESS,
      data => {
        this.processInvoice(data);
      },
      true,
    );
  }

  async processInvoice(data) {
    if (this.ignoreRead) return;
    this.ignoreRead = true;
    setTimeout(() => {
      this.ignoreRead = false;
    }, 6000);

    if (!this.state.fromWallet) {
      alert('Error: cant find source wallet (this should never happen)');
      return this.props.navigation.goBack();
    }

    data = data.replace('LIGHTNING:', '').replace('lightning:', '');
    console.log(data);

    /**
     * @type {LightningCustodianWallet}
     */
    let w = this.state.fromWallet;
    let decoded = false;
    try {
      decoded = await w.decodeInvoice(data);

      let expiresIn = (decoded.timestamp * 1 + decoded.expiry * 1) * 1000; // ms
      if (+new Date() > expiresIn) {
        expiresIn = 'expired';
      } else {
        expiresIn = Math.round((expiresIn - +new Date()) / (60 * 1000)) + ' min';
      }
      Keyboard.dismiss();
      this.setState({
        isPaying: true,
        invoice: data,
        decoded,
        expiresIn,
      });
    } catch (Err) {
      alert(Err.message);
    }
  }

  async pay() {
    if (!this.state.hasOwnProperty('decoded')) {
      return null;
    }
    let decoded = this.state.decoded;

    /** @type {LightningCustodianWallet} */
    let fromWallet = this.state.fromWallet;

    let expiresIn = (decoded.timestamp * 1 + decoded.expiry * 1) * 1000; // ms
    if (+new Date() > expiresIn) {
      return alert('Invoice expired');
    }

    this.setState({
      isPayingInProgress: true,
    });

    let start = +new Date();
    let end;
    try {
      await fromWallet.payInvoice(this.state.invoice);
      end = +new Date();
    } catch (Err) {
      console.log(Err.message);
      this.props.navigation.goBack();
      return alert('Error');
    }

    console.log('payInvoice took', (end - start) / 1000, 'sec');
    EV(EV.enum.REMOTE_TRANSACTIONS_COUNT_CHANGED); // someone should fetch txs

    alert('Success');
    this.props.navigation.goBack();
  }

  render() {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <SafeBlueArea forceInset={{ horizontal: 'always' }} style={{ flex: 1 }}>
          <Text style={{ textAlign: 'center', fontSize: 50, fontWeight: '700', color: '#2f5fb3' }}>
            {this.state.hasOwnProperty('decoded') &&
              this.state.decoded !== undefined &&
              currency.satoshiToLocalCurrency(this.state.decoded.num_satoshis)}
          </Text>
          <Text style={{ textAlign: 'center', fontSize: 25, fontWeight: '600', color: '#d4d4d4' }}>
            {this.state.hasOwnProperty('decoded') &&
              this.state.decoded !== undefined &&
              currency.satoshiToBTC(this.state.decoded.num_satoshis)}
          </Text>
          <BlueSpacing20 />

          <BlueCard>
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
                onChangeText={text => {
                  if (text.toLowerCase().startsWith('lnb') || text.toLowerCase().startsWith('lntb')) {
                    this.processInvoice(text);
                  } else {
                    this.setState({ decoded: undefined, expiresIn: undefined });
                  }
                }}
                placeholder={loc.wallets.details.destination}
                numberOfLines={1}
                value={this.state.hasOwnProperty('decoded') && this.state.decoded !== undefined ? this.state.decoded.destination : ''}
                style={{ flex: 1, marginHorizontal: 8, minHeight: 33, height: 33 }}
                editable={!this.state.isLoading}
              />
              <TouchableOpacity
                disabled={this.state.isLoading}
                onPress={() => this.props.navigation.navigate('ScanQrAddress')}
                style={{
                  width: 75,
                  height: 36,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#bebebe',
                  borderRadius: 4,
                  paddingVertical: 4,
                  paddingHorizontal: 8,
                  marginHorizontal: 4,
                }}
              >
                <Icon name="qrcode" size={22} type="font-awesome" color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF' }}>{loc.send.details.scan}</Text>
              </TouchableOpacity>
            </View>
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
                onChangeText={text => {}}
                placeholder={loc.wallets.details.description}
                numberOfLines={1}
                value={this.state.hasOwnProperty('decoded') && this.state.decoded !== undefined ? this.state.decoded.description : ''}
                style={{ flex: 1, marginHorizontal: 8, minHeight: 33, height: 33 }}
                editable={!this.state.isLoading}
              />
            </View>
            {this.state.expiresIn !== undefined && (
              <Text style={{ color: '#81868e', fontSize: 12, left: 20, top: 10 }}>Expires in: {this.state.expiresIn}</Text>
            )}
          </BlueCard>

          <BlueSpacing20 />

          {this.state.hasOwnProperty('decoded') &&
            this.state.decoded !== undefined &&
            (() => {
              if (this.state.isPayingInProgress) {
                return (
                  <View>
                    <ActivityIndicator />
                  </View>
                );
              } else {
                return (
                  <BlueButton
                    icon={{
                      name: 'bolt',
                      type: 'font-awesome',
                      color: BlueApp.settings.buttonTextColor,
                    }}
                    title={'Pay'}
                    buttonStyle={{ width: 150, left: (width - 150) / 2 - 20 }}
                    onPress={() => {
                      this.pay();
                    }}
                  />
                );
              }
            })()}
        </SafeBlueArea>
      </TouchableWithoutFeedback>
    );
  }
}

ScanLndInvoice.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.function,
    navigate: PropTypes.function,
    state: PropTypes.shape({
      params: PropTypes.shape({
        fromSecret: PropTypes.string,
      }),
    }),
  }),
};
