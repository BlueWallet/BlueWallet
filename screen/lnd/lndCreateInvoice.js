/* global alert */
import React, { Component } from 'react';
import {
  ActivityIndicator,
  View,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  StatusBar,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Text,
  StyleSheet,
  Image,
} from 'react-native';
import {
  BlueNavigationStyle,
  BlueButton,
  BlueBitcoinAmount,
  BlueDismissKeyboardInputAccessory,
  BlueAlertWalletExportReminder,
} from '../../BlueComponents';
import { LightningCustodianWallet } from '../../class/wallets/lightning-custodian-wallet';
import PropTypes from 'prop-types';
import bech32 from 'bech32';
import { BitcoinUnit, Chain } from '../../models/bitcoinUnits';
import * as NavigationService from '../../NavigationService';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { Icon } from 'react-native-elements';
import loc, { formatBalanceWithoutSuffix, formatBalancePlain } from '../../loc';
import { BlueCurrentTheme } from '../../components/themes';
import Lnurl from '../../class/lnurl';
const currency = require('../../blue_modules/currency');
const BlueApp = require('../../BlueApp');
const EV = require('../../blue_modules/events');
const notifications = require('../../blue_modules/notifications');

const styles = StyleSheet.create({
  createButton: {
    marginHorizontal: 56,
    marginVertical: 16,
    minHeight: 45,
    alignContent: 'center',
  },
  scanRoot: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BlueCurrentTheme.colors.scanLabel,
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginHorizontal: 4,
  },
  scanClick: {
    marginLeft: 4,
    color: BlueCurrentTheme.colors.inverseForegroundColor,
  },
  walletRoot: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletChooseWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletChooseText: {
    color: '#9aa0aa',
    fontSize: 14,
    marginRight: 8,
  },
  walletNameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  walletNameTouch: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletNameText: {
    color: BlueCurrentTheme.colors.buttonAlternativeTextColor,
    fontSize: 14,
  },
  walletNameBalance: {
    color: BlueCurrentTheme.colors.buttonAlternativeTextColor,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    marginRight: 4,
  },
  walletNameSats: {
    color: BlueCurrentTheme.colors.buttonAlternativeTextColor,
    fontSize: 11,
    fontWeight: '600',
    textAlignVertical: 'bottom',
    marginTop: 2,
  },
  error: {
    flex: 1,
    paddingTop: 20,
  },
  root: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: BlueCurrentTheme.colors.elevated,
  },
  amount: {
    flex: 1,
    backgroundColor: BlueCurrentTheme.colors.elevated,
  },
  fiat: {
    flexDirection: 'row',
    borderColor: BlueCurrentTheme.colors.formBorder,
    borderBottomColor: BlueCurrentTheme.colors.formBorder,
    borderWidth: 1.0,
    borderBottomWidth: 0.5,
    backgroundColor: BlueCurrentTheme.colors.inputBackgroundColor,
    minHeight: 44,
    height: 44,
    marginHorizontal: 20,
    alignItems: 'center',
    marginVertical: 8,
    borderRadius: 4,
  },
  fiat2: {
    flex: 1,
    marginHorizontal: 8,
    minHeight: 33,
    color: '#81868e',
  },
});

export default class LNDCreateInvoice extends Component {
  constructor(props) {
    super(props);
    this.keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', this._keyboardDidShow);
    this.keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', this._keyboardDidHide);
    /** @type LightningCustodianWallet */
    let fromWallet;
    if (props.route.params.fromWallet) fromWallet = props.route.params.fromWallet;

    // fallback to first wallet if it exists
    if (!fromWallet) {
      const lightningWallets = BlueApp.getWallets().filter(item => item.type === LightningCustodianWallet.type);
      if (lightningWallets.length > 0) {
        fromWallet = lightningWallets[0];
        console.warn('warning: using ln wallet index 0');
      }
    }

    this.state = {
      fromWallet,
      amount: '',
      unit: fromWallet.preferredBalanceUnit,
      description: '',
      lnurl: '',
      lnurlParams: null,
      isLoading: true,
      renderWalletSelectionButtonHidden: false,
    };
  }

  renderReceiveDetails = async () => {
    this.state.fromWallet.setUserHasSavedExport(true);
    await BlueApp.saveToDisk();
    if (this.props.route.params.uri) {
      this.processLnurl(this.props.route.params.uri);
    }
    this.setState({ isLoading: false });
  };

