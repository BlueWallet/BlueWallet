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
} from 'react-native';
import PropTypes from 'prop-types';
import {
  BlueButton,
  SafeBlueArea,
  BlueCard,
  BlueDismissKeyboardInputAccessory,
  BlueNavigationStyle,
  BlueAddressInput,
  BlueBitcoinAmount,
  BlueLoading,
} from '../../BlueComponents';
import { LightningCustodianWallet } from '../../class/wallets/lightning-custodian-wallet';
import Lnurl from '../../class/lnurl';
import { BitcoinUnit, Chain } from '../../models/bitcoinUnits';
import { Icon } from 'react-native-elements';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Biometric from '../../class/biometrics';
import loc, { formatBalanceWithoutSuffix } from '../../loc';
import { BlueCurrentTheme } from '../../components/themes';
import { BlueStorageContext } from '../../blue_modules/storage-context';
const currency = require('../../blue_modules/currency');

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
    color: BlueCurrentTheme.colors.buttonAlternativeTextColor,
    fontSize: 14,
  },
  walletWrapBalance: {
    color: BlueCurrentTheme.colors.buttonAlternativeTextColor,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
    marginRight: 4,
  },
  walletWrapSats: {
    color: BlueCurrentTheme.colors.buttonAlternativeTextColor,
    fontSize: 11,
    fontWeight: '600',
    textAlignVertical: 'bottom',
    marginTop: 2,
  },
  root: {
    flex: 1,
    backgroundColor: BlueCurrentTheme.colors.elevated,
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
  static contextType = BlueStorageContext;
  state = {
    isLoading: false,
    isAmountInitiallyEmpty: false,
    renderWalletSelectionButtonHidden: false,
  };

  constructor(props, context) {
    super(props);
    this.keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', this._keyboardDidShow);
    this.keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', this._keyboardDidHide);
    if (!context.wallets.some(item => item.type === LightningCustodianWallet.type)) {
      ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
      alert('Before paying a Lightning invoice, you must first add a Lightning wallet.');
      props.navigation.dangerouslyGetParent().pop();
    } else {
      let fromSecret;
      if (props.route.params.fromSecret) fromSecret = props.route.params.fromSecret;
      let fromWallet = {};

      if (!fromSecret) {
        const lightningWallets = context.wallets.filter(item => item.type === LightningCustodianWallet.type);
        if (lightningWallets.length > 0) {
          fromSecret = lightningWallets[0].getSecret();
          console.warn('warning: using ln wallet index 0');
        }
      }

      for (const w of context.wallets) {
        if (w.getSecret() === fromSecret) {
          fromWallet = w;
          break;
        }
      }

      this.state = {
        fromWallet,
        fromSecret,
        unit: BitcoinUnit.SATS,
        destination: '',
      };
    }
  }

  static getDerivedStateFromProps(props, state) {
    if (props.route.params.uri) {
      let data = props.route.params.uri;
      // handling BIP21 w/BOLT11 support
      const ind = data.indexOf('lightning=');
      if (ind !== -1) {
        data = data.substring(ind + 10).split('&')[0];
      }

      data = data.replace('LIGHTNING:', '').replace('lightning:', '');
      console.log(data);

      /**
       * @type {LightningCustodianWallet}
       */
      const w = state.fromWallet;
      let decoded;
      try {
        decoded = w.decodeInvoice(data);

        let expiresIn = (decoded.timestamp * 1 + decoded.expiry * 1) * 1000; // ms
        if (+new Date() > expiresIn) {
          expiresIn = loc.lnd.expiredLow;
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
        ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
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
    if (Lnurl.isLnurl(data)) return this.processLnurlPay(data);
    this.props.navigation.setParams({ uri: data });
  };

  processLnurlPay = data => {
    this.props.navigation.navigate('ScanLndInvoiceRoot', {
      screen: 'LnurlPay',
      params: {
        lnurl: data,
        fromWalletID: this.state.fromWallet.getID(),
      },
    });
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
          ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
          return alert(loc.lnd.errorInvoiceExpired);
        }

        const currentUserInvoices = fromWallet.user_invoices_raw; // not fetching invoices, as we assume they were loaded previously
        if (currentUserInvoices.some(invoice => invoice.payment_hash === decoded.payment_hash)) {
          this.setState({ isLoading: false });
          ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
          return alert(loc.lnd.sameWalletAsInvoiceError);
        }

        try {
          await fromWallet.payInvoice(this.state.invoice, amountSats);
        } catch (Err) {
          console.log(Err.message);
          this.setState({ isLoading: false });
          ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
          return alert(Err.message);
        }

        this.props.navigation.navigate('Success', {
          amount: amountSats,
          amountUnit: BitcoinUnit.SATS,
          invoiceDescription: this.state.decoded.description,
        });
        this.context.fetchAndSaveWalletTransactions(fromWallet.getID());
      },
    );
  }

  processTextForInvoice = text => {
    if (text.toLowerCase().startsWith('lnb') || text.toLowerCase().startsWith('lightning:lnb') || Lnurl.isLnurl(text)) {
      this.processInvoice(text);
    } else {
      this.setState({ decoded: undefined, expiresIn: undefined, destination: text });
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
              this.props.navigation.navigate('SelectWallet', { onWalletSelect: this.onWalletSelect, chainType: Chain.OFFCHAIN })
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
              this.props.navigation.navigate('SelectWallet', { onWalletSelect: this.onWalletSelect, chainType: Chain.OFFCHAIN })
            }
          >
            <Text style={styles.walletWrapLabel}>{this.state.fromWallet.getLabel()}</Text>
            <Text style={styles.walletWrapBalance}>
              {formatBalanceWithoutSuffix(this.state.fromWallet.getBalance(), BitcoinUnit.SATS, false)}
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
    this.setState({ fromSecret: wallet.getSecret(), fromWallet: wallet }, () => {
      this.props.navigation.pop();
    });
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
            <KeyboardAvoidingView enabled behavior="position" keyboardVerticalOffset={20}>
              <View style={styles.scrollMargin}>
                <BlueBitcoinAmount
                  pointerEvents={this.state.isAmountInitiallyEmpty ? 'auto' : 'none'}
                  isLoading={this.state.isLoading}
                  amount={this.state.amount}
                  onAmountUnitChange={unit => this.setState({ unit })}
                  onChangeText={text => {
                    this.setState({ amount: text });

                    /* if (typeof this.state.decoded === 'object') {
                      text = parseInt(text || 0);
                      const decoded = this.state.decoded;
                      decoded.num_satoshis = text;
                      this.setState({ decoded: decoded });
                    } */
                  }}
                  disabled={
                    typeof this.state.decoded !== 'object' ||
                    this.state.isLoading ||
                    (this.state.decoded && this.state.decoded.num_satoshis > 0)
                  }
                  unit={BitcoinUnit.SATS}
                  inputAccessoryViewID={BlueDismissKeyboardInputAccessory.InputAccessoryViewID}
                />
              </View>

              <BlueCard>
                <BlueAddressInput
                  onChangeText={text => {
                    text = text.trim();
                    this.processTextForInvoice(text);
                  }}
                  onBarScanned={this.processInvoice}
                  address={this.state.destination}
                  isLoading={this.state.isLoading}
                  placeholder={loc.lnd.placeholder}
                  inputAccessoryViewID={BlueDismissKeyboardInputAccessory.InputAccessoryViewID}
                  launchedBy={this.props.route.name}
                />
                <View style={styles.description}>
                  <Text numberOfLines={0} style={styles.descriptionText}>
                    {'decoded' in this.state && this.state.decoded !== undefined ? this.state.decoded.description : ''}
                  </Text>
                </View>
                {this.state.expiresIn !== undefined && (
                  <View>
                    <Text style={styles.expiresIn}>{loc.formatString(loc.lnd.expiresIn, { time: this.state.expiresIn })}</Text>
                    {this.state.decoded && this.state.decoded.num_satoshis > 0 && (
                      <Text style={styles.expiresIn}>{loc.formatString(loc.lnd.potentialFee, { fee: this.getFees() })}</Text>
                    )}
                  </View>
                )}
                <BlueCard>
                  {this.state.isLoading ? (
                    <View>
                      <ActivityIndicator />
                    </View>
                  ) : (
                    <View>
                      <BlueButton title={loc.lnd.payButton} onPress={() => this.pay()} disabled={this.shouldDisablePayButton()} />
                    </View>
                  )}
                </BlueCard>
              </BlueCard>
            </KeyboardAvoidingView>
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
      fromSecret: PropTypes.string,
    }),
  }),
};

ScanLndInvoice.navigationOptions = ({ navigation }) => ({
  ...BlueNavigationStyle(navigation, true),
  title: loc.send.header,
  headerLeft: null,
});
