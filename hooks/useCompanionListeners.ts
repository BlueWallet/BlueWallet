import { CommonActions } from '@react-navigation/native';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Linking } from 'react-native';
import { getClipboardContent } from '../blue_modules/clipboard';
import { updateExchangeRate } from '../blue_modules/currency';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import {
  acknowledgeStoredNotification,
  describeNotification,
  getDeliveredNotifications,
  getStoredNotifications,
  initializeNotifications,
  removeAllDeliveredNotifications,
  setApplicationIconBadgeNumber,
} from '../blue_modules/notifications';
import NeuraiUriMatch, { type NeuraiPaymentUri, type NeuraiUriRoute } from '../class/neurai-uri-match';
import { openNeuraiPaymentUri } from '../helpers/open-neurai-payment';
import loc from '../loc';
import { navigationRef } from '../NavigationService';
import ActionSheet from '../screen/ActionSheet';
import { useStorage } from './context/useStorage';
import { detectQRCodeInImage } from 'react-native-camera-kit-no-google';
import RNFS from 'react-native-fs';
import presentAlert from '../components/Alert';
import useWidgetCommunication from './useWidgetCommunication';
import useNetworkActivityWatch from './useNetworkActivityWatch';
import { useSettings } from './context/useSettings';
import { isNeuraiWallet } from '../class/wallets/is-neurai-wallet';
import useWatchConnectivity from './useWatchConnectivity';
import useDeviceQuickActions from './useDeviceQuickActions';
import useHandoffListener from './useHandoffListener';
import useMenuElements from './useMenuElements';
import { useExtendedNavigation } from './useExtendedNavigation';

const ClipboardContentType = Object.freeze({
  BITCOIN: 'BITCOIN',
  LIGHTNING: 'LIGHTNING',
  // What the clipboard can usefully hold in this fork. The two Bitcoin-era
  // entries are kept because the suggestion sheet still knows how to word them,
  // but the only one this wallet offers is a Neurai Connect pairing.
  NEURAI_CONNECT: 'NEURAI_CONNECT',
});

/**
 * Hook that initializes all companion listeners and functionality without rendering a component
 */
