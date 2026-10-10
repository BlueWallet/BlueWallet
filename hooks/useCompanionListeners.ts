import { useNavigation, CommonActions } from '@react-navigation/native';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus, DeviceEventEmitter, Linking } from 'react-native';
import { reconcileArkBackgroundTaskResults } from '../blue_modules/arkade-background';
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
import { LightningArkWallet } from '../class/wallets/lightning-ark-wallet';
import DeeplinkSchemaMatch from '../class/deeplink-schema-match';
import loc from '../loc';
import { Chain } from '../models/bitcoinUnits';
import { navigationRef } from '../NavigationService';
import { useSettings } from './context/useSettings';
import { useStorage } from './context/useStorage';
import presentAlert from '../components/Alert';
import { forwardPendingSharedQRCode, isSharedImageWakeUrl, popPendingSharedQRCode } from '../blue_modules/incoming-image';
import type { PendingSharedQRCode } from '../blue_modules/incoming-image';
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
  const initialUrlHandled = useRef(false);
  const sharedImageProcessing = useRef(false);
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

        // Local notification for actionable Ark swaps. Routed by walletID
        // rather than address/txid because the payload is locally generated;
        // see blue_modules/arkade-notifications.ts.
        if (+payload.type === 100) {
          const arkWallet = wallets.find(w => w.getID() === payload.walletID);
          if (!arkWallet || !(arkWallet instanceof LightningArkWallet)) {
            if (wasTapped) {
              navigation.navigate('WalletTransactions', {
                walletID: payload.walletID,
                walletType: arkWallet?.type,
              });
              return true;
            }
            continue;
          }
          // Refresh swap-derived rows directly via the wallet method to
          // bypass the 5-second NOP throttle in StorageProvider.fetchAndSaveWalletTransactions:
          // reconcileArkBackgroundTaskResults often runs on app resume immediately
          // before this handler, which would make a throttled call NOP and
          // leave the synthetic row stale.
          try {
            await arkWallet.fetchTransactions();
            await saveToDisk();
          } catch (e: any) {
            console.warn('[useCompanionListeners] arkWallet.fetchTransactions failed:', e?.message ?? e);
          }

          if (wasTapped) {
            const arkWalletID = arkWallet.getID();
            const row = arkWallet.getTransactions().find(tx => tx.txid === `swap-${payload.swapId}`);
            if (row) {
              navigation.navigate('LNDViewInvoice', { invoice: row, walletID: arkWalletID });
            } else {
              navigation.navigate('WalletTransactions', { walletID: arkWalletID, walletType: arkWallet.type });
            }
            return true;
          }
          continue;
        }

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

          if (+payload.type === 100) {
            const arkWallet = wallets.find(w => w.getID() === payload.walletID);
            if (!arkWallet || !(arkWallet instanceof LightningArkWallet)) {
              if (wasTapped) {
                navigationRef.dispatch(
                  CommonActions.navigate({
                    name: 'WalletTransactions',
                    params: { walletID: payload.walletID, walletType: arkWallet?.type },
                  }),
                );
                return true;
              }
              continue;
            }
            try {
              await arkWallet.fetchTransactions();
              await saveToDisk();
            } catch (e: any) {
              console.warn('[useCompanionListeners] arkWallet.fetchTransactions failed:', e?.message ?? e);
            }

            if (wasTapped) {
              const arkWalletID = arkWallet.getID();
              const row = arkWallet.getTransactions().find(tx => tx.txid === `swap-${payload.swapId}`);
              if (row) {
                navigationRef.dispatch(
                  CommonActions.navigate({
                    name: 'LNDViewInvoice',
                    params: { invoice: row, walletID: arkWalletID },
                  }),
                );
              } else {
                navigationRef.dispatch(
                  CommonActions.navigate({
                    name: 'WalletTransactions',
                    params: { walletID: arkWalletID, walletType: arkWallet.type },
                  }),
                );
              }
              return true;
            }
            continue;
          }

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
  }, [shouldActivateListeners, wallets, fetchAndSaveWalletTransactions, saveToDisk, navigation, refreshAllWalletTransactions]);

  useEffect(() => {
    if (!shouldActivateListeners) return;

    initializeNotifications(processPushNotifications);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldActivateListeners]);

  const handlePendingSharedImage = useCallback(
    (pending: PendingSharedQRCode): void => {
      forwardPendingSharedQRCode(pending, decodedContent => {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
        DeeplinkSchemaMatch.navigationRouteFor({ url: decodedContent }, (value: [string, any]) => navigationRef.navigate(...value), {
          wallets,
          addWallet,
          saveToDisk,
          setSharedCosigner,
        });
      });
    },
    [wallets, addWallet, saveToDisk, setSharedCosigner],
  );

  const processPendingSharedImage = useCallback(async () => {
    if (sharedImageProcessing.current) return;
    sharedImageProcessing.current = true;
    try {
      for (let attempt = 0; attempt < 20 && !navigationRef.isReady(); attempt++) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      if (!navigationRef.isReady()) {
        console.warn('[useCompanionListeners] Navigation was not ready for the shared QR code');
        return;
      }
      handlePendingSharedImage(await popPendingSharedQRCode());
    } finally {
      sharedImageProcessing.current = false;
    }
  }, [handlePendingSharedImage]);

  const handleOpenURL = useCallback(
    async (event: { url: string }): Promise<void> => {
      if (!shouldActivateListeners) return;

      try {
        if (!event.url) return;
        if (isSharedImageWakeUrl(event.url)) {
          await processPendingSharedImage();
          return;
        }
        let decodedUrl: string;
        try {
          decodedUrl = decodeURIComponent(event.url);
        } catch (e) {
          console.error('Failed to decode URL, using original', e);
          decodedUrl = event.url;
        }
        DeeplinkSchemaMatch.navigationRouteFor({ url: decodedUrl }, (value: [string, any]) => navigationRef.navigate(...value), {
          wallets,
          addWallet,
          saveToDisk,
          setSharedCosigner,
        });
      } catch (err: any) {
        console.error('Error in handleOpenURL:', err);
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        presentAlert({ message: err.message || loc.send.qr_error_no_qrcode });
      }
    },
    [wallets, addWallet, saveToDisk, setSharedCosigner, shouldActivateListeners, processPendingSharedImage],
  );

  const handleAppStateChange = useCallback(
    async (nextAppState: AppStateStatus) => {
      const previousState = appState.current;
      appState.current = nextAppState;

      if (!shouldActivateListeners) return;

      if (nextAppState !== 'active') {
        onLeaveForeground(nextAppState);
        return;
      }

      await processPendingSharedImage();
      if (wallets.length === 0) return;

      const wasBackgroundOrInactive = /inactive|background/.test(previousState);
      if (wasBackgroundOrInactive) {
        updateExchangeRate();
        const processed = await processPushNotifications();
        // Reconcile in-process Ark background task results before the
        // notification-handled early return: if the background task observed
        // status changes while the app was backgrounded, the affected
        // wallets need a transactions refresh whether or not a notification
        // also fired.
        reconcileArkBackgroundTaskResults(fetchAndSaveWalletTransactions);
        if (AppState.currentState !== 'active') return;

        onEnterForeground(previousState, { skipRead: processed });
      }
    },
    [
      processPendingSharedImage,
      processPushNotifications,
      fetchAndSaveWalletTransactions,
      onLeaveForeground,
      onEnterForeground,
      wallets,
      shouldActivateListeners,
    ],
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
    const sharedImageSubscription = DeviceEventEmitter.addListener('sharedImageAvailable', processPendingSharedImage);

    processPendingSharedImage();
    if (!initialUrlHandled.current && shouldActivateListeners) {
      initialUrlHandled.current = true;
      Linking.getInitialURL()
        .then(url => {
          if (url) return handleOpenURL({ url });
        })
        .catch(error => console.error('Failed to process initial URL:', error));
    }

    return () => {
      subscriptions.urlSubscription?.remove?.();
      subscriptions.appStateSubscription?.remove?.();
      sharedImageSubscription.remove();
    };
  }, [addListeners, handleOpenURL, processPendingSharedImage, shouldActivateListeners]);
};

export default useCompanionListeners;
