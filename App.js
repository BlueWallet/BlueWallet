import 'react-native-gesture-handler'; // should be on top
import React, { useContext, useEffect, useRef } from 'react';
import {
  AppState,
  NativeModules,
  NativeEventEmitter,
  Linking,
  Platform,
  StyleSheet,
  UIManager,
  useColorScheme,
  View,
  LogBox,
} from 'react-native';
import { NavigationContainer, CommonActions } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { navigationRef } from './NavigationService';
import * as NavigationService from './NavigationService';
import { Chain } from './models/bitcoinUnits';
import DeeplinkSchemaMatch from './class/deeplink-schema-match';
import loc from './loc';
import { BlueDefaultTheme, BlueDarkTheme } from './components/themes';
import InitRoot from './Navigation';
import BlueClipboard from './blue_modules/clipboard';
import { BlueStorageContext } from './blue_modules/storage-context';
import WatchConnectivity from './WatchConnectivity';
import DeviceQuickActions from './class/quick-actions';
import Notifications from './blue_modules/notifications';
import Biometric from './class/biometrics';
import WidgetCommunication from './blue_modules/WidgetCommunication';
import ActionSheet from './screen/ActionSheet';
import HandoffComponent from './components/handoff';
import Privacy from './blue_modules/Privacy';
const A = require('./blue_modules/analytics');
const currency = require('./blue_modules/currency');

const eventEmitter = Platform.OS === 'ios' ? new NativeEventEmitter(NativeModules.EventEmitter) : undefined;
const { EventEmitter } = NativeModules;

LogBox.ignoreLogs(['Require cycle:']);

