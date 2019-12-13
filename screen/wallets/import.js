/* global alert */
import {
  SegwitP2SHWallet,
  LegacyWallet,
  WatchOnlyWallet,
  HDLegacyBreadwalletWallet,
  HDSegwitP2SHWallet,
  HDLegacyP2PKHWallet,
  HDSegwitBech32Wallet,
} from '../../class';
import React, { Component } from 'react';
import { KeyboardAvoidingView, Platform, Dimensions, View, TouchableWithoutFeedback, Keyboard } from 'react-native';
import {
  BlueFormMultiInput,
  BlueButtonLink,
  BlueFormLabel,
  BlueLoading,
  BlueDoneAndDismissKeyboardInputAccessory,
  BlueButton,
  SafeBlueArea,
  BlueSpacing20,
  BlueNavigationStyle,
} from '../../BlueComponents';
import PropTypes from 'prop-types';
import { LightningCustodianWallet } from '../../class/lightning-custodian-wallet';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Privacy from '../../Privacy';
let EV = require('../../events');
let A = require('../../analytics');
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');
const { width } = Dimensions.get('window');

export default class WalletsImport extends Component {
  static navigationOptions = {
    ...BlueNavigationStyle(),
    title: loc.wallets.import.title,
  };

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      isToolbarVisibleForAndroid: false,
    };
  }

  componentDidMount() {
    this.setState({
      isLoading: false,
      label: '',
    });
    Privacy.enableBlur();
  }

  componentWillUnmount() {
    Privacy.disableBlur();
  }

  async _saveWallet(w) {
    if (BlueApp.getWallets().some(wallet => wallet.getSecret() === w.secret)) {
      alert('This wallet has been previously imported.');
    } else {
      alert(loc.wallets.import.success);
      ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });
      w.setLabel(loc.wallets.import.imported + ' ' + w.typeReadable);
      BlueApp.wallets.push(w);
      await BlueApp.saveToDisk();
      EV(EV.enum.WALLETS_COUNT_CHANGED);
      A(A.ENUM.CREATED_WALLET);
      this.props.navigation.dismiss();
    }
  }

  async importMnemonic(text) {
    try {
      // is it lightning custodian?
      if (text.indexOf('blitzhub://') !== -1 || text.indexOf('lndhub://') !== -1) {
        let lnd = new LightningCustodianWallet();
        if (text.includes('@')) {
          const split = text.split('@');
          lnd.setBaseURI(split[1]);
          lnd.setSecret(split[0]);
        } else {
          lnd.setBaseURI(LightningCustodianWallet.defaultBaseUri);
          lnd.setSecret(text);
        }
        lnd.init();
        await lnd.authorize();
        await lnd.fetchTransactions();
        await lnd.fetchUserInvoices();
        await lnd.fetchPendingTransactions();
        await lnd.fetchBalance();
        return this._saveWallet(lnd);
      }

      // trying other wallet types

      let hd4 = new HDSegwitBech32Wallet();
      hd4.setSecret(text);
      if (hd4.validateMnemonic()) {
        await hd4.fetchBalance();
        if (hd4.getBalance() > 0) {
          await hd4.fetchTransactions();
          return this._saveWallet(hd4);
        }
      }

      let segwitWallet = new SegwitP2SHWallet();
      segwitWallet.setSecret(text);
      if (segwitWallet.getAddress()) {
        // ok its a valid WIF

        let legacyWallet = new LegacyWallet();
        legacyWallet.setSecret(text);

        await legacyWallet.fetchBalance();
        if (legacyWallet.getBalance() > 0) {
          // yep, its legacy we're importing
          await legacyWallet.fetchTransactions();
          return this._saveWallet(legacyWallet);
        } else {
          // by default, we import wif as Segwit P2SH
          await segwitWallet.fetchBalance();
          await segwitWallet.fetchTransactions();
          return this._saveWallet(segwitWallet);
        }
      }

      // case - WIF is valid, just has uncompressed pubkey

      let legacyWallet = new LegacyWallet();
      legacyWallet.setSecret(text);
      if (legacyWallet.getAddress()) {
        await legacyWallet.fetchBalance();
        await legacyWallet.fetchTransactions();
        return this._saveWallet(legacyWallet);
      }

      // if we're here - nope, its not a valid WIF

      let hd1 = new HDLegacyBreadwalletWallet();
      hd1.setSecret(text);
      if (hd1.validateMnemonic()) {
        await hd1.fetchBalance();
        if (hd1.getBalance() > 0) {
          await hd1.fetchTransactions();
          return this._saveWallet(hd1);
        }
      }

      let hd2 = new HDSegwitP2SHWallet();
      hd2.setSecret(text);
      if (hd2.validateMnemonic()) {
        await hd2.fetchBalance();
        if (hd2.getBalance() > 0) {
          await hd2.fetchTransactions();
          return this._saveWallet(hd2);
        }
      }

      let hd3 = new HDLegacyP2PKHWallet();
      hd3.setSecret(text);
      if (hd3.validateMnemonic()) {
        await hd3.fetchBalance();
        if (hd3.getBalance() > 0) {
          await hd3.fetchTransactions();
          return this._saveWallet(hd3);
        }
      }

      // no balances? how about transactions count?

      if (hd1.validateMnemonic()) {
        await hd1.fetchTransactions();
        if (hd1.getTransactions().length !== 0) {
          return this._saveWallet(hd1);
        }
      }
      if (hd2.validateMnemonic()) {
        await hd2.fetchTransactions();
        if (hd2.getTransactions().length !== 0) {
          return this._saveWallet(hd2);
        }
      }
      if (hd3.validateMnemonic()) {
        await hd3.fetchTransactions();
        if (hd3.getTransactions().length !== 0) {
          return this._saveWallet(hd3);
        }
      }
      if (hd4.validateMnemonic()) {
        await hd4.fetchTransactions();
        if (hd4.getTransactions().length !== 0) {
          return this._saveWallet(hd4);
        }
      }

      // is it even valid? if yes we will import as:
      if (hd4.validateMnemonic()) {
        return this._saveWallet(hd4);
      }

      // not valid? maybe its a watch-only address?

      let watchOnly = new WatchOnlyWallet();
      watchOnly.setSecret(text);
      if (watchOnly.valid()) {
        await watchOnly.fetchTransactions();
        await watchOnly.fetchBalance();
        return this._saveWallet(watchOnly);
      }

      // nope?

      // TODO: try a raw private key
    } catch (Err) {
      console.warn(Err);
    }

    alert(loc.wallets.import.error);
    ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
    // Plan:
    // 0. check if its HDSegwitBech32Wallet (BIP84)
    // 1. check if its HDSegwitP2SHWallet (BIP49)
    // 2. check if its HDLegacyP2PKHWallet (BIP44)
    // 3. check if its HDLegacyBreadwalletWallet (no BIP, just "m/0")
    // 4. check if its Segwit WIF (P2SH)
    // 5. check if its Legacy WIF
    // 6. check if its address (watch-only wallet)
    // 7. check if its private key (segwit address P2SH) TODO
    // 7. check if its private key (legacy address) TODO
  }

  setLabel(text) {
    this.setState({
      label: text,
    }); /* also, a hack to make screen update new typed text */
  }

  render() {
    if (this.state.isLoading) {
      return (
        <View style={{ flex: 1, paddingTop: 20 }}>
          <BlueLoading />
        </View>
      );
    }

    return (
      <SafeBlueArea forceInset={{ horizontal: 'always' }} style={{ flex: 1, paddingTop: 40 }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <KeyboardAvoidingView behavior="position" enabled>
            <BlueFormLabel>{loc.wallets.import.explanation}</BlueFormLabel>
            <BlueSpacing20 />
            <BlueFormMultiInput
              value={this.state.label}
              placeholder=""
              contextMenuHidden
              onChangeText={text => {
                this.setLabel(text);
              }}
              inputAccessoryViewID={BlueDoneAndDismissKeyboardInputAccessory.InputAccessoryViewID}
              onFocus={() => this.setState({ isToolbarVisibleForAndroid: true })}
              onBlur={() => this.setState({ isToolbarVisibleForAndroid: false })}
            />
            {Platform.select({
              ios: (
                <BlueDoneAndDismissKeyboardInputAccessory
                  onClearTapped={() => this.setState({ label: '' }, () => Keyboard.dismiss())}
                  onPasteTapped={text => this.setState({ label: text }, () => Keyboard.dismiss())}
                />
              ),
              android: this.state.isToolbarVisibleForAndroid && (
                <BlueDoneAndDismissKeyboardInputAccessory
                  onClearTapped={() => this.setState({ label: '' }, () => Keyboard.dismiss())}
                  onPasteTapped={text => this.setState({ label: text }, () => Keyboard.dismiss())}
                />
              ),
            })}
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>

        <BlueSpacing20 />
        <View
          style={{
            alignItems: 'center',
          }}
        >
          <BlueButton
            disabled={!this.state.label}
            title={loc.wallets.import.do_import}
            buttonStyle={{
              width: width / 1.5,
            }}
            onPress={async () => {
              if (!this.state.label) {
                return;
              }
              this.setState({ isLoading: true }, async () => {
                await this.importMnemonic(this.state.label.trim());
                this.setState({ isLoading: false });
              });
            }}
          />
          <BlueButtonLink
            title={loc.wallets.import.scan_qr}
            onPress={() => {
              this.props.navigation.navigate('ScanQrWif');
            }}
          />
        </View>
      </SafeBlueArea>
    );
  }
}

WalletsImport.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    goBack: PropTypes.func,
    dismiss: PropTypes.func,
  }),
};
