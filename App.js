import React from 'react';
import { Linking, AppState, Clipboard, StyleSheet, KeyboardAvoidingView, Platform, View } from 'react-native';
import Modal from 'react-native-modal';
import { NavigationActions } from 'react-navigation';
import MainBottomTabs from './MainBottomTabs';
import NavigationService from './NavigationService';
import { BlueTextCentered, BlueButton } from './BlueComponents';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import * as watch from 'react-native-watch-connectivity';
const bitcoin = require('bitcoinjs-lib');
const bitcoinModalString = 'Bitcoin address';
const lightningModalString = 'Lightning Invoice';
const loc = require('./loc');
/** @type {AppStorage} */
const BlueApp = require('./BlueApp');

export default class App extends React.Component {
  navigator = null;

  state = {
    appState: AppState.currentState,
    isClipboardContentModalVisible: false,
    clipboardContentModalAddressType: bitcoinModalString,
    clipboardContent: '',
    isAppInstalled: false,
  };

  componentDidMount() {
    Linking.getInitialURL()
      .then(url => {
        if (this.hasSchema(url)) {
          this.handleOpenURL({ url });
        }
      })
      .catch(console.error);
    Linking.addEventListener('url', this.handleOpenURL);
    AppState.addEventListener('change', this._handleAppStateChange);
    watch.getIsWatchAppInstalled((err, isAppInstalled) => {
      if (!err) {
        this.setState({ isAppInstalled });
        this.sendWalletsToWatch();
      }
    });
  }

  async sendWalletsToWatch() {
    if (this.state.isAppInstalled) {
      const allWallets = BlueApp.getWallets();
      let wallets = [];
      for (const wallet of allWallets) {
        let receiveAddress = '';
        if (wallet.getAddressAsync) {
          receiveAddress = await wallet.getAddressAsync();
        } else {
          receiveAddress = wallet.getAddress();
        }

        wallets.push({
          label: wallet.getLabel(),
          balance: loc.formatBalance(wallet.balance, wallet.preferredBalanceUnit, true).toString(),
          type: wallet.type,
          preferredBalanceUnit: wallet.preferredBalanceUnit,
          receiveAddress: receiveAddress,
          transactions: wallet.getTransactions(15),
        });
      }

      watch.updateApplicationContext({ wallets });
      watch.sendUserInfo({ wallets });
      watch.subscribeToMessages((err, message, _reply) => {
        if (!err) {
          if (message.message === 'sendApplicationContext') {
            watch.sendUserInfo({ wallets });
          }
        }
      });
    }
  }

  componentWillUnmount() {
    Linking.removeEventListener('url', this.handleOpenURL);
    AppState.removeEventListener('change', this._handleAppStateChange);
  }

  _handleAppStateChange = async nextAppState => {
    if (BlueApp.getWallets().length > 0) {
      if (this.state.appState.match(/inactive|background/) && nextAppState === 'active') {
        const clipboard = await Clipboard.getString();
        if (this.state.clipboardContent !== clipboard && (this.isBitcoinAddress(clipboard) || this.isLightningInvoice(clipboard))) {
          this.setState({ isClipboardContentModalVisible: true });
        }
        this.setState({ clipboardContent: clipboard });
      }
      this.setState({ appState: nextAppState });
    }
  };

  hasSchema(schemaString) {
    if (typeof schemaString !== 'string' || schemaString.length <= 0) return false;
    const lowercaseString = schemaString.trim().toLowerCase();
    return lowercaseString.startsWith('bitcoin:') || lowercaseString.startsWith('lightning:');
  }

  isBitcoinAddress(address) {
    let isValidBitcoinAddress = false;
    try {
      bitcoin.address.toOutputScript(address);
      isValidBitcoinAddress = true;
      this.setState({ clipboardContentModalAddressType: bitcoinModalString });
    } catch (err) {
      isValidBitcoinAddress = false;
    }
    if (!isValidBitcoinAddress) {
      if (address.indexOf('bitcoin:') === 0 || address.indexOf('BITCOIN:') === 0) {
        isValidBitcoinAddress = true;
        this.setState({ clipboardContentModalAddressType: bitcoinModalString });
      }
    }
    return isValidBitcoinAddress;
  }

  isLightningInvoice(invoice) {
    let isValidLightningInvoice = false;
    if (invoice.indexOf('lightning:lnb') === 0 || invoice.indexOf('LIGHTNING:lnb') === 0 || invoice.toLowerCase().startsWith('lnb')) {
      this.setState({ clipboardContentModalAddressType: lightningModalString });
      isValidLightningInvoice = true;
    }
    return isValidLightningInvoice;
  }

  handleOpenURL = event => {
    if (event.url === null) {
      return;
    }
    if (typeof event.url !== 'string') {
      return;
    }
    if (this.isBitcoinAddress(event.url)) {
      this.navigator &&
        this.navigator.dispatch(
          NavigationActions.navigate({
            routeName: 'SendDetails',
            params: {
              uri: event.url,
            },
          }),
        );
    } else if (this.isLightningInvoice(event.url)) {
      this.navigator &&
        this.navigator.dispatch(
          NavigationActions.navigate({
            routeName: 'ScanLndInvoice',
            params: {
              uri: event.url,
            },
          }),
        );
    }
  };

  renderClipboardContentModal = () => {
    return (
      <Modal
        onModalShow={() => ReactNativeHapticFeedback.trigger('impactLight', false)}
        isVisible={this.state.isClipboardContentModalVisible}
        style={styles.bottomModal}
        onBackdropPress={() => {
          this.setState({ isClipboardContentModalVisible: false });
        }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'position' : null}>
          <View style={styles.modalContent}>
            <BlueTextCentered>
              You have a {this.state.clipboardContentModalAddressType} on your clipboard. Would you like to use it for a transaction?
            </BlueTextCentered>
            <View style={styles.modelContentButtonLayout}>
              <BlueButton
                noMinWidth
                title={loc.send.details.cancel}
                onPress={() => this.setState({ isClipboardContentModalVisible: false })}
              />
              <View style={{ marginHorizontal: 8 }} />
              <BlueButton
                noMinWidth
                title="OK"
                onPress={() => {
                  this.setState({ isClipboardContentModalVisible: false }, async () => {
                    const clipboard = await Clipboard.getString();
                    setTimeout(() => this.handleOpenURL({ url: clipboard }), 100);
                  });
                }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  render() {
    return (
      <View style={{ flex: 1 }}>
        <MainBottomTabs
          ref={nav => {
            this.navigator = nav;
            NavigationService.setTopLevelNavigator(nav);
          }}
        />
        {this.renderClipboardContentModal()}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  modalContent: {
    backgroundColor: '#FFFFFF',
    padding: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    minHeight: 200,
    height: 200,
  },
  bottomModal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  modelContentButtonLayout: {
    flexDirection: 'row',
    margin: 16,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
});
