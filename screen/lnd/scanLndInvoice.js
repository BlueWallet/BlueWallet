/* global alert */
import React from 'react';
import {
  Text,
  Image,
  Dimensions,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  View,
  ScrollView,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Keyboard,
} from 'react-native';
import PropTypes from 'prop-types';
import AsyncStorage from '@react-native-community/async-storage';
import createHash from 'create-hash'
import bech32 from 'bech32';
import debounce from 'debounce';
import {
  BlueButton,
  SafeBlueArea,
  BlueCard,
  BlueText,
  BlueDismissKeyboardInputAccessory,
  BlueNavigationStyle,
  BlueAddressInput,
  BlueBitcoinAmount,
} from '../../BlueComponents';
import { LightningCustodianWallet } from '../../class/lightning-custodian-wallet';
import { BitcoinUnit, Chain } from '../../models/bitcoinUnits';
import { Icon } from 'react-native-elements';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Biometric from '../../class/biometrics';
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let EV = require('../../events');
const loc = require('../../loc');
const { width, height } = Dimensions.get('window');

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
      ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
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
        ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
        alert('Before paying a Lightning invoice, you must first add a Lightning wallet.');
        return this.props.navigation.goBack();
      }

      // handling BIP21 w/BOLT11 support
      let ind = data.indexOf('lightning=');
      if (ind !== -1) {
        data = data.substring(ind + 10).split('&')[0];
      }

      data = data.replace('LIGHTNING:', '').replace('lightning:', '');

      /**
       * @type {LightningCustodianWallet}
       */
      let w = this.state.fromWallet;
      let decoded;
      try {
        decoded = w.decodeInvoice(data);

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
        ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
        alert(Err.message);
      }
    });
  };

  processLnurlPay = async data => {
    this.setState({ isLoading: true }, async () => {
      if (!this.state.fromWallet) {
        ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
        alert('Before sending payments you must add a Lightning wallet.');
        return this.props.navigation.goBack();
      }

      // handling fallback data
      let ind = data.indexOf('lightning=');
      if (ind !== -1) {
        data = data.substring(ind + 10).split('&')[0];
      }
      data = data.replace('LIGHTNING:', '').replace('lightning:', '');

      // decoding the data
      let decoded = bech32.decode(data, 1500);
      let url = Buffer.from(bech32.fromWords(decoded.words)).toString();

      // calling the url
      try {
        let resp = await fetch(url, { method: 'GET' });
        if (resp.status >= 300) {
          throw new Error('Bad response from server');
        }
        let reply = await resp.json();
        if (reply.status === 'ERROR') {
          throw new Error('Reply from server: ' + reply.reason);
        }

        if (reply.tag !== 'payRequest') {
          throw new Error('lnurl-pay expected, found tag ' + reply.tag);
        }

        // parse metadata and extract things from it
        var image
        var description
        let kvs = JSON.parse(reply.metadata)
        for (let i = 0; i < kvs.length; i++) {
          let [k, v] = kvs[i];
          switch (k) {
            case 'text/plain':
              description = v;
              break;
            case 'image/png;base64':
            case 'image/jpeg;base64':
              image = 'data:' + k + ',' + v;
              break;
          }
        }

        // setting the payment screen with the parameters
        let min = Math.ceil((reply.minSendable || 0) / 1000);
        let max = Math.floor(reply.maxSendable / 1000);

        this.setState({
          isLoading: false,
          lnurlParams: {
            callback: reply.callback,
            fixed: min === max,
            min,
            max,
            domain: reply.callback.match(new RegExp('https://([^/]+)/'))[1],
            metadata: reply.metadata,
            description,
            image,
            amount: min
          }
        });
      } catch (Err) {
        Keyboard.dismiss();
        this.setState({ isLoading: false, lnurlParams: null });
        ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
        alert(Err.message);
      }
    });
  };

  payLnurl = async () => {
    let {amount, metadata, image, description, domain, callback} = this.state.lnurlParams;

    // append amount to callback
    let url = callback + (
        callback.indexOf('?') !== -1
          ? '&'
          : '?' + 'amount=' + amount * 1000
    );

    // send amount and get invoice
    try {
      let resp = await fetch(url, { method: 'GET' });
      if (resp.status >= 300) {
        throw new Error('Bad response from server');
      }
      let reply = await resp.json();
      console.log('REPLY', reply)
      if (reply.status === 'ERROR') {
        throw new Error('Reply from server: ' + reply.reason);
      }

      let {pr, successAction} = reply;

      /**
       * @type {LightningCustodianWallet}
       */
      let w = this.state.fromWallet;

      // check pr description_hash
      let decoded = w.decodeInvoice(pr);

      let metadataHash = createHash('sha256').update(metadata).digest('hex');
      if (metadataHash !== decoded.description_hash) {
        throw new Error(`Invoice description_hash doesn't match metadata.`);
      }
      if (parseInt(decoded.num_satoshis) !== amount) {
        throw new Error(`Invoice doesn't match specified amount.`);
      }

      // meanwhile cleanup old successActions
      AsyncStorage.getAllKeys(async (err, keys) => {
        if (err) return;
        for (let i = 0; i < keys.length; i++) {
          let key = keys[i];
          if (!key.startsWith('lp:')) continue;
          let val = await AsyncStorage.getItem(key);
          console.log('inspecting key', key, val)
          if (val && val.time < Date.now() - 2592000000 /* 1 month */) {
            AsyncStorage.removeItem(key);
          }
        }
      });

      // store successAction for later
      AsyncStorage.setItem(`lp:${decoded.payment_hash}`, {
        successAction,
        description_hash: decoded.description_hash,
        domain,
        time: Date.now()
      });
      AsyncStorage.setItem(`lp:${decoded.description_hash}`, {
        metadata: { image, description },
        time: Date.now()
      });

      // pay invoice
      await w.payInvoice(pr);

      console.log('PAID', w.last_paid_invoice_result)

      EV(EV.enum.REMOTE_TRANSACTIONS_COUNT_CHANGED); // someone should fetch txs
      this.props.navigation.navigate('LnurlPaySuccess', {
        domain,
        amount,
        amountUnit: BitcoinUnit.SATS,
        successAction,
        preimage:
      });
    } catch (Err) {
      Keyboard.dismiss();
      this.setState({ isLoading: false, lnurlParams: null });
      ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
      alert(Err.message);
    }
  };

  async pay() {
    if (!this.state.hasOwnProperty('decoded')) {
      return null;
    }

    const isBiometricsEnabled = await Biometric.isBiometricUseCapableAndEnabled();

    if (isBiometricsEnabled) {
      if (!(await Biometric.unlockWithBiometrics())) {
        return;
      }
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
          ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
          return alert('Invoice expired');
        }

        const currentUserInvoices = fromWallet.user_invoices_raw; // not fetching invoices, as we assume they were loaded previously
        if (currentUserInvoices.some(invoice => invoice.payment_hash === decoded.payment_hash)) {
          this.setState({ isLoading: false });
          ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
          return alert(loc.lnd.sameWalletAsInvoiceError);
        }

        try {
          await fromWallet.payInvoice(this.state.invoice, this.state.decoded.num_satoshis);
        } catch (Err) {
          console.log(Err.message);
          this.setState({ isLoading: false });
          ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
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
    text = text.toLowerCase()

    if (text.startsWith('lnb') || text.startsWith('lightning:lnb')) {
      this.processInvoice(text);
    } else if (text.startsWith('lnurl1') || text.match('lightning=lnurl1')) {
      this.processLnurlPay(text);
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
      <View style={{ marginBottom: 16, alignItems: 'center', justifyContent: 'center' }}>
        {!this.state.isLoading && (
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center' }}
            onPress={() =>
              this.props.navigation.navigate('SelectWallet', { onWalletSelect: this.onWalletSelect, chainType: Chain.OFFCHAIN })
            }
          >
            <Text style={{ color: '#9aa0aa', fontSize: 14, marginRight: 8 }}>{loc.wallets.select_wallet.toLowerCase()}</Text>
            <Icon name="angle-right" size={18} type="font-awesome" color="#9aa0aa" />
          </TouchableOpacity>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 4 }}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center' }}
            onPress={() =>
              this.props.navigation.navigate('SelectWallet', { onWalletSelect: this.onWalletSelect, chainType: Chain.OFFCHAIN })
            }
          >
            <Text style={{ color: '#0c2550', fontSize: 14 }}>{this.state.fromWallet.getLabel()}</Text>
            <Text style={{ color: '#0c2550', fontSize: 14, fontWeight: '600', marginLeft: 8, marginRight: 4 }}>
              {loc.formatBalanceWithoutSuffix(this.state.fromWallet.getBalance(), BitcoinUnit.SATS, false)}
            </Text>
            <Text style={{ color: '#0c2550', fontSize: 11, fontWeight: '600', textAlignVertical: 'bottom', marginTop: 2 }}>
              {BitcoinUnit.SATS}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  onWalletSelect = wallet => {
    this.setState({ fromSecret: wallet.getSecret(), fromWallet: wallet }, () => {
      this.props.navigation.pop();
    });
  };

  renderLnurlPayPrompt = () => {
    let {fixed, min, max, domain, description, image, amount} = this.state.lnurlParams

    const imageSize = (height < width ? height : width) / 4
    console.log('RENDERING', height, width, imageSize, amount)

    const constrainAmount = debounce(() => {
      console.log('CONSTRAINING', this.state.lnurlParams.amount, min, max)
      var amount = this.state.lnurlParams.amount
      if (this.state.lnurlParams.amount < min) {
        amount = min
      } else if (this.state.lnurlParams.amount > max) {
        amount = max
      }
      this.setState({ lnurlParams: {...this.state.lnurlParams, amount} })
    }, 2000)

    return (
      <KeyboardAvoidingView enabled behavior={Platform.OS === 'ios' ? 'position' : null} keyboardVerticalOffset={20}>
        <View style={{ marginTop: 5, marginBottom: 0, marginHorizontal: 20 }}>
          {!fixed && <BlueText style={{textAlign: 'center'}}>
            Choose an amount ({min} - {max}):
          </BlueText>}
          <BlueBitcoinAmount
            isLoading={this.state.isLoading}
            pointerEvents={fixed ? 'none' : 'auto'}
            disabled={fixed}
            amount={amount.toString() || ''}
            onChangeText={text => {
              this.setState(
                { lnurlParams: {...this.state.lnurlParams, amount: parseInt(text || 0)} },
                constrainAmount
              );
            }}
            unit={BitcoinUnit.SATS}
            inputAccessoryViewID={BlueDismissKeyboardInputAccessory.InputAccessoryViewID}
          />
        </View>

        <View style={{marginHorizontal: 20, marginTop: 5, marginBottom: 0}}>
          <BlueText style={{fontWeight: 'bold', textAlign: 'center'}}>{domain}</BlueText>

          <ScrollView
            contentContainerStyle={{
              flexDirection: 'row',
              marginHorizontal: 10,
              alignItems: 'center',
              marginVertical: 10,
              borderRadius: 4,
              height: Math.min(height / 5, imageSize * 2)
            }}
          >
            {image && (
              <Image
                style={{width: imageSize, height: imageSize, marginRight: 5}}
                source={{uri: image}}
              />
            )}
            <Text numberOfLines={0} style={{ color: '#81868e', fontWeight: '500', fontSize: 14 }}>
              {description}
            </Text>
          </ScrollView>
        </View>

        <BlueCard>
          {this.state.isLoading ? (
            <View>
              <ActivityIndicator />
            </View>
          ) : (
            <BlueButton
              title={'Pay'}
              onPress={() => {
                this.payLnurl();
              }}
            />
          )}
        </BlueCard>

      </KeyboardAvoidingView>
    );
  };

  renderInvoicePayPrompt = () => {
    return (
      <KeyboardAvoidingView enabled behavior={Platform.OS === 'ios' ? 'position' : null} keyboardVerticalOffset={20}>
        <View style={{ marginTop: 60 }}>
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
        </View>

        <BlueCard>
          <BlueAddressInput
            onChangeText={text => {
              this.setState({ destination: text });
              this.processTextForInvoice(text);
            }}
            onBarScanned={this.processTextForInvoice}
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
              marginVertical: 0,
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

          <BlueCard>
            {this.state.isLoading ? (
              <View>
                <ActivityIndicator />
              </View>
            ) : (
              <BlueButton
                title={'Pay'}
                onPress={() => {
                  this.pay();
                }}
                disabled={this.shouldDisablePayButton()}
              />
            )}
          </BlueCard>
        </BlueCard>
      </KeyboardAvoidingView>
    );
  }

  render() {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <SafeBlueArea forceInset={{ horizontal: 'always' }} style={{ flex: 1 }}>
          <View style={{ flex: 1, justifyContent: 'space-between' }}>
            {this.state.lnurlParams
              ? this.renderLnurlPayPrompt()
              : this.renderInvoicePayPrompt()}

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
