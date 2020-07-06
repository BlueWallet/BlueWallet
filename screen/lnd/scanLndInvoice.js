/* global alert */
import React from 'react';
import {
  Text,
  ActivityIndicator,
  KeyboardAvoidingView,
  View,
  TouchableOpacity,
  StatusBar,
  Keyboard,
  ScrollView,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import PropTypes from 'prop-types';
import {
  BlueButton,
  SafeBlueArea,
  BlueCard,
  BlueText,
  BlueDismissKeyboardInputAccessory,
  BlueNavigationStyle,
  BlueAddressInput,
  BlueBitcoinAmount,
  BlueLoading,
} from '../../BlueComponents';
import { LightningCustodianWallet } from '../../class/wallets/lightning-custodian-wallet';
import { BitcoinUnit, Chain } from '../../models/bitcoinUnits';
import { Icon } from 'react-native-elements';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Biometric from '../../class/biometrics';
import AsyncStorage from '@react-native-community/async-storage';
import createHash from 'create-hash';
import bech32 from 'bech32';
import { findlnurl } from 'js-lnurl';
import debounce from 'debounce';
/** @type {AppStorage} */
const BlueApp = require('../../BlueApp');
const EV = require('../../blue_modules/events');
const loc = require('../../loc');
const currency = require('../../blue_modules/currency');
const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  walletSelectRoot: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  walletSelectTouch: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletSelectText: {
    color: '#9aa0aa',
    fontSize: 14,
    marginRight: 8,
  },
  walletWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  walletWrapTouch: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletWrapLabel: {
    color: '#0c2550',
    fontSize: 14,
  },
  walletWrapBalance: {
    color: '#0c2550',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
    marginRight: 4,
  },
  walletWrapSats: {
    color: '#0c2550',
    fontSize: 11,
    fontWeight: '600',
    textAlignVertical: 'bottom',
    marginTop: 2,
  },
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    justifyContent: 'space-between',
  },
  scrollMargin: {
    marginTop: 60,
  },
  description: {
    flexDirection: 'row',
    marginHorizontal: 20,
    alignItems: 'center',
    marginVertical: 0,
    borderRadius: 4,
  },
  descriptionText: {
    color: '#81868e',
    fontWeight: '500',
    fontSize: 14,
  },
  expiresIn: {
    color: '#81868e',
    fontSize: 12,
    left: 20,
    top: 10,
  },
});

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
    this.keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', this._keyboardDidShow);
    this.keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', this._keyboardDidHide);
    if (!BlueApp.getWallets().some(item => item.type === LightningCustodianWallet.type)) {
      ReactNativeHapticFeedback.trigger('notificationError', {
        ignoreAndroidSystemSettings: false,
      });
      alert('Before paying a Lightning invoice, you must first add a Lightning wallet.');
      props.navigation.dangerouslyGetParent().pop();
    } else {
      let fromWallet = props.navigation.getParam('fromWallet');
      if (!fromWallet) {
        if (props.navigation.state.params.fromSecret) {
          const fromSecret = props.navigation.state.params.fromSecret;

          for (const w of BlueApp.getWallets()) {
            if (w.getSecret() === fromSecret) {
              fromWallet = w;
              break;
            }
          }
        } else {
          // fallback to first wallet if it exists
          const lightningWallets = BlueApp.getWallets().filter(item => item.type === LightningCustodianWallet.type);

          if (lightningWallets.length > 0) {
            fromWallet = lightningWallets[0];
            console.warn('warning: using ln wallet index 0');
          }
        }
      }

      this.state = {
        fromWallet,
        unit: BitcoinUnit.SATS,
        destination: '',
      };
    }
  }

  static getDerivedStateFromProps(props, state) {
    if (this.props.navigation.state.params.lnurlData) {
      this.processLnurlPay(this.props.navigation.getParam('uri'), this.props.navigation.getParam('lnurlData'));
    } else if (this.props.navigation.state.params.uri) {
      let data = props.route.params.uri;
      // handling BIP21 w/BOLT11 support
      const ind = data.indexOf('lightning=');
      if (ind !== -1) {
        data = data.substring(ind + 10).split('&')[0];
      }

      data = data.replace('LIGHTNING:', '').replace('lightning:', '');

      /**
       * @type {LightningCustodianWallet}
       */
      const w = state.fromWallet;
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
        props.navigation.setParams({ uri: undefined });
        return {
          invoice: data,
          decoded,
          unit: state.unit,
          amount: decoded.num_satoshis,
          expiresIn,
          destination: data,
          isAmountInitiallyEmpty: decoded.num_satoshis === '0',
          isLoading: false,
        };
      } catch (Err) {
        ReactNativeHapticFeedback.trigger('notificationError', {
          ignoreAndroidSystemSettings: false,
        });
        Keyboard.dismiss();
        props.navigation.setParams({ uri: undefined });
        setTimeout(() => alert(Err.message), 10);
        return { ...state, isLoading: false };
      }
    }
    return state;
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
    this.props.navigation.setParams({ uri: data });
  };

  processLnurlPay = async (uri, data) => {
    this.setState({ isLoading: true }, async () => {
      if (!this.state.fromWallet) {
        ReactNativeHapticFeedback.trigger('notificationError', {
          ignoreAndroidSystemSettings: false,
        });
        alert('Before sending payments you must add a Lightning wallet.');
        return this.props.navigation.goBack();
      }

      try {
        if (!data) {
          // extracting just the lnurl
          uri = findlnurl(uri);

          // decoding
          const decoded = bech32.decode(uri, 1500);
          const url = Buffer.from(bech32.fromWords(decoded.words)).toString();

          // calling the url
          const resp = await fetch(url, { method: 'GET' });
          if (resp.status >= 300) {
            throw new Error('Bad response from server');
          }
          const reply = await resp.json();
          if (reply.status === 'ERROR') {
            throw new Error('Reply from server: ' + reply.reason);
          }
          if (reply.tag !== 'payRequest') {
            throw new Error('lnurl-pay expected, found tag ' + reply.tag);
          }

          data = reply;
        }

        // parse metadata and extract things from it
        let image;
        let description;
        const kvs = JSON.parse(data.metadata);
        for (let i = 0; i < kvs.length; i++) {
          const [k, v] = kvs[i];
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
        const min = Math.ceil((data.minSendable || 0) / 1000);
        const max = Math.floor(data.maxSendable / 1000);

        this.setState({
          isLoading: false,
          lnurlParams: {
            callback: data.callback,
            fixed: min === max,
            min,
            max,
            domain: data.callback.match(new RegExp('https://([^/]+)/'))[1],
            metadata: data.metadata,
            description,
            image,
            amount: min,
            lnurl: uri,
          },
        });
      } catch (Err) {
        Keyboard.dismiss();
        this.setState({ isLoading: false, lnurlParams: null });
        ReactNativeHapticFeedback.trigger('notificationError', {
          ignoreAndroidSystemSettings: false,
        });
        alert(Err.message);
      }
    });
  };

  payLnurl = async () => {
    if (!this.state.hasOwnProperty('lnurlParams')) {
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
        const { amount, min, max, metadata, image, description, domain, callback, lnurl } = this.state.lnurlParams;

        try {
          if (amount < min || amount > max) {
            throw new Error(`Invalid amount specified, must be between ${min} and ${max}.`);
          }

          // append amount to callback
          const url = callback + (callback.indexOf('?') !== -1 ? '&' : '?' + 'amount=' + amount * 1000);

          // send amount and get invoice
          const resp = await fetch(url, { method: 'GET' });
          if (resp.status >= 300) {
            throw new Error('Bad response from server');
          }
          const reply = await resp.json();
          if (reply.status === 'ERROR') {
            throw new Error('Reply from server: ' + reply.reason);
          }

          const { pr, successAction } = reply;

          /**
           * @type {LightningCustodianWallet}
           */
          const w = this.state.fromWallet;

          // check pr description_hash
          const decoded = w.decodeInvoice(pr);

          const metadataHash = createHash('sha256').update(metadata).digest('hex');
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
              const key = keys[i];
              if (!key.startsWith('lp:')) continue;
              const val = await AsyncStorage.getItem(key);
              if (val && JSON.parse(val).time < Date.now() - 2592000000 /* 1 month */) {
                AsyncStorage.removeItem(key);
              }
            }
          });

          // store successAction for later
          await AsyncStorage.setItem(
            `lp:${decoded.payment_hash}`,
            JSON.stringify({
              successAction,
              description_hash: decoded.description_hash,
              domain,
              lnurl,
              time: Date.now(),
            }),
          );
          await AsyncStorage.setItem(
            `lp:${decoded.description_hash}`,
            JSON.stringify({
              metadata: { image, description },
              time: Date.now(),
            }),
          );

          // pay invoice
          await w.payInvoice(pr);

          let preimageString = w.last_paid_invoice_result.payment_preimage;
          if (typeof preimageString === 'object') {
            preimageString = Buffer.from(preimageString.data).toString('hex');
          }

          EV(EV.enum.REMOTE_TRANSACTIONS_COUNT_CHANGED); // someone should fetch txs
          this.props.navigation.navigate('LnurlPaySuccess', {
            domain,
            image,
            description,
            successAction,
            preimage: preimageString,
            justPaid: true,
          });
        } catch (Err) {
          Keyboard.dismiss();
          this.setState({ isLoading: false });
          ReactNativeHapticFeedback.trigger('notificationError', {
            ignoreAndroidSystemSettings: false,
          });
          alert(Err.message);
        }
      },
    );
  };

  async pay() {
    if (!('decoded' in this.state)) {
      return null;
    }

    const isBiometricsEnabled = await Biometric.isBiometricUseCapableAndEnabled();

    if (isBiometricsEnabled) {
      if (!(await Biometric.unlockWithBiometrics())) {
        return;
      }
    }

    let amountSats = this.state.amount;
    switch (this.state.unit) {
      case BitcoinUnit.SATS:
        amountSats = parseInt(amountSats); // nop
        break;
      case BitcoinUnit.BTC:
        amountSats = currency.btcToSatoshi(amountSats);
        break;
      case BitcoinUnit.LOCAL_CURRENCY:
        amountSats = currency.btcToSatoshi(currency.fiatToBTC(amountSats));
        break;
    }

    this.setState(
      {
        isLoading: true,
      },
      async () => {
        const decoded = this.state.decoded;

        /** @type {LightningCustodianWallet} */
        const fromWallet = this.state.fromWallet;

        const expiresIn = (decoded.timestamp * 1 + decoded.expiry * 1) * 1000; // ms
        if (+new Date() > expiresIn) {
          this.setState({ isLoading: false });
          ReactNativeHapticFeedback.trigger('notificationError', {
            ignoreAndroidSystemSettings: false,
          });
          return alert('Invoice expired');
        }

        const currentUserInvoices = fromWallet.user_invoices_raw; // not fetching invoices, as we assume they were loaded previously
        if (currentUserInvoices.some(invoice => invoice.payment_hash === decoded.payment_hash)) {
          this.setState({ isLoading: false });
          ReactNativeHapticFeedback.trigger('notificationError', {
            ignoreAndroidSystemSettings: false,
          });
          return alert(loc.lnd.sameWalletAsInvoiceError);
        }

        try {
          await fromWallet.payInvoice(this.state.invoice, amountSats);
        } catch (Err) {
          console.log(Err.message);
          this.setState({ isLoading: false });
          ReactNativeHapticFeedback.trigger('notificationError', {
            ignoreAndroidSystemSettings: false,
          });
          return alert(Err.message);
        }

        EV(EV.enum.REMOTE_TRANSACTIONS_COUNT_CHANGED); // someone should fetch txs
        this.props.navigation.navigate('Success', {
          amount: amountSats,
          amountUnit: BitcoinUnit.SATS,
          invoiceDescription: this.state.decoded.description,
        });
      },
    );
  }

  processTextForInvoice = text => {
    text = text.toLowerCase();
    if (text.startsWith('lnb') || text.startsWith('lightning:lnb')) {
      this.processInvoice(text);
    } else if (text.startsWith('lnurl1') || text.match('lightning=lnurl1')) {
      this.processLnurlPay(text);
    } else {
      this.setState({
        decoded: undefined,
        expiresIn: undefined,
        destination: text,
      });
    }
  };

  shouldDisablePayButton = () => {
    if (typeof this.state.decoded !== 'object') {
      return true;
    } else {
      if (!this.state.amount) {
        return true;
      }
    }
    return !(this.state.amount > 0);
    // return this.state.decoded.num_satoshis <= 0 || this.state.isLoading || isNaN(this.state.decoded.num_satoshis);
  };

  renderWalletSelectionButton = () => {
    if (this.state.renderWalletSelectionButtonHidden) return;
    return (
      <View style={styles.walletSelectRoot}>
        {!this.state.isLoading && (
          <TouchableOpacity
            style={styles.walletSelectTouch}
            onPress={() =>
              this.props.navigation.navigate('SelectWallet', {
                onWalletSelect: this.onWalletSelect,
                chainType: Chain.OFFCHAIN,
              })
            }
          >
            <Text style={styles.walletSelectText}>{loc.wallets.select_wallet.toLowerCase()}</Text>
            <Icon name="angle-right" size={18} type="font-awesome" color="#9aa0aa" />
          </TouchableOpacity>
        )}
        <View style={styles.walletWrap}>
          <TouchableOpacity
            style={styles.walletWrapTouch}
            onPress={() =>
              this.props.navigation.navigate('SelectWallet', {
                onWalletSelect: this.onWalletSelect,
                chainType: Chain.OFFCHAIN,
              })
            }
          >
            <Text style={styles.walletWrapLabel}>{this.state.fromWallet.getLabel()}</Text>
            <Text style={styles.walletWrapBalance}>
              {loc.formatBalanceWithoutSuffix(this.state.fromWallet.getBalance(), BitcoinUnit.SATS, false)}
            </Text>
            <Text style={styles.walletWrapSats}>{BitcoinUnit.SATS}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  getFees() {
    const min = Math.floor(this.state.decoded.num_satoshis * 0.003);
    const max = Math.floor(this.state.decoded.num_satoshis * 0.01) + 1;
    return `${min} sat - ${max} sat`;
  }

  onWalletSelect = wallet => {
    this.setState({ fromWallet: wallet }, () => {
      this.props.navigation.pop();
    });
  };

  renderLnurlPayPrompt = () => {
    const { fixed, min, max, domain, description, image, amount } = this.state.lnurlParams;

    const imageSize = (height < width ? height : width) / 4;

    const constrainAmount = debounce(() => {
      var amount = this.state.lnurlParams.amount;
      if (this.state.lnurlParams.amount < min) {
        amount = min;
      } else if (this.state.lnurlParams.amount > max) {
        amount = max;
      }
      this.setState({ lnurlParams: { ...this.state.lnurlParams, amount } });
    }, 2000);

    return (
      <KeyboardAvoidingView enabled behavior={Platform.OS === 'ios' ? 'position' : null} keyboardVerticalOffset={20}>
        <View style={{ marginTop: 5, marginBottom: 0, marginHorizontal: 20 }}>
          {!fixed && (
            <BlueText style={{ textAlign: 'center' }}>
              Choose an amount ({min} - {max}):
            </BlueText>
          )}
          <BlueBitcoinAmount
            isLoading={this.state.isLoading}
            pointerEvents={fixed ? 'none' : 'auto'}
            disabled={fixed}
            amount={amount.toString() || ''}
            onChangeText={text => {
              this.setState(
                {
                  lnurlParams: {
                    ...this.state.lnurlParams,
                    amount: parseInt(text || 0),
                  },
                },
                constrainAmount,
              );
            }}
            unit={BitcoinUnit.SATS}
            inputAccessoryViewID={BlueDismissKeyboardInputAccessory.InputAccessoryViewID}
          />
        </View>

        <View style={{ marginHorizontal: 20, marginTop: 5, marginBottom: 0 }}>
          <BlueText style={{ fontWeight: 'bold', textAlign: 'center' }}>{domain}</BlueText>

          <ScrollView
            contentContainerStyle={{
              flexDirection: 'row',
              marginHorizontal: 10,
              alignItems: 'center',
              marginVertical: 10,
              borderRadius: 4,
              height: Math.min(height / 5, imageSize * 2),
            }}
          >
            {image && <Image style={{ width: imageSize, height: imageSize, marginRight: 5 }} source={{ uri: image }} />}
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
                title="Pay"
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
            amount={typeof this.state.decoded === 'object' ? this.state.decoded.num_satoshis : '0'}
            onChangeText={text => {
              if (typeof this.state.decoded === 'object') {
                text = parseInt(text || 0);
                const decoded = this.state.decoded;
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
                  title="Pay"
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
  };

  async componentDidMount() {
    console.log('scanLndInvoice did mount');
  }

  render() {
    if (!this.state.fromWallet) {
      return <BlueLoading />;
    }
    return (
      <SafeBlueArea forceInset={{ horizontal: 'always' }} style={styles.root}>
        <StatusBar barStyle="light-content" />
        <View style={styles.root}>
          <ScrollView contentContainerStyle={styles.scroll}>
            {this.state.lnurlParams ? this.renderLnurlPayPrompt() : this.renderInvoicePayPrompt()}
            {this.renderWalletSelectionButton()}
          </ScrollView>
        </View>
        <BlueDismissKeyboardInputAccessory />
      </SafeBlueArea>
    );
  }
}

ScanLndInvoice.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func,
    navigate: PropTypes.func,
    pop: PropTypes.func,
    setParams: PropTypes.func,
    dangerouslyGetParent: PropTypes.func,
  }),
  route: PropTypes.shape({
    name: PropTypes.string,
    params: PropTypes.shape({
      uri: PropTypes.string,
      lnurlData: PropTypes.shape({}),
      fromSecret: PropTypes.string,
      fromWallet: PropTypes.shape({}),
    }),
  }),
};
