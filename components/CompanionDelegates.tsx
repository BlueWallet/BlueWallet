import { CommonActions } from '@react-navigation/native';
import React, { lazy, Suspense, useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Linking, NativeEventEmitter, NativeModules, Platform } from 'react-native';

import A from '../blue_modules/analytics';
import BlueClipboard from '../blue_modules/clipboard';
import { updateExchangeRate } from '../blue_modules/currency';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import {
  addNotification,
  getStoredNotifications,
  clearStoredNotifications,
  setApplicationIconBadgeNumber,
  getDeliveredNotifications,
  removeAllDeliveredNotifications,
  initializeNotifications,
} from '../blue_modules/notifications';
import { LightningCustodianWallet } from '../class';
import DeeplinkSchemaMatch from '../class/deeplink-schema-match';
import loc from '../loc';
import { Chain } from '../models/bitcoinUnits';
import { navigationRef } from '../NavigationService';
import ActionSheet from '../screen/ActionSheet';
import { useStorage } from '../hooks/context/useStorage';
import { Notification } from 'react-native-notifications';

const MenuElements = lazy(() => import('../components/MenuElements'));
const DeviceQuickActions = lazy(() => import('../components/DeviceQuickActions'));
const HandOffComponentListener = lazy(() => import('../components/HandOffComponentListener'));
const WidgetCommunication = lazy(() => import('../components/WidgetCommunication'));
const WatchConnectivity = lazy(() => import('./WatchConnectivity'));

const eventEmitter = Platform.OS === 'ios' ? new NativeEventEmitter(NativeModules.EventEmitter) : undefined;

const ClipboardContentType = Object.freeze({
  BITCOIN: 'BITCOIN',
  LIGHTNING: 'LIGHTNING',
});

const CompanionDelegates = () => {
  const { wallets, addWallet, saveToDisk, fetchAndSaveWalletTransactions, refreshAllWalletTransactions, setSharedCosigner } = useStorage();
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const clipboardContent = useRef<undefined | string>();

  /**
   * Processes push notifications by fetching, handling, and navigating based on payload.
   */
  const processPushNotifications = useCallback(async () => {
    await new Promise(resolve => setTimeout(resolve, 200));

    const notifications2process: Notification[] = (await getStoredNotifications()) as Notification[];
    await clearStoredNotifications();
    setApplicationIconBadgeNumber(0);

    const deliveredNotifications: Notification[] = (await getDeliveredNotifications()) as Notification[];
    setTimeout(() => removeAllDeliveredNotifications(), 5000);

    for (const payload of notifications2process) {
      // @ts-ignore: fix later
      const wasTapped = payload.foreground === false || (payload.foreground === true && payload.userInteraction);

      console.log('processing push notification:', payload);
      let wallet;
      switch (+payload.payload.type) {
        case 2:
        case 3:
          wallet = wallets.find(w => w.weOwnAddress(payload.payload.address));
          break;
        case 1:
        case 4:
          wallet = wallets.find(w => w.weOwnTransaction(payload.payload.txid || payload.payload.hash));
          break;
      }

      if (wallet) {
        const walletID = wallet.getID();
        fetchAndSaveWalletTransactions(walletID);
        if (wasTapped) {
          if (payload.payload.type !== 3 || wallet.chain === Chain.OFFCHAIN) {
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
                address: payload.payload.address,
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

  /**
   * Handles deep links by navigating to appropriate routes.
   */
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

  /**
   * Shows an alert for clipboard content if it's a Bitcoin address or Lightning invoice.
   */
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

  /**
   * Handles app state changes to process notifications and clipboard content.
   */
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

  /**
   * Handles incoming notifications by saving them and processing if in foreground.
   */
  const onNotificationReceived = useCallback(
    async (notification: Notification) => {
      const payload = { ...notification.payload };
      // @ts-ignore: fix later
      payload.foreground = notification.foreground;
      // @ts-ignore: fix later
      payload.userInteraction = notification.userInteraction;

      await addNotification(payload);
      // @ts-ignore: fix later
      if (notification.foreground) {
        await processPushNotifications();
      }
    },
    [processPushNotifications],
  );

  /**
   * Adds event listeners for deep links, app state changes, and notifications.
   */
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
    initializeNotifications(processPushNotifications).catch(error => {
      console.error('Failed to initialize notifications:', error);
    });

    const subscriptions = addListeners();

    return () => {
      subscriptions.urlSubscription?.remove();
      subscriptions.appStateSubscription?.remove();
      subscriptions.notificationSubscription?.remove();
    };
  }, [addListeners, processPushNotifications]);

  return (
    <Suspense fallback={null}>
      <MenuElements />
      <DeviceQuickActions />
      <HandOffComponentListener />
      <WidgetCommunication />
      <WatchConnectivity />
    </Suspense>
  );
};

export default CompanionDelegates;
