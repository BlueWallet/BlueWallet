/* global alert */
import React from 'react';
import { Text, ActivityIndicator, View, TouchableWithoutFeedback, Keyboard } from 'react-native';
import PropTypes from 'prop-types';
import {
  BlueSpacing20,
  BlueButton,
  SafeBlueArea,
  BlueCard,
  BlueNavigationStyle,
  BlueAddressInput,
  BlueBitcoinAmount,
} from '../../BlueComponents';
import { LightningCustodianWallet } from '../../class/lightning-custodian-wallet';
import { BitcoinUnit } from '../../models/bitcoinUnits';
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let EV = require('../../events');
let loc = require('../../loc');

export default class ScanLndInvoice extends React.Component {
  static navigationOptions = ({ navigation }) => ({
    ...BlueNavigationStyle(navigation, true),
    title: loc.send.header,
    headerLeft: null,
  });

  state = {
    isLoading: false,
    isAmountInitiallyEmpty: false,
  };

  constructor(props) {
    super(props);

    if (!BlueApp.getWallets().some(item => item.type === LightningCustodianWallet.type)) {
      alert('Before paying a Lightning invoice, you must first add a Lightning wallet.');
      props.navigation.dismiss();
    } else {
      let fromSecret;
      if (props.navigation.state.params.fromSecret) fromSecret = props.navigation.state.params.fromSecret;
      let fromWallet = {};

      if (!fromSecret) {
        const lightningWallets = BlueApp.getWallets().filter(item => item.type === LightningCustodianWallet.type);
        if (lightningWallets.length > 0) {
          fromSecret = lightningWallets[0].getSecret();
          console.warn('warning: using ln wallet index 0');
        }
      }

      for (let w of BlueApp.getWallets()) {
        if (w.getSecret() === fromSecret) {
          fromWallet = w;
          break;
        }
      }

      this.state = {
        fromWallet,
        fromSecret,
        destination: '',
      };
    }
  }

  async componentDidMount() {
    if (this.props.navigation.state.params.uri) {
      this.processTextForInvoice(this.props.navigation.getParam('uri'));
    }
  }

