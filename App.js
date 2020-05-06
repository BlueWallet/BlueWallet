import * as Sentry from '@sentry/react-native';
import React from 'react';
import { Linking, DeviceEventEmitter, AppState, Clipboard, View } from 'react-native';
import QuickActions from 'react-native-quick-actions';
import { createAppContainer, NavigationActions } from 'react-navigation';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import url from 'url';

import { RootNavigator } from 'app/navigators';
import { NavigationService } from 'app/services';
import { persistor, store } from 'app/state/store';

import OnAppLaunch from './class/onAppLaunch';
import { Chain } from './models/bitcoinUnits';

if (process.env.NODE_ENV !== 'development') {
  Sentry.init({
    dsn: 'https://23377936131848ca8003448a893cb622@sentry.io/1295736',
  });
}

const bitcoin = require('bitcoinjs-lib');

const bitcoinModalString = 'Bitcoin address';
const BlueApp = require('./BlueApp');

const AppContainer = createAppContainer(RootNavigator);

export default class App extends React.Component {
  navigator = null;

  state = {
    appState: AppState.currentState,
    isClipboardContentModalVisible: false,
    clipboardContentModalAddressType: bitcoinModalString,
    clipboardContent: '',
  };

  async componentDidMount() {
    Linking.addEventListener('url', this.handleOpenURL);
    AppState.addEventListener('change', this._handleAppStateChange);
    QuickActions.popInitialAction().then(this.popInitialAction);
    DeviceEventEmitter.addListener('quickActionShortcut', this.walletQuickActions);
  }

  popInitialAction = async data => {
    if (data) {
      // eslint-disable-next-line no-unused-expressions
      this.navigator.dismiss;
      const wallet = BlueApp.getWallets().find(wallet => wallet.getID() === data.userInfo.url.split('wallet/')[1]);
      this.navigator.dispatch(
        NavigationActions.navigate({
          key: `WalletTransactions-${wallet.getID()}`,
          routeName: 'WalletTransactions',
          params: {
            wallet,
          },
        }),
      );
    } else {
      const url = await Linking.getInitialURL();
      if (url) {
        if (this.hasSchema(url)) {
          this.handleOpenURL({ url });
        }
      } else {
        const isViewAllWalletsEnabled = await OnAppLaunch.isViewAllWalletsEnabled();
        if (!isViewAllWalletsEnabled) {
          // eslint-disable-next-line no-unused-expressions
          this.navigator.dismiss;
          const selectedDefaultWallet = await OnAppLaunch.getSelectedDefaultWallet();
          const wallet = BlueApp.getWallets().find(wallet => wallet.getID() === selectedDefaultWallet.getID());
          if (wallet) {
            this.navigator.dispatch(
              NavigationActions.navigate({
                routeName: 'WalletTransactions',
                key: `WalletTransactions-${wallet.getID()}`,
                params: {
                  wallet,
                },
              }),
            );
          }
        }
      }
    }
  };

  walletQuickActions = data => {
    const wallet = BlueApp.getWallets().find(wallet => wallet.getID() === data.userInfo.url.split('wallet/')[1]);
    // eslint-disable-next-line no-unused-expressions
    this.navigator.dismiss;
    this.navigator.dispatch(
      NavigationActions.navigate({
        routeName: 'WalletTransactions',
        key: `WalletTransactions-${wallet.getID()}`,
        params: {
          wallet,
        },
      }),
    );
  };

  componentWillUnmount() {
    Linking.removeEventListener('url', this.handleOpenURL);
    AppState.removeEventListener('change', this._handleAppStateChange);
  }

  _handleAppStateChange = async nextAppState => {
    if (BlueApp.getWallets().length > 0) {
      if (this.state.appState.match(/inactive|background/) && nextAppState === 'active') {
        const clipboard = await Clipboard.getString();
        const isAddressFromStoredWallet = BlueApp.getWallets().some(wallet =>
          wallet.chain === Chain.ONCHAIN
            ? wallet.weOwnAddress(clipboard)
            : wallet.isInvoiceGeneratedByWallet(clipboard),
        );
        if (
          !isAddressFromStoredWallet &&
          this.state.clipboardContent !== clipboard &&
          this.isBitcoinAddress(clipboard)
        ) {
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
    return (
      lowercaseString.startsWith('bitcoin:') ||
      lowercaseString.startsWith('blue:') ||
      lowercaseString.startsWith('bluewallet:') ||
      lowercaseString.startsWith('lapp:')
    );
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
    }
  };

  render() {
    return (
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <View style={{ flex: 1 }}>
            <AppContainer
              ref={nav => {
                this.navigator = nav;
                NavigationService.setTopLevelNavigator(nav);
              }}
            />
          </View>
        </PersistGate>
      </Provider>
    );
  }
}
