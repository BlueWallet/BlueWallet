import 'react-native-gesture-handler'; // should be on top
import React from 'react';
import {
  Linking,
  Dimensions,
  Appearance,
  DeviceEventEmitter,
  AppState,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  View,
} from 'react-native';
import Modal from 'react-native-modal';
import { NavigationContainer, CommonActions } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { navigationRef } from './NavigationService';
import * as NavigationService from './NavigationService';
import { BlueTextCentered, BlueButton, SecondButton } from './BlueComponents';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { Chain } from './models/bitcoinUnits';
import QuickActions from 'react-native-quick-actions';
import * as Sentry from '@sentry/react-native';
import OnAppLaunch from './class/on-app-launch';
import DeeplinkSchemaMatch from './class/deeplink-schema-match';
import loc from './loc';
import { BlueDefaultTheme, BlueDarkTheme, BlueCurrentTheme } from './components/themes';
import InitRoot from './Navigation';
import BlueClipboard from './blue_modules/clipboard';
const A = require('./blue_modules/analytics');
if (process.env.NODE_ENV !== 'development') {
  Sentry.init({
    dsn: 'https://23377936131848ca8003448a893cb622@sentry.io/1295736',
  });
}

const bitcoinModalString = 'Bitcoin address';
const lightningModalString = 'Lightning Invoice';
const BlueApp = require('./BlueApp');
const EV = require('./blue_modules/events');
const notifications = require('./blue_modules/notifications'); // eslint-disable-line no-unused-vars

export default class App extends React.Component {
  state = {
    appState: AppState.currentState,
    isClipboardContentModalVisible: false,
    clipboardContentModalAddressType: bitcoinModalString,
    clipboardContent: '',
    theme: Appearance.getColorScheme(),
  };

  componentDidMount() {
    EV(EV.enum.WALLETS_INITIALIZED, this.addListeners);
    Appearance.addChangeListener(this.appearanceChanged);
  }

  appearanceChanged = () => {
    const appearance = Appearance.getColorScheme();
    if (appearance) {
      BlueCurrentTheme.updateColorScheme();
      this.setState({ theme: appearance });
    }
  };

  addListeners = () => {
    Linking.addEventListener('url', this.handleOpenURL);
    AppState.addEventListener('change', this._handleAppStateChange);
    DeviceEventEmitter.addListener('quickActionShortcut', this.walletQuickActions);
    QuickActions.popInitialAction().then(this.popInitialAction);
    EV(EV.enum.PROCESS_PUSH_NOTIFICATIONS, this._processPushNotifications.bind(this), true);
    this._handleAppStateChange(undefined);
  };