  processInvoice = data => {
    this.setState({ isLoading: true }, async () => {
      if (!this.state.fromWallet) {
        alert('Before paying a Lightning invoice, you must first add a Lightning wallet.');
        return this.props.navigation.goBack();
      }

      // handling BIP21 w/BOLT11 support
      let ind = data.indexOf('lightning=');
      if (ind !== -1) {
        data = data.substring(ind + 10).split('&')[0];
      }

      data = data.replace('LIGHTNING:', '').replace('lightning:', '');
      console.log(data);

      /**
       * @type {LightningCustodianWallet}
       */
      let w = this.state.fromWallet;
      let decoded;
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
          invoice: data,
          decoded,
          expiresIn,
          destination: data,
          isAmountInitiallyEmpty: decoded.num_satoshis === '0',
          isLoading: false,
        });
      } catch (Err) {
        Keyboard.dismiss();
        this.setState({ isLoading: false });
        alert(Err.message);
      }
    });
  };

  async pay() {
    if (!this.state.hasOwnProperty('decoded')) {
      return null;
    }

    this.setState(
      {
        isLoading: true,
      },
      async () => {
        let decoded = this.state.decoded;

        /** @type {LightningCustodianWallet} */
        let fromWallet = this.state.fromWallet;

        let expiresIn = (decoded.timestamp * 1 + decoded.expiry * 1) * 1000; // ms
        if (+new Date() > expiresIn) {
          this.setState({ isLoading: false });
          return alert('Invoice expired');
        }

        const currentUserInvoices = fromWallet.user_invoices_raw; // not fetching invoices, as we assume they were loaded previously
        if (currentUserInvoices.some(invoice => invoice.payment_hash === decoded.payment_hash)) {
          this.setState({ isLoading: false });
          return alert(loc.lnd.sameWalletAsInvoiceError);
        }

        try {
          await fromWallet.payInvoice(this.state.invoice, this.state.decoded.num_satoshis);
        } catch (Err) {
          console.log(Err.message);
          this.setState({ isLoading: false });
          return alert(Err.message);
        }

        EV(EV.enum.REMOTE_TRANSACTIONS_COUNT_CHANGED); // someone should fetch txs
        this.props.navigation.navigate('Success', {
          amount: this.state.decoded.num_satoshis,
          amountUnit: BitcoinUnit.SATS,
          invoiceDescription: this.state.decoded.description,
        });
      },
    );
  }

  processTextForInvoice = text => {
    if (text.toLowerCase().startsWith('lnb') || text.toLowerCase().startsWith('lightning:lnb')) {
      this.processInvoice(text);
    } else {
      this.setState({ decoded: undefined, expiresIn: undefined, destination: text });
    }
  };

  shouldDisablePayButton = () => {
    if (typeof this.state.decoded !== 'object') {
      return true;
    } else {
      if (!this.state.decoded.hasOwnProperty('num_satoshis')) {
        return true;
      }
    }
    return this.state.decoded.num_satoshis <= 0 || this.state.isLoading || isNaN(this.state.decoded.num_satoshis);
  };

  render() {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <SafeBlueArea forceInset={{ horizontal: 'always' }} style={{ flex: 1 }}>
          <BlueBitcoinAmount
            pointerEvents={this.state.isAmountInitiallyEmpty ? 'auto' : 'none'}
            isLoading={this.state.isLoading}
            amount={typeof this.state.decoded === 'object' ? this.state.decoded.num_satoshis : 0}
            onChangeText={text => {
              if (typeof this.state.decoded === 'object') {
                text = parseInt(text || 0);
                let decoded = this.state.decoded;
                decoded.num_satoshis = text;
                this.setState({ decoded: decoded });
              }
            }}
            disabled={typeof this.state.decoded !== 'object' || this.state.isLoading}
            unit={BitcoinUnit.SATS}
          />
          <BlueSpacing20 />
          <BlueCard>
            <BlueAddressInput
              onChangeText={text => {
                this.setState({ destination: text });
                this.processTextForInvoice(text);
              }}
              onBarScanned={this.processInvoice}
              address={this.state.destination}
              isLoading={this.state.isLoading}
              placeholder={loc.lnd.placeholder}
            />
            <View
              style={{
                flexDirection: 'row',
                marginHorizontal: 20,
                alignItems: 'center',
                marginVertical: 8,
                borderRadius: 4,
              }}
            >
              <Text numberOfLines={0} style={{ color: '#81868e', fontWeight: '500', fontSize: 14 }}>
                {this.state.hasOwnProperty('decoded') && this.state.decoded !== undefined ? this.state.decoded.description : ''}
              </Text>
            </View>
            {this.state.expiresIn !== undefined && (
              <Text style={{ color: '#81868e', fontSize: 12, left: 20, top: 10 }}>Expires in: {this.state.expiresIn}</Text>
            )}
            <BlueSpacing20 />
            <BlueSpacing20 />
            <BlueCard>
              {this.state.isLoading ? (
                <View>
                  <ActivityIndicator />
                </View>
              ) : (
                <BlueButton
                  icon={{
                    name: 'bolt',
                    type: 'font-awesome',
                    color: BlueApp.settings.buttonTextColor,
                  }}
                  title={'Pay'}
                  onPress={() => {
                    this.pay();
                  }}
                  disabled={this.shouldDisablePayButton()}
                />
              )}
            </BlueCard>
          </BlueCard>
        </SafeBlueArea>
      </TouchableWithoutFeedback>
    );
  }
}

ScanLndInvoice.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func,
    navigate: PropTypes.func,
    getParam: PropTypes.func,
    dismiss: PropTypes.func,
    state: PropTypes.shape({
      params: PropTypes.shape({
        uri: PropTypes.string,
        fromSecret: PropTypes.string,
      }),
    }),
  }),
};
