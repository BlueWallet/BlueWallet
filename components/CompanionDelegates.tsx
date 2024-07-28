import 'react-native-gesture-handler'; // should be on top

import { CommonActions } from '@react-navigation/native';
import React, { lazy, Suspense, useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Linking, NativeEventEmitter, NativeModules, Platform } from 'react-native';

import A from '../blue_modules/analytics';
import BlueClipboard from '../blue_modules/clipboard';
import { updateExchangeRate } from '../blue_modules/currency';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import Notifications from '../blue_modules/notifications';
import { LightningCustodianWallet } from '../class';
import DeeplinkSchemaMatch from '../class/deeplink-schema-match';
import loc from '../loc';
import { Chain } from '../models/bitcoinUnits';
import { navigationRef } from '../NavigationService';
import ActionSheet from '../screen/ActionSheet';
import { useStorage } from '../hooks/context/useStorage';

const MenuElements = lazy(() => import('../components/MenuElements'));
const DeviceQuickActions = lazy(() => import('../components/DeviceQuickActions'));
const HandOffComponentListener = lazy(() => import('../components/HandOffComponentListener'));
const WidgetCommunication = lazy(() => import('../components/WidgetCommunication'));
const WatchConnectivity = lazy(() => import('./WatchConnectivity'));

// @ts-ignore: NativeModules.EventEmitter is not typed
const eventEmitter = Platform.OS === 'ios' ? new NativeEventEmitter(NativeModules.EventEmitter) : undefined;

const ClipboardContentType = Object.freeze({
  BITCOIN: 'BITCOIN',
  LIGHTNING: 'LIGHTNING',
});

const CompanionDelegates = () => {
  const { wallets, addWallet, saveToDisk, fetchAndSaveWalletTransactions, refreshAllWalletTransactions, setSharedCosigner } = useStorage();
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const clipboardContent = useRef<undefined | string>();

  const processPushNotifications = useCallback(async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    // @ts-ignore: Notifications type is not defined
    const notifications2process = await Notifications.getStoredNotifications();
    // @ts-ignore: Notifications type is not defined
    await Notifications.clearStoredNotifications();
    // @ts-ignore: Notifications type is not defined
    Notifications.setApplicationIconBadgeNumber(0);
    // @ts-ignore: Notifications type is not defined
    const deliveredNotifications = await Notifications.getDeliveredNotifications();
    // @ts-ignore: Notifications type is not defined
    setTimeout(() => Notifications.removeAllDeliveredNotifications(), 5000);

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
            navigationRef.dispatch(
              CommonActions.navigate({
                name: 'WalletTransactions',
                params: {
                  walletID,
                  walletType: wallet.type,
                },
              }),
            );
          } else {
            navigationRef.navigate('ReceiveDetailsRoot', {
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
    }

    if (deliveredNotifications.length > 0) {
      refreshAllWalletTransactions();
    }

    return false;
  }, [fetchAndSaveWalletTransactions, refreshAllWalletTransactions, wallets]);

  const handleOpenURL = useCallback(
    (event: { url: string }) => {
      DeeplinkSchemaMatch.navigationRouteFor(event, value => navigationRef.navigate(...value), {
        wallets,
        addWallet,
        saveToDisk,
        setSharedCosigner,
      });
    },
    [addWallet, saveToDisk, setSharedCosigner, wallets],
  );

  const showClipboardAlert = useCallback(
    ({ contentType }: { contentType: undefined | string }) => {
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
                case 0:
                  break;
                case 1:
                  handleOpenURL({ url: clipboard });
                  break;
              }
            },
          );
        });
    },
    [handleOpenURL],
  );

  const handleAppStateChange = useCallback(
    async (nextAppState: AppStateStatus | undefined) => {
      if (wallets.length === 0) return;
      if ((appState.current.match(/background/) && nextAppState === 'active') || nextAppState === undefined) {
        setTimeout(() => A(A.ENUM.APP_UNSUSPENDED), 2000);
        updateExchangeRate();
        const processed = await processPushNotifications();
        if (processed) return;
        const clipboard = await BlueClipboard().getClipboardContent();
        const isAddressFromStoredWallet = wallets.some(wallet => {
          if (wallet.chain === Chain.ONCHAIN) {
            return wallet.isAddressValid && wallet.isAddressValid(clipboard) && wallet.weOwnAddress(clipboard);
          } else {
            return (wallet as LightningCustodianWallet).isInvoiceGeneratedByWallet(clipboard) || wallet.weOwnAddress(clipboard);
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
    },
    [processPushNotifications, showClipboardAlert, wallets],
  );

  const onNotificationReceived = useCallback(
    async (notification: { data: { data: any } }) => {
      const payload = Object.assign({}, notification, notification.data);
      if (notification.data && notification.data.data) Object.assign(payload, notification.data.data);
      // @ts-ignore: Notifications type is not defined
      payload.foreground = true;

      // @ts-ignore: Notifications type is not defined
      await Notifications.addNotification(payload);
      // @ts-ignore: Notifications type is not defined
      if (payload.foreground) await processPushNotifications();
    },
    [processPushNotifications],
  );

  const addListeners = useCallback(() => {
    const urlSubscription = Linking.addEventListener('url', handleOpenURL);
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    const notificationSubscription = eventEmitter?.addListener('onNotificationReceived', onNotificationReceived);

    return {
      urlSubscription,
      appStateSubscription,
      notificationSubscription,
    };
  }, [handleOpenURL, handleAppStateChange, onNotificationReceived]);

  useEffect(() => {
    const subscriptions = addListeners();

    return () => {
      subscriptions.urlSubscription?.remove();
      subscriptions.appStateSubscription?.remove();
      subscriptions.notificationSubscription?.remove();
    };
  }, [addListeners]);

  return (
    <>
      <Notifications onProcessNotifications={processPushNotifications} />
      <Suspense fallback={null}>
        <MenuElements />
        <DeviceQuickActions />
        <HandOffComponentListener />
        <WidgetCommunication />
        <WatchConnectivity />
      </Suspense>
    </>
  );
};

export default CompanionDelegates;