const useCompanionListeners = (skipIfNotInitialized = true) => {
  const { wallets, addWallet, saveToDisk, fetchAndSaveWalletTransactions, setSharedCosigner, walletsInitialized } = useStorage();
  const { setSelectedNetworkStorage } = useSettings();
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const clipboardContent = useRef<undefined | string>(undefined);
  const navigation = useExtendedNavigation();

  // We need to call hooks unconditionally before any conditional logic
  // We'll use this check inside the effects to conditionally run logic
  const shouldActivateListeners = !skipIfNotInitialized || walletsInitialized;

  // Initialize other hooks regardless of activation status
  // They'll handle their own conditional logic internally
  useWatchConnectivity();
  useWidgetCommunication();
  useMenuElements();
  useDeviceQuickActions();
  useHandoffListener();
  useNetworkActivityWatch();

  const processPushNotifications = useCallback(async () => {
    if (!shouldActivateListeners) return false;

    await new Promise(resolve => setTimeout(resolve, 200));
    try {
      // Each entry is removed only after it was dispatched (H20): opening a
      // screen for one push no longer drops the rest of the batch.
      const notifications2process = await getStoredNotifications();
      setApplicationIconBadgeNumber(0);
      let navigated = false;

      const deliveredNotifications = await getDeliveredNotifications();
      setTimeout(async () => {
        try {
          removeAllDeliveredNotifications();
        } catch (error) {
          console.error('Failed to remove delivered notifications:', error);
        }
      }, 5000);

      // Process notifications
      for (const payload of notifications2process) {
        const wasTapped = payload.foreground === false || (payload.foreground === true && payload.userInteraction);

        console.log('processing push notification:', describeNotification(payload));
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
          if (wasTapped && !navigated) {
            // Land the home screen on this wallet's network too: going back from
            // the wallet must not drop the user on a list where it is missing.
            if (isNeuraiWallet(wallet)) setSelectedNetworkStorage(wallet.getNeuraiNetwork());
            if (payload.type !== 3) {
              navigation.navigate('WalletTransactions', {
                walletID,
                walletType: wallet.type,
              });
            } else {
              navigation.navigate('ReceiveDetails', {
                walletID,
                address: payload.address,
              });
            }
            navigated = true;
          }
        } else {
          console.log('could not find wallet while processing push notification, NOP');
        }
        await acknowledgeStoredNotification(payload);
      }
      if (navigated) return true;

      if (deliveredNotifications.length > 0) {
        for (const payload of deliveredNotifications) {
          const wasTapped = payload.foreground === false || (payload.foreground === true && payload.userInteraction);

          console.log('processing push notification:', describeNotification(payload));
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
              if (isNeuraiWallet(wallet)) setSelectedNetworkStorage(wallet.getNeuraiNetwork());
              if (payload.type !== 3) {
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
                navigationRef.dispatch(
                  CommonActions.navigate({
                    name: 'ReceiveDetails',
                    params: {
                      walletID,
                      address: payload.address,
                    },
                  }),
                );
              }

              return true;
            }
          } else {
            console.log('could not find wallet while processing push notification, NOP');
          }
        }
      }

      // Skipped: the global `refreshAllWalletTransactions()` call that used
      // to run here drags the Bitcoin pipeline (BlueElectrum.waitTillConnected,
      // sender payment codes, etc.) and blocks the JS thread for several
      // seconds at cold start. In this app all wallets are Neurai variants
      // and they refresh themselves via the WSS push handler, so we don't
      // need a synchronous global refresh on every Firebase notification.
    } catch (error) {
      console.error('Failed to process push notifications:', error);
    }
    return false;
  }, [shouldActivateListeners, wallets, fetchAndSaveWalletTransactions, navigation, setSelectedNetworkStorage]);

  useEffect(() => {
    if (!shouldActivateListeners) return;

    initializeNotifications(processPushNotifications);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldActivateListeners]);

  // An `xna:` request that arrives as a deep link or inside a shared image: it
  // opens the send flow, which the route-based matcher cannot do on its own.
  const openPayment = useCallback(
    (payment: NeuraiPaymentUri): void => {
      if (!openNeuraiPaymentUri(navigationRef, wallets, payment)) presentAlert({ message: loc.wallets.select_no_bitcoin });
    },
    [wallets],
  );

  const handleOpenURL = useCallback(
    async (event: { url: string }): Promise<void> => {
      if (!shouldActivateListeners) return;

      try {
        if (!event.url) return;
        let decodedUrl: string;
        try {
          decodedUrl = decodeURIComponent(event.url);
        } catch (e) {
          console.error('Failed to decode URL, using original', e);
          decodedUrl = event.url;
        }
        const fileName = decodedUrl.split('/').pop()?.toLowerCase() || '';
        if (/\.(jpe?g|png)$/i.test(fileName)) {
          let base64: string;
          try {
            base64 = await RNFS.readFile(decodedUrl, 'base64');
          } catch {
            base64 = await RNFS.readFile(decodedUrl.replace(/^file:\/\//, ''), 'base64');
          }
          const qrValue = await detectQRCodeInImage(base64);
          if (!qrValue) {
            throw new Error(loc.send.qr_error_no_qrcode);
          }
          triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
          NeuraiUriMatch.navigationRouteFor(
            { url: qrValue },
            (value: NeuraiUriRoute) => navigationRef.navigate(...(value as [string, object])),
            {
              wallets,
              addWallet,
              saveToDisk,
              setSharedCosigner,
            },
            { onPayment: payment => openPayment(payment) },
          );
        } else {
          NeuraiUriMatch.navigationRouteFor(
            event,
            (value: NeuraiUriRoute) => navigationRef.navigate(...(value as [string, object])),
            {
              wallets,
              addWallet,
              saveToDisk,
              setSharedCosigner,
            },
            { onPayment: payment => openPayment(payment) },
          );
        }
      } catch (err: any) {
        console.error('Error in handleOpenURL:', err);
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        presentAlert({ message: err.message || loc.send.qr_error_no_qrcode });
      }
    },
    [wallets, addWallet, saveToDisk, setSharedCosigner, shouldActivateListeners, openPayment],
  );

  const showClipboardAlert = useCallback(
    ({ contentType }: { contentType: undefined | string }) => {
      if (!shouldActivateListeners) return;

      triggerHapticFeedback(HapticFeedbackTypes.ImpactLight);
      getClipboardContent().then(clipboard => {
        if (!clipboard) return;
        ActionSheet.showActionSheetWithOptions(
          {
            title: loc._.clipboard,
            message:
              contentType === ClipboardContentType.NEURAI_CONNECT
                ? loc.connect.clipboard_pairing
                : contentType === ClipboardContentType.BITCOIN
                  ? loc.wallets.clipboard_bitcoin
                  : loc.wallets.clipboard_lightning,
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
    [handleOpenURL, shouldActivateListeners],
  );

  const handleAppStateChange = useCallback(
    async (nextAppState: AppStateStatus | undefined) => {
      const previousState = appState.current;
      // Record the transition before notification/clipboard early returns.
      if (nextAppState) appState.current = nextAppState;
      if (!shouldActivateListeners || wallets.length === 0) return;

      if ((previousState.match(/inactive|background/) && nextAppState === 'active') || nextAppState === undefined) {
        // Notification navigation may reuse the focused screen, so its focus
        // effect is not a reliable place to revive a background WSS session.
        await Promise.allSettled(wallets.filter(isNeuraiWallet).map(wallet => wallet.ensureBackendConnected({ reconnect: true })));
        updateExchangeRate();
        const processed = await processPushNotifications();
        if (processed) return;
        const clipboard = await getClipboardContent();
        if (!clipboard) return;
        const isAddressFromStoredWallet = wallets.some(wallet => {
          return wallet.isAddressValid && wallet.isAddressValid(clipboard) && wallet.weOwnAddress(clipboard);
        });
        // The old gate was `DeeplinkSchemaMatch.isBitcoinAddress`, which no
        // Neurai address ever satisfies: the suggestion was dead code. What is
        // worth offering here is a Neurai Connect pairing copied from a desktop
        // browser, which is exactly the case where the QR code cannot be scanned.
        const isConnectPairing = NeuraiUriMatch.isConnectUri(clipboard);
        if (!isAddressFromStoredWallet && clipboardContent.current !== clipboard && isConnectPairing) {
          showClipboardAlert({ contentType: ClipboardContentType.NEURAI_CONNECT });
        }
        clipboardContent.current = clipboard;
      }
    },
    [processPushNotifications, showClipboardAlert, wallets, shouldActivateListeners],
  );

  const addListeners = useCallback(() => {
    if (!shouldActivateListeners) return { urlSubscription: null, appStateSubscription: null };

    const urlSubscription = Linking.addEventListener('url', handleOpenURL);
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return {
      urlSubscription,
      appStateSubscription,
    };
  }, [handleOpenURL, handleAppStateChange, shouldActivateListeners]);

  useEffect(() => {
    const subscriptions = addListeners();

    return () => {
      subscriptions.urlSubscription?.remove?.();
      subscriptions.appStateSubscription?.remove?.();
    };
  }, [addListeners]);
};

export default useCompanionListeners;
