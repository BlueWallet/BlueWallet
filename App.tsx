import * as Sentry from '@sentry/react-native';
import React from 'react';
import { Linking, DeviceEventEmitter, Clipboard, View, StyleSheet } from 'react-native';
import QuickActions from 'react-native-quick-actions';
import { createAppContainer, NavigationActions } from 'react-navigation';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import { Wallet } from 'app/consts';
import { RootNavigator } from 'app/navigators';
import { UnlockScreen } from 'app/screens';
import { NavigationService, SecureStorageService, AppStateManager } from 'app/services';
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

interface State {
  isClipboardContentModalVisible: boolean;
  clipboardContentModalAddressType: string;
  clipboardContent: string;
  isPinSet: boolean;
  successfullyAuthenticated: boolean;
}

export default class App extends React.PureComponent<State> {
  navigator: any = null;

  state = {
    isClipboardContentModalVisible: false,
    clipboardContentModalAddressType: bitcoinModalString,
    clipboardContent: '',
    isPinSet: false,
    successfullyAuthenticated: false,
  };

  async componentDidMount() {
    const isPinSet = await SecureStorageService.getSecuredValue('pin');
    if (isPinSet) {
      this.setState({ isPinSet });
    }

    Linking.addEventListener('url', this.handleOpenURL);
    QuickActions.popInitialAction().then(this.popInitialAction);
    DeviceEventEmitter.addListener('quickActionShortcut', this.walletQuickActions);
  }

  popInitialAction = async (data: any) => {
    if (data) {
      // eslint-disable-next-line no-unused-expressions
      this.navigator.dismiss;
      const wallet = BlueApp.getWallets().find(
        (wallet: Wallet) => wallet.getID() === data.userInfo.url.split('wallet/')[1],
      );
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
          const selectedDefaultWallet = (await OnAppLaunch.getSelectedDefaultWallet()) as any;
          const wallet = BlueApp.getWallets().find(
            (wallet: Wallet) => wallet.getID() === selectedDefaultWallet.getID(),
          );
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

  walletQuickActions = (data: any) => {
    const wallet = BlueApp.getWallets().find(
      (wallet: Wallet) => wallet.getID() === data.userInfo.url.split('wallet/')[1],
    );
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
  }

  handleAppComesToForeground = async () => {
    this.setState({
      successfullyAuthenticated: false,
    });
    const clipboard = await Clipboard.getString();
    const isAddressFromStoredWallet = BlueApp.getWallets().some((wallet: Wallet) =>
      wallet.chain === Chain.ONCHAIN ? wallet.weOwnAddress(clipboard) : wallet.isInvoiceGeneratedByWallet(clipboard),
    );
    if (!isAddressFromStoredWallet && this.state.clipboardContent !== clipboard && this.isBitcoinAddress(clipboard)) {
      this.setState({ isClipboardContentModalVisible: true });
    }
    this.setState({ clipboardContent: clipboard });
  };

  hasSchema(schemaString: string) {
    if (typeof schemaString !== 'string' || schemaString.length <= 0) return false;
    const lowercaseString = schemaString.trim().toLowerCase();
    return (
      lowercaseString.startsWith('bitcoin:') ||
      lowercaseString.startsWith('blue:') ||
      lowercaseString.startsWith('bluewallet:') ||
      lowercaseString.startsWith('lapp:')
    );
  }

  isBitcoinAddress(address: any) {
    let isValidBitcoinAddress: boolean;
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

  handleOpenURL = (event: any) => {
    if (event.url === null) {
      return;
    }
    if (typeof event.url !== 'string') {
      return;
    }
    if (this.isBitcoinAddress(event.url)) {
      this.navigator &&
        this.navigator!.dispatch(
          NavigationActions.navigate({
            routeName: 'SendDetails',
            params: {
              uri: event.url,
            },
          }),
        );
    }
  };

  onSuccessfullyAuthenticated = () => {
    this.setState({
      successfullyAuthenticated: true,
    });
  };

  render() {
    const { successfullyAuthenticated, isPinSet } = this.state;
    const isBiometricEnabledByUser = store.getState().appSettings.isBiometricsEnabled;
    return (
      <Provider store={store}>
        <AppStateManager handleAppComesToForeground={this.handleAppComesToForeground} />
        <PersistGate loading={null} persistor={persistor}>
          <View style={styles.wrapper}>
            <AppContainer
              ref={nav => {
                this.navigator = nav as any;
                NavigationService.setTopLevelNavigator(nav!);
              }}
            />
            {isPinSet && !successfullyAuthenticated && (
              <UnlockScreen
                onSuccessfullyAuthenticated={this.onSuccessfullyAuthenticated}
                isBiometricEnabledByUser={isBiometricEnabledByUser}
              />
            )}
          </View>
        </PersistGate>
      </Provider>
    );
  }
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
});
