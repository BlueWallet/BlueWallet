import 'react-native-gesture-handler'; // should be on top
import React, { useEffect, useRef, useState } from 'react';
import {
  Linking,
  DeviceEventEmitter,
  AppState,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  View,
  useColorScheme,
  useWindowDimensions,
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

const App = () => {
  const appState = useRef(AppState.currentState);
  const [isClipboardContentModalVisible, setIsClipboardContentModalVisible] = useState(false);
  const [clipboardContentModalAddressType, setClipboardContentModalAddressType] = useState(bitcoinModalString);
  const [clipboardContent, setClipboardContent] = useState('');
  const colorScheme = useColorScheme();
  const { height } = useWindowDimensions();
  const stylesHook = StyleSheet.create({
    modalContent: {
      backgroundColor: colorScheme === 'dark' ? BlueDarkTheme.colors.elevated : BlueDefaultTheme.colors.elevated,
    },
  });

  useEffect(() => {
    EV(EV.enum.WALLETS_INITIALIZED, addListeners);
    return () => {
      Linking.removeEventListener('url', handleOpenURL);
      AppState.removeEventListener('change', handleAppStateChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (colorScheme) {
      BlueCurrentTheme.updateColorScheme();
    }
  }, [colorScheme]);

  const addListeners = () => {
    Linking.addEventListener('url', handleOpenURL);
    AppState.addEventListener('change', handleAppStateChange);
    DeviceEventEmitter.addListener('quickActionShortcut', walletQuickActions);
    QuickActions.popInitialAction().then(popInitialAction);
    EV(EV.enum.PROCESS_PUSH_NOTIFICATIONS, processPushNotifications, true);
    handleAppStateChange(undefined);
  };

  const popInitialAction = async data => {
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
          handleOpenURL({ url });
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

  const walletQuickActions = data => {
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

  /**
   * Processes push notifications stored in AsyncStorage. Might navigate to some screen.
   *
   * @returns {Promise<boolean>} returns TRUE if notification was processed _and acted_ upon, i.e. navigation happened
   * @private
   */
  const processPushNotifications = async () => {
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
  };

  const handleAppStateChange = async nextAppState => {
    if (BlueApp.getWallets().length > 0) {
      if ((appState.current.match(/background/) && nextAppState) === 'active' || nextAppState === undefined) {
        setTimeout(() => A(A.ENUM.APP_UNSUSPENDED), 2000);
        const processed = await processPushNotifications();
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
          clipboardContent !== clipboard &&
          (isBitcoinAddress || isLightningInvoice || isLNURL || isBothBitcoinAndLightning)
        ) {
          if (isBitcoinAddress) {
            setClipboardContentModalAddressType(bitcoinModalString);
          } else if (isLightningInvoice || isLNURL) {
            setClipboardContentModalAddressType(lightningModalString);
          } else if (isBothBitcoinAndLightning) {
            setClipboardContentModalAddressType(bitcoinModalString);
          }
          setIsClipboardContentModalVisible(true);
        }
        setClipboardContent(clipboard);
      }
      if (nextAppState) {
        appState.current = nextAppState;
      }
    }
  };

  const handleOpenURL = event => {
    DeeplinkSchemaMatch.navigationRouteFor(event, value => NavigationService.navigate(...value));
  };

  const hideClipboardContentModal = () => {
    setIsClipboardContentModalVisible(false);
  };

  const renderClipboardContentModal = () => {
    return (
      <Modal
        onModalShow={() => ReactNativeHapticFeedback.trigger('impactLight', { ignoreAndroidSystemSettings: false })}
        isVisible={isClipboardContentModalVisible}
        style={styles.bottomModal}
        deviceHeight={height}
        onBackdropPress={hideClipboardContentModal}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'position' : null}>
          <View style={[styles.modalContent, stylesHook.modalContent]}>
            <BlueTextCentered>
              You have a {clipboardContentModalAddressType} on your clipboard. Would you like to use it for a transaction?
            </BlueTextCentered>
            <View style={styles.modelContentButtonLayout}>
              <SecondButton noMinWidth title={loc._.cancel} onPress={hideClipboardContentModal} />
              <View style={styles.space} />
              <BlueButton
                noMinWidth
                title={loc._.ok}
                onPress={async () => {
                  setIsClipboardContentModalVisible(false);
                  const clipboard = await BlueClipboard.getClipboardContent();
                  setTimeout(() => handleOpenURL({ url: clipboard }), 100);
                }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };
  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <NavigationContainer ref={navigationRef} theme={colorScheme === 'dark' ? BlueDarkTheme : BlueDefaultTheme}>
          <InitRoot />
        </NavigationContainer>
        {renderClipboardContentModal()}
      </View>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  space: {
    marginHorizontal: 8,
  },
  modalContent: {
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

export default App;