  popInitialAction = async data => {
    if (data) {
      const wallet = BlueApp.getWallets().find(wallet => wallet.getID() === data.userInfo.url.split('wallet/')[1]);
      NavigationService.dispatch(
        CommonActions.navigate({
          name: 'WalletTransactions',
          key: `WalletTransactions-${wallet.getID()}`,
          params: {
            wallet,
          },
        }),
      );
    } else {
      const url = await Linking.getInitialURL();
      if (url) {
        if (DeeplinkSchemaMatch.hasSchema(url)) {
          this.handleOpenURL({ url });
        }
      } else {
        const isViewAllWalletsEnabled = await OnAppLaunch.isViewAllWalletsEnabled();
        if (!isViewAllWalletsEnabled) {
          const selectedDefaultWallet = await OnAppLaunch.getSelectedDefaultWallet();
          const wallet = BlueApp.getWallets().find(wallet => wallet.getID() === selectedDefaultWallet.getID());
          if (wallet) {
            NavigationService.dispatch(
              CommonActions.navigate({
                name: 'WalletTransactions',
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
    NavigationService.dispatch(
      CommonActions.navigate({
        name: 'WalletTransactions',
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
    Appearance.removeChangeListener(this.appearanceChanged);
  }

  /**
   * Processes push notifications stored in AsyncStorage. Might navigate to some screen.
   *
   * @returns {Promise<boolean>} returns TRUE if notification was processed _and acted_ upon, i.e. navigation happened
   * @private
   */
  async _processPushNotifications() {
    notifications.setApplicationIconBadgeNumber(0);
    await new Promise(resolve => setTimeout(resolve, 200));
    // sleep needed as sometimes unsuspend is faster than notification module actually saves notifications to async storage
    const notifications2process = await notifications.getStoredNotifications();
    for (const payload of notifications2process) {
      const wasTapped = payload.foreground === false || (payload.foreground === true && payload.userInteraction === true);
      if (!wasTapped) continue;

      console.log('processing push notification:', payload);
      let wallet;
      switch (+payload.type) {
        case 2:
        case 3:
          wallet = BlueApp.getWallets().find(w => w.weOwnAddress(payload.address));
          break;
        case 1:
        case 4:
          wallet = BlueApp.getWallets().find(w => w.weOwnTransaction(payload.txid || payload.hash));
          break;
      }

      if (wallet) {
        NavigationService.dispatch(
          CommonActions.navigate({
            name: 'WalletTransactions',
            key: `WalletTransactions-${wallet.getID()}`,
            params: {
              wallet,
            },
          }),
        );
        setTimeout(() => EV(EV.enum.REMOTE_TRANSACTIONS_COUNT_CHANGED, 1 /* ms */), 500);
        // no delay (1ms) as we dont need to wait for transaction propagation. 500ms is a delay to wait for the navigation
        await notifications.clearStoredNotifications();
        return true;
      } else {
        console.log('could not find wallet while processing push notification tap, NOP');
      }
    }

    // TODO: if we are here - we did not act upon any push, so we need to iterate over _not tapped_ pushes
    // and refetch appropriate wallet and redraw screen

    await notifications.clearStoredNotifications();
    return false;
  }

  _handleAppStateChange = async nextAppState => {
    if (BlueApp.getWallets().length > 0) {
      if ((this.state.appState.match(/background/) && nextAppState) === 'active' || nextAppState === undefined) {
        setTimeout(() => A(A.ENUM.APP_UNSUSPENDED), 2000);
        const processed = await this._processPushNotifications();
        if (processed) return;
        const clipboard = await BlueClipboard.getClipboardContent();
        const isAddressFromStoredWallet = BlueApp.getWallets().some(wallet => {
          if (wallet.chain === Chain.ONCHAIN) {
            // checking address validity is faster than unwrapping hierarchy only to compare it to garbage
            return wallet.isAddressValid && wallet.isAddressValid(clipboard) && wallet.weOwnAddress(clipboard);
          } else {
            return wallet.isInvoiceGeneratedByWallet(clipboard) || wallet.weOwnAddress(clipboard);
          }
        });
        const isBitcoinAddress = DeeplinkSchemaMatch.isBitcoinAddress(clipboard);
        const isLightningInvoice = DeeplinkSchemaMatch.isLightningInvoice(clipboard);
        const isLNURL = DeeplinkSchemaMatch.isLnUrl(clipboard);
        const isBothBitcoinAndLightning = DeeplinkSchemaMatch.isBothBitcoinAndLightning(clipboard);
        if (
          !isAddressFromStoredWallet &&
          this.state.clipboardContent !== clipboard &&
          (isBitcoinAddress || isLightningInvoice || isLNURL || isBothBitcoinAndLightning)
        ) {
          if (isBitcoinAddress) {
            this.setState({ clipboardContentModalAddressType: bitcoinModalString });
          } else if (isLightningInvoice || isLNURL) {
            this.setState({ clipboardContentModalAddressType: lightningModalString });
          } else if (isBothBitcoinAndLightning) {
            this.setState({ clipboardContentModalAddressType: bitcoinModalString });
          }
          this.setState({ isClipboardContentModalVisible: true });
        }
        this.setState({ clipboardContent: clipboard });
      }
      if (nextAppState) {
        this.setState({ appState: nextAppState });
      }
    }
  };

  isBothBitcoinAndLightningWalletSelect = wallet => {
    const clipboardContent = this.state.clipboardContent;
    if (wallet.chain === Chain.ONCHAIN) {
      this.navigation &&
        NavigationService.dispatch(
          CommonActions.navigate({
            name: 'SendDetails',
            params: {
              uri: clipboardContent.bitcoin,
              fromWallet: wallet,
            },
          }),
        );
    } else if (wallet.chain === Chain.OFFCHAIN) {
      this.navigation &&
        NavigationService.dispatch(
          CommonActions.navigate({
            name: 'ScanLndInvoice',
            params: {
              uri: clipboardContent.lndInvoice,
              fromSecret: wallet.getSecret(),
            },
          }),
        );
    }
  };

  handleOpenURL = event => {
    DeeplinkSchemaMatch.navigationRouteFor(event, value => NavigationService.navigate(...value));
  };

  renderClipboardContentModal = () => {
    return (
      <Modal
        onModalShow={() => ReactNativeHapticFeedback.trigger('impactLight', { ignoreAndroidSystemSettings: false })}
        isVisible={this.state.isClipboardContentModalVisible}
        style={styles.bottomModal}
        deviceHeight={Dimensions.get('window').height}
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
              <SecondButton noMinWidth title={loc._.cancel} onPress={() => this.setState({ isClipboardContentModalVisible: false })} />
              <View style={styles.space} />
              <BlueButton
                noMinWidth
                title={loc._.ok}
                onPress={() => {
                  this.setState({ isClipboardContentModalVisible: false }, async () => {
                    const clipboard = await BlueClipboard.getClipboardContent();
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
      <SafeAreaProvider>
        <View style={styles.root}>
          <NavigationContainer ref={navigationRef} theme={this.state.theme === 'dark' ? BlueDarkTheme : BlueDefaultTheme}>
            <InitRoot />
          </NavigationContainer>
          {this.renderClipboardContentModal()}
        </View>
      </SafeAreaProvider>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  space: {
    marginHorizontal: 8,
  },
  modalContent: {
    backgroundColor: BlueCurrentTheme.colors.elevated,
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
