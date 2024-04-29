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
import Notifications from './blue_modules/notifications';
import Biometric from './class/biometrics';
import WidgetCommunication from './components/WidgetCommunication';
import ActionSheet from './screen/ActionSheet';
import triggerHapticFeedback, { HapticFeedbackTypes } from './blue_modules/hapticFeedback';
import MenuElements from './components/MenuElements';
import { updateExchangeRate } from './blue_modules/currency';
import { NavigationProvider } from './components/NavigationProvider';
import A from './blue_modules/analytics';
import HandOffComponentListener from './components/HandOffComponentListener';
import DeviceQuickActions from './components/DeviceQuickActions';

const eventEmitter = Platform.OS === 'ios' ? new NativeEventEmitter(NativeModules.EventEmitter) : undefined;
const { SplashScreen } = NativeModules;

LogBox.ignoreLogs(['Require cycle:', 'Battery state `unknown` and monitoring disabled, this is normal for simulators and tvOS.']);

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

  const addListeners = () => {
    const urlSubscription = Linking.addEventListener('url', handleOpenURL);
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    const notificationSubscription = eventEmitter?.addListener('onNotificationReceived', onNotificationReceived);

    // Store subscriptions in a ref or state to remove them later
    return {
      urlSubscription,
      appStateSubscription,
      notificationSubscription,
    };
  };

  useEffect(() => {
    if (walletsInitialized) {
      const subscriptions = addListeners();

      // Cleanup function
      return () => {
        subscriptions.urlSubscription?.remove();
        subscriptions.appStateSubscription?.remove();
        subscriptions.notificationSubscription?.remove();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletsInitialized]); // Re-run when walletsInitialized changes

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
      updateExchangeRate();
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
    triggerHapticFeedback(HapticFeedbackTypes.ImpactLight);
    BlueClipboard()
      .getClipboardContent()
      .then(clipboard => {
        ActionSheet.showActionSheetWithOptions(
          {
            title: loc._.clipboard,
            message: contentType === ClipboardContentType.BITCOIN ? loc.wallets.clipboard_bitcoin : loc.wallets.clipboard_lightning,
            options: [loc._.cancel, loc._.continue],
            cancelButtonIndex: 0,
          },
          buttonIndex => {
            switch (buttonIndex) {
              case 0: // Cancel
                break;
              case 1:
                handleOpenURL({ url: clipboard });
                break;
            }
          },
        );
      });
  };

  useEffect(() => {
    if (Platform.OS === 'ios') {
      // Call hide to setup the listener on the native side
      SplashScreen?.addObserver();
    }
  }, []);

  return (
    <NavigationContainer ref={navigationRef} theme={colorScheme === 'dark' ? BlueDarkTheme : BlueDefaultTheme}>
      <NavigationProvider>
        <SafeAreaProvider>
          <View style={styles.root}>
            <InitRoot />
            <Notifications onProcessNotifications={processPushNotifications} />
            <MenuElements />
            <DeviceQuickActions />
            <Biometric />
            <HandOffComponentListener />
          </View>
          <WatchConnectivity />
          <WidgetCommunication />
        </SafeAreaProvider>
      </NavigationProvider>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default App;
