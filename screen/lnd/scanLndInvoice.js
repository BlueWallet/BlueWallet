/* global alert */
import React from 'react';
import { Text, ActivityIndicator, View, TouchableWithoutFeedback, TouchableOpacity, Keyboard } from 'react-native';
import PropTypes from 'prop-types';
import {
  BlueSpacing20,
  BlueButton,
  SafeBlueArea,
  BlueCard,
  BlueDismissKeyboardInputAccessory,
  BlueNavigationStyle,
  BlueAddressInput,
  BlueBitcoinAmount,
} from '../../BlueComponents';
import { LightningCustodianWallet } from '../../class/lightning-custodian-wallet';
import { BitcoinUnit, Chain } from '../../models/bitcoinUnits';
import { Icon } from 'react-native-elements';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
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
    renderWalletSelectionButtonHidden: false,
  };

  constructor(props) {
    super(props);

    if (!BlueApp.getWallets().some(item => item.type === LightningCustodianWallet.type)) {
      ReactNativeHapticFeedback.trigger('notificationError', false);
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
    this.keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', this._keyboardDidShow);
    this.keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', this._keyboardDidHide);
    if (this.props.navigation.state.params.uri) {
      this.processTextForInvoice(this.props.navigation.getParam('uri'));
    }
  }

  componentWillUnmount() {
    this.keyboardDidShowListener.remove();
    this.keyboardDidHideListener.remove();
  }

  _keyboardDidShow = () => {
    this.setState({ renderWalletSelectionButtonHidden: true });
  };

  _keyboardDidHide = () => {
    this.setState({ renderWalletSelectionButtonHidden: false });
  };

  processInvoice = data => {
    this.setState({ isLoading: true }, async () => {
      if (!this.state.fromWallet) {
        ReactNativeHapticFeedback.trigger('notificationError', false);
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
        ReactNativeHapticFeedback.trigger('notificationError', false);
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
          ReactNativeHapticFeedback.trigger('notificationError', false);
          return alert('Invoice expired');
        }

        const currentUserInvoices = fromWallet.user_invoices_raw; // not fetching invoices, as we assume they were loaded previously
        if (currentUserInvoices.some(invoice => invoice.payment_hash === decoded.payment_hash)) {
          this.setState({ isLoading: false });
          ReactNativeHapticFeedback.trigger('notificationError', false);
          return alert(loc.lnd.sameWalletAsInvoiceError);
        }

        try {
          await fromWallet.payInvoice(this.state.invoice, this.state.decoded.num_satoshis);
        } catch (Err) {
          console.log(Err.message);
          this.setState({ isLoading: false });
          ReactNativeHapticFeedback.trigger('notificationError', false);
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

  renderWalletSelectionButton = () => {
    if (this.state.renderWalletSelectionButtonHidden) return;
    return (
      <View style={{ marginBottom: 24, alignItems: 'center' }}>
        {!this.state.isLoading && (
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 16 }}
            onPress={() =>
              this.props.navigation.navigate('SelectWallet', { onWalletSelect: this.onWalletSelect, chainType: Chain.OFFCHAIN })
            }
          >
            <Text style={{ color: '#9aa0aa', fontSize: 14, paddingHorizontal: 16, alignSelf: 'center' }}>
              {loc.wallets.select_wallet.toLowerCase()}
            </Text>
            <Icon name="angle-right" size={22} type="font-awesome" color="#9aa0aa" />
          </TouchableOpacity>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 4 }}>
          <Text style={{ color: '#0c2550', fontSize: 14 }}>{this.state.fromWallet.getLabel()}</Text>
          <Text style={{ color: '#0c2550', fontSize: 14, fontWeight: '600', marginLeft: 8, marginRight: 4 }}>
            {this.state.fromWallet.getBalance()}
          </Text>
          <Text style={{ color: '#0c2550', fontSize: 11, fontWeight: '600', textAlignVertical: 'bottom', marginTop: 2 }}>
            {BitcoinUnit.BTC}
          </Text>
        </View>
      </View>
    );
  };

  onWalletSelect = wallet => {
    this.setState({ fromSecret: wallet.getSecret(), fromWallet: wallet }, () => {
      this.props.navigation.pop();
    });
  };

  render() {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <SafeBlueArea forceInset={{ horizontal: 'always' }} style={{ flex: 1 }}>
          <View style={{ flex: 1 }}>
            <View style={{ flex: 1 }}>
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
                inputAccessoryViewID={BlueDismissKeyboardInputAccessory.InputAccessoryViewID}
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
                  inputAccessoryViewID={BlueDismissKeyboardInputAccessory.InputAccessoryViewID}
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
            </View>

            {this.renderWalletSelectionButton()}
          </View>
          <BlueDismissKeyboardInputAccessory />
        </SafeBlueArea>
      </TouchableWithoutFeedback>
    );
  }
}

ScanLndInvoice.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func,
    navigate: PropTypes.func,
    pop: PropTypes.func,
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