  componentDidMount() {
    console.log('lnd/lndCreateInvoice mounted');
    if (this.state.fromWallet.getUserHasSavedExport()) {
      this.renderReceiveDetails();
    } else {
      BlueAlertWalletExportReminder({
        onSuccess: this.renderReceiveDetails,
        onFailure: () => {
          this.props.navigation.dangerouslyGetParent().pop();
          this.props.navigation.navigate('WalletExport', {
            wallet: this.state.fromWallet,
          });
        },
      });
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

  async createInvoice() {
    this.setState({ isLoading: true }, async () => {
      try {
        this.setState({ isLoading: false });
        let amount = this.state.amount;
        switch (this.state.unit) {
          case BitcoinUnit.SATS:
            amount = parseInt(amount); // basically nop
            break;
          case BitcoinUnit.BTC:
            amount = currency.btcToSatoshi(amount);
            break;
          case BitcoinUnit.LOCAL_CURRENCY:
            // trying to fetch cached sat equivalent for this fiat amount
            amount = BlueBitcoinAmount.getCachedSatoshis(amount) || currency.btcToSatoshi(currency.fiatToBTC(amount));
            break;
        }

        const invoiceRequest = await this.state.fromWallet.addInvoice(amount, this.state.description);
        EV(EV.enum.TRANSACTIONS_COUNT_CHANGED);
        ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });

        // lets decode payreq and subscribe groundcontrol so we can receive push notification when our invoice is paid
        /** @type LightningCustodianWallet */
        const fromWallet = this.state.fromWallet;
        const decoded = await fromWallet.decodeInvoice(invoiceRequest);
        await notifications.tryToObtainPermissions();
        notifications.majorTomToGroundControl([], [decoded.payment_hash], []);

        // send to lnurl-withdraw callback url if that exists
        if (this.state.lnurlParams) {
          const { callback, k1 } = this.state.lnurlParams;
          const callbackUrl = callback + (callback.indexOf('?') !== -1 ? '&' : '?') + 'k1=' + k1 + '&pr=' + invoiceRequest;
          const resp = await fetch(callbackUrl, { method: 'GET' });
          if (resp.status >= 300) {
            const text = await resp.text();
            throw new Error(text);
          }
          const reply = await resp.json();
          if (reply.status === 'ERROR') {
            throw new Error('Reply from server: ' + reply.reason);
          }
        }

        setTimeout(async () => {
          // wallet object doesnt have this fresh invoice in its internals, so we refetch it and only then save
          await fromWallet.fetchUserInvoices(1);
          await BlueApp.saveToDisk();
        }, 1000);

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
      const ind = data.indexOf('lightning=');
      if (ind !== -1) {
        data = data.substring(ind + 10).split('&')[0];
      }

      data = data.replace('LIGHTNING:', '').replace('lightning:', '');
      console.log(data);

      // decoding the lnurl
      const decoded = bech32.decode(data, 1500);
      const url = Buffer.from(bech32.fromWords(decoded.words)).toString();

      // calling the url
      try {
        const resp = await fetch(url, { method: 'GET' });
        if (resp.status >= 300) {
          throw new Error('Bad response from server');
        }
        const reply = await resp.json();
        if (reply.status === 'ERROR') {
          throw new Error('Reply from server: ' + reply.reason);
        }

        if (reply.tag === Lnurl.TAG_PAY_REQUEST) {
          // we are here by mistake. user wants to SEND to lnurl-pay, but he is on a screen that creates
          // invoices (including through lnurl-withdraw)
          this.props.navigation.navigate('ScanLndInvoiceRoot', {
            screen: 'LnurlPay',
            params: {
              lnurl: data,
              fromWalletID: this.state.fromWallet.getID(),
            },
          });
          return;
        }

        if (reply.tag !== Lnurl.TAG_WITHDRAW_REQUEST) {
          throw new Error('Unsupported lnurl');
        }

        // amount that comes from lnurl is always in sats
        let amount = (reply.maxWithdrawable / 1000).toString();
        const sats = amount;
        switch (this.state.unit) {
          case BitcoinUnit.SATS:
            // nop
            break;
          case BitcoinUnit.BTC:
            amount = currency.satoshiToBTC(amount);
            break;
          case BitcoinUnit.LOCAL_CURRENCY:
            amount = formatBalancePlain(amount, BitcoinUnit.LOCAL_CURRENCY);
            BlueBitcoinAmount.setCachedSatoshis(amount, sats);
            break;
        }

        // setting the invoice creating screen with the parameters
        this.setState({
          isLoading: false,
          lnurlParams: {
            k1: reply.k1,
            callback: reply.callback,
            fixed: reply.minWithdrawable === reply.maxWithdrawable,
            min: (reply.minWithdrawable || 0) / 1000,
            max: reply.maxWithdrawable / 1000,
          },
          amount,
          description: reply.defaultDescription,
        });
      } catch (Err) {
        Keyboard.dismiss();
        this.setState({ isLoading: false });
        ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
        alert(Err.message);
      }
    });
  };

  renderCreateButton = () => {
    return (
      <View style={styles.createButton}>
        {this.state.isLoading ? (
          <ActivityIndicator />
        ) : (
          <BlueButton disabled={!(this.state.amount > 0)} onPress={() => this.createInvoice()} title={loc.send.details_create} />
        )}
      </View>
    );
  };

  renderScanClickable = () => {
    return (
      <TouchableOpacity
        disabled={this.state.isLoading}
        onPress={() => {
          NavigationService.navigate('ScanQRCodeRoot', {
            screen: 'ScanQRCode',
            params: {
              onBarScanned: this.processLnurl,
              launchedBy: this.props.route.name,
            },
          });
          Keyboard.dismiss();
        }}
        style={styles.scanRoot}
      >
        <Image style={{}} source={require('../../img/scan-white.png')} />
        <Text style={styles.scanClick}>{loc.send.details_scan}</Text>
      </TouchableOpacity>
    );
  };

  renderWalletSelectionButton = () => {
    if (this.state.renderWalletSelectionButtonHidden) return;
    return (
      <View style={styles.walletRoot}>
        {!this.state.isLoading && (
          <TouchableOpacity
            style={styles.walletChooseWrap}
            onPress={() =>
              this.props.navigation.navigate('SelectWallet', { onWalletSelect: this.onWalletSelect, chainType: Chain.OFFCHAIN })
            }
          >
            <Text style={styles.walletChooseText}>{loc.wallets.select_wallet.toLowerCase()}</Text>
            <Icon name="angle-right" size={18} type="font-awesome" color="#9aa0aa" />
          </TouchableOpacity>
        )}
        <View style={styles.walletNameWrap}>
          <TouchableOpacity
            style={styles.walletNameTouch}
            onPress={() =>
              this.props.navigation.navigate('SelectWallet', { onWalletSelect: this.onWalletSelect, chainType: Chain.OFFCHAIN })
            }
          >
            <Text style={styles.walletNameText}>{this.state.fromWallet.getLabel()}</Text>
            <Text style={styles.walletNameBalance}>
              {formatBalanceWithoutSuffix(this.state.fromWallet.getBalance(), BitcoinUnit.SATS, false)}
            </Text>
            <Text style={styles.walletNameSats}>{BitcoinUnit.SATS}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  onWalletSelect = wallet => {
    this.setState({ fromWallet: wallet }, () => this.props.navigation.pop());
  };

  render() {
    if (!this.state.fromWallet) {
      return (
        <View style={styles.error}>
          <Text>System error: Source wallet not found (this should never happen)</Text>
        </View>
      );
    }

    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.root}>
          <StatusBar barStyle="light-content" />
          <View style={styles.amount}>
            <KeyboardAvoidingView behavior="position">
              <BlueBitcoinAmount
                isLoading={this.state.isLoading}
                amount={this.state.amount}
                onAmountUnitChange={unit => {
                  this.setState({ unit });
                }}
                onChangeText={text => {
                  if (this.state.lnurlParams) {
                    // in this case we prevent the user from changing the amount to < min or > max
                    const { min, max } = this.state.lnurlParams;
                    const nextAmount = parseInt(text);
                    if (nextAmount < min) {
                      text = min.toString();
                    } else if (nextAmount > max) {
                      text = max.toString();
                    }
                  }

                  this.setState({ amount: text });
                }}
                disabled={this.state.isLoading || (this.state.lnurlParams && this.state.lnurlParams.fixed)}
                unit={this.state.unit}
                inputAccessoryViewID={BlueDismissKeyboardInputAccessory.InputAccessoryViewID}
              />
              <View style={styles.fiat}>
                <TextInput
                  onChangeText={text => this.setState({ description: text })}
                  placeholder={loc.receive.details_label}
                  value={this.state.description}
                  numberOfLines={1}
                  placeholderTextColor="#81868e"
                  style={styles.fiat2}
                  editable={!this.state.isLoading}
                  onSubmitEditing={Keyboard.dismiss}
                  inputAccessoryViewID={BlueDismissKeyboardInputAccessory.InputAccessoryViewID}
                />
                {this.state.lnurlParams ? null : this.renderScanClickable()}
              </View>
              <BlueDismissKeyboardInputAccessory />
              {this.renderCreateButton()}
            </KeyboardAvoidingView>
          </View>
          {this.renderWalletSelectionButton()}
        </View>
      </TouchableWithoutFeedback>
    );
  }
}

LNDCreateInvoice.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func,
    dangerouslyGetParent: PropTypes.func,
    navigate: PropTypes.func,
    pop: PropTypes.func,
  }),
  route: PropTypes.shape({
    name: PropTypes.string,
    params: PropTypes.shape({
      uri: PropTypes.string,
      fromWallet: PropTypes.shape({}),
    }),
  }),
};
LNDCreateInvoice.navigationOptions = ({ navigation }) => ({
  ...BlueNavigationStyle(navigation, true),
  headerTitle: loc.receive.header,
  headerLeft: null,
});
