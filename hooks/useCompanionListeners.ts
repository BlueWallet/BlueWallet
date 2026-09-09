import { useNavigation, CommonActions } from '@react-navigation/native';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Linking } from 'react-native';
import { updateExchangeRate } from '../blue_modules/currency';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import {
  clearStoredNotifications,
  getDeliveredNotifications,
  getStoredNotifications,
  initializeNotifications,
  removeAllDeliveredNotifications,
  setApplicationIconBadgeNumber,
} from '../blue_modules/notifications';
import DeeplinkSchemaMatch from '../class/deeplink-schema-match';
import loc from '../loc';
import { Chain } from '../models/bitcoinUnits';
import { navigationRef } from '../NavigationService';
import { useSettings } from './context/useSettings';
import { useStorage } from './context/useStorage';
import { detectQRCodeInImage } from 'react-native-camera-kit-no-google';
import RNFS from 'react-native-fs';
import presentAlert from '../components/Alert';
import useWidgetCommunication from './useWidgetCommunication';
import useDeviceQuickActions from './useDeviceQuickActions';
import useHandoffListener from './useHandoffListener';
import useMenuElements from './useMenuElements';
import useClipboardDetection from './useClipboardDetection';

/**
 * Hook that initializes all companion listeners and functionality without rendering a component
 */
const useCompanionListeners = (skipIfNotInitialized = true) => {
  const {
    wallets,
    addWallet,
    saveToDisk,
    fetchAndSaveWalletTransactions,
    refreshAllWalletTransactions,
    setSharedCosigner,
    walletsInitialized,
  } = useStorage();
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const navigation = useNavigation();

  // We need to call hooks unconditionally before any conditional logic
  // We'll use this check inside the effects to conditionally run logic
  const shouldActivateListeners = !skipIfNotInitialized || walletsInitialized;
  const { isClipboardGetContentEnabled } = useSettings();

  const { onLeaveForeground, onEnterForeground } = useClipboardDetection(shouldActivateListeners && isClipboardGetContentEnabled);

  // Initialize other hooks regardless of activation status
  // They'll handle their own conditional logic internally
  useWidgetCommunication();
  useMenuElements();
  useDeviceQuickActions();
  useHandoffListener();

  const processPushNotifications = useCallback(async () => {
    if (!shouldActivateListeners) return false;

    await new Promise(resolve => setTimeout(resolve, 200));
    try {
      const notifications2process = await getStoredNotifications();
      await clearStoredNotifications();
      setApplicationIconBadgeNumber(0);

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

            return true;
          }
        } else {
          console.log('could not find wallet while processing push notification, NOP');
        }
      }

      if (deliveredNotifications.length > 0) {
        for (const payload of deliveredNotifications) {
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

      if (deliveredNotifications.length > 0) {
        refreshAllWalletTransactions();
      }
    } catch (error) {
      console.error('Failed to process push notifications:', error);
    }
    return false;
  }, [shouldActivateListeners, wallets, fetchAndSaveWalletTransactions, navigation, refreshAllWalletTransactions]);

  useEffect(() => {
    if (!shouldActivateListeners) return;

    initializeNotifications(processPushNotifications);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldActivateListeners]);

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
          DeeplinkSchemaMatch.navigationRouteFor({ url: qrValue }, (value: [string, any]) => navigationRef.navigate(...value), {
            wallets,
            addWallet,
            saveToDisk,
            setSharedCosigner,
          });
        } else {
          DeeplinkSchemaMatch.navigationRouteFor(event, (value: [string, any]) => navigationRef.navigate(...value), {
            wallets,
            addWallet,
            saveToDisk,
            setSharedCosigner,
          });
        }
      } catch (err: any) {
        console.error('Error in handleOpenURL:', err);
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        presentAlert({ message: err.message || loc.send.qr_error_no_qrcode });
      }
    },
    [wallets, addWallet, saveToDisk, setSharedCosigner, shouldActivateListeners],
  );

  const handleAppStateChange = useCallback(
    async (nextAppState: AppStateStatus) => {
      const previousState = appState.current;
      appState.current = nextAppState;

      if (!shouldActivateListeners || wallets.length === 0) return;

      if (nextAppState !== 'active') {
        onLeaveForeground(nextAppState);
        return;
      }

      const wasBackgroundOrInactive = /inactive|background/.test(previousState);
      if (wasBackgroundOrInactive) {
        updateExchangeRate();
        const processed = await processPushNotifications();
        if (AppState.currentState !== 'active') return;

        onEnterForeground(previousState, { skipRead: processed });
      }
    },
    [processPushNotifications, onLeaveForeground, onEnterForeground, wallets, shouldActivateListeners],
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