const ClipboardContentType = Object.freeze({
  BITCOIN: 'BITCOIN',
  LIGHTNING: 'LIGHTNING',
});

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const App = () => {
  const {
    walletsInitialized,
    wallets,
    addWallet,
    saveToDisk,
    fetchAndSaveWalletTransactions,
    refreshAllWalletTransactions,
    setSharedCosigner,
  } = useContext(BlueStorageContext);
  const appState = useRef(AppState.currentState);
  const clipboardContent = useRef();
  const colorScheme = useColorScheme();

  const onNotificationReceived = async notification => {
    const payload = Object.assign({}, notification, notification.data);
    if (notification.data && notification.data.data) Object.assign(payload, notification.data.data);
    payload.foreground = true;

    await Notifications.addNotification(payload);
    // if user is staring at the app when he receives the notification we process it instantly
    // so app refetches related wallet
    if (payload.foreground) await processPushNotifications();
  };

  const openSettings = () => {
    NavigationService.dispatch(
      CommonActions.navigate({
        name: 'Settings',
      }),
    );
  };

  const onUserActivityOpen = data => {
    switch (data.activityType) {
      case HandoffComponent.activityTypes.ReceiveOnchain:
        NavigationService.navigate('ReceiveDetailsRoot', {
          screen: 'ReceiveDetails',
          params: {
            address: data.userInfo.address,
          },
        });
        break;
      case HandoffComponent.activityTypes.Xpub:
        NavigationService.navigate('WalletXpubRoot', {
          screen: 'WalletXpub',
          params: {
            xpub: data.userInfo.xpub,
          },
        });
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    if (walletsInitialized) {
      addListeners();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletsInitialized]);

  const addListeners = () => {
    Linking.addEventListener('url', handleOpenURL);
    AppState.addEventListener('change', handleAppStateChange);
    EventEmitter?.getMostRecentUserActivity()
      .then(onUserActivityOpen)
      .catch(() => console.log('No userActivity object sent'));
    handleAppStateChange(undefined);
    /*
      When a notification on iOS is shown while the app is on foreground;
      On willPresent on AppDelegate.m
     */
    eventEmitter?.addListener('onNotificationReceived', onNotificationReceived);
    eventEmitter?.addListener('openSettings', openSettings);
    eventEmitter?.addListener('onUserActivityOpen', onUserActivityOpen);
  };

  /**
   * Processes push notifications stored in AsyncStorage. Might navigate to some screen.
   *
   * @returns {Promise<boolean>} returns TRUE if notification was processed _and acted_ upon, i.e. navigation happened
   * @private
   */
  const processPushNotifications = async () => {
    if (!walletsInitialized) {
      console.log('not processing push notifications because wallets are not initialized');
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 200));
    // sleep needed as sometimes unsuspend is faster than notification module actually saves notifications to async storage
    const notifications2process = await Notifications.getStoredNotifications();

    await Notifications.clearStoredNotifications();
    Notifications.setApplicationIconBadgeNumber(0);
    const deliveredNotifications = await Notifications.getDeliveredNotifications();
    setTimeout(() => Notifications.removeAllDeliveredNotifications(), 5000); // so notification bubble wont disappear too fast

    for (const payload of notifications2process) {
      const wasTapped = payload.foreground === false || (payload.foreground === true && payload.userInteraction);

      console.log('processing push notification:', payload);
      let wallet;
      switch (+payload.type) {
        case 2:
        case 3:
          wallet = wallets.find(w => w.weOwnAddress(payload.address));
          break;
        case 1:
        case 4:
          wallet = wallets.find(w => w.weOwnTransaction(payload.txid || payload.hash));
          break;
      }

      if (wallet) {
        const walletID = wallet.getID();
        fetchAndSaveWalletTransactions(walletID);
        if (wasTapped) {
          if (payload.type !== 3 || wallet.chain === Chain.OFFCHAIN) {
            NavigationService.dispatch(
              CommonActions.navigate({
                name: 'WalletTransactions',
                key: `WalletTransactions-${wallet.getID()}`,
                params: {
                  walletID,
                  walletType: wallet.type,
                },
              }),
            );
          } else {
            NavigationService.navigate('ReceiveDetailsRoot', {
              screen: 'ReceiveDetails',
              params: {
                walletID,
                address: payload.address,
              },
            });
          }

          return true;
        }
      } else {
        console.log('could not find wallet while processing push notification, NOP');
      }
    } // end foreach notifications loop

    if (deliveredNotifications.length > 0) {
      // notification object is missing userInfo. We know we received a notification but don't have sufficient
      // data to refresh 1 wallet. let's refresh all.
      refreshAllWalletTransactions();
    }

    // if we are here - we did not act upon any push
    return false;
  };

  const handleAppStateChange = async nextAppState => {
    if (wallets.length === 0) return;
    if ((appState.current.match(/background/) && nextAppState === 'active') || nextAppState === undefined) {
      setTimeout(() => A(A.ENUM.APP_UNSUSPENDED), 2000);
      currency.updateExchangeRate();
      const processed = await processPushNotifications();
      if (processed) return;
      const clipboard = await BlueClipboard().getClipboardContent();
      const isAddressFromStoredWallet = wallets.some(wallet => {
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
        clipboardContent.current !== clipboard &&
        (isBitcoinAddress || isLightningInvoice || isLNURL || isBothBitcoinAndLightning)
      ) {
        let contentType;
        if (isBitcoinAddress) {
          contentType = ClipboardContentType.BITCOIN;
        } else if (isLightningInvoice || isLNURL) {
          contentType = ClipboardContentType.LIGHTNING;
        } else if (isBothBitcoinAndLightning) {
          contentType = ClipboardContentType.BITCOIN;
        }
        showClipboardAlert({ contentType });
      }
      clipboardContent.current = clipboard;
    }
    if (nextAppState) {
      appState.current = nextAppState;
    }
  };

  const handleOpenURL = event => {
    DeeplinkSchemaMatch.navigationRouteFor(event, value => NavigationService.navigate(...value), {
      wallets,
      addWallet,
      saveToDisk,
      setSharedCosigner,
    });
  };

  const showClipboardAlert = ({ contentType }) => {
    ReactNativeHapticFeedback.trigger('impactLight', { ignoreAndroidSystemSettings: false });
    BlueClipboard()
      .getClipboardContent()
      .then(clipboard => {
        if (Platform.OS === 'ios' || Platform.OS === 'macos') {
          ActionSheet.showActionSheetWithOptions(
            {
              options: [loc._.cancel, loc._.continue],
              title: loc._.clipboard,
              message: contentType === ClipboardContentType.BITCOIN ? loc.wallets.clipboard_bitcoin : loc.wallets.clipboard_lightning,
              cancelButtonIndex: 0,
            },
            buttonIndex => {
              if (buttonIndex === 1) {
                handleOpenURL({ url: clipboard });
              }
            },
          );
        } else {
          ActionSheet.showActionSheetWithOptions({
            buttons: [
              { text: loc._.cancel, style: 'cancel', onPress: () => {} },
              {
                text: loc._.continue,
                style: 'default',
                onPress: () => {
                  handleOpenURL({ url: clipboard });
                },
              },
            ],
            title: loc._.clipboard,
            message: contentType === ClipboardContentType.BITCOIN ? loc.wallets.clipboard_bitcoin : loc.wallets.clipboard_lightning,
          });
        }
      });
  };

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <NavigationContainer ref={navigationRef} theme={colorScheme === 'dark' ? BlueDarkTheme : BlueDefaultTheme}>
          <InitRoot />
          <Notifications onProcessNotifications={processPushNotifications} />
        </NavigationContainer>
      </View>
      <WatchConnectivity />
      <DeviceQuickActions />
      <Biometric />
      <WidgetCommunication />
      <Privacy />
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default App;
