/* global alert */
import React from 'react';
import { Text, ActivityIndicator, KeyboardAvoidingView, View, TouchableOpacity, Keyboard, ScrollView, StyleSheet } from 'react-native';
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
import { BitcoinUnit, Chain } from '../../models/bitcoinUnits';
import { Icon } from 'react-native-elements';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Biometric from '../../class/biometrics';
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let EV = require('../../events');
const loc = require('../../loc');

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
      ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
      alert('Before paying a Lightning invoice, you must first add a Lightning wallet.');
      props.navigation.dangerouslyGetParent().pop();
    } else {
      let fromSecret;
      if (props.route.params.fromSecret) fromSecret = props.route.params.fromSecret;
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

  static getDerivedStateFromProps(props, state) {
    if (props.route.params.uri) {
      let data = props.route.params.uri;
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
      let w = state.fromWallet;
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
    this.props.navigation.setParams({ uri: data });
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
      if (!this.state.decoded.num_satoshis) {
        return true;
      }
    }
    return this.state.decoded.num_satoshis <= 0 || this.state.isLoading || isNaN(this.state.decoded.num_satoshis);
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
              {loc.formatBalanceWithoutSuffix(this.state.fromWallet.getBalance(), BitcoinUnit.SATS, false)}
            </Text>
            <Text style={styles.walletWrapSats}>{BitcoinUnit.SATS}</Text>
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

  render() {
    if (!this.state.fromWallet) {
      return <BlueLoading />;
    }
    return (
      <SafeBlueArea forceInset={{ horizontal: 'always' }} style={styles.root}>
        <View style={styles.root}>
          <ScrollView contentContainerStyle={styles.scroll}>
            <KeyboardAvoidingView enabled behavior="position" keyboardVerticalOffset={20}>
              <View style={styles.scrollMargin}>
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
                    {this.state.hasOwnProperty('decoded') && this.state.decoded !== undefined ? this.state.decoded.description : ''}
                  </Text>
                </View>
                {this.state.expiresIn !== undefined && <Text style={styles.expiresIn}>Expires in: {this.state.expiresIn}</Text>}

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
