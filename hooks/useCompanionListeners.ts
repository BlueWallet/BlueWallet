import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Linking } from 'react-native';
import A from '../blue_modules/analytics';
import { getClipboardContent } from '../blue_modules/clipboard';
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
import { LightningCustodianWallet } from '../class';
import loc from '../loc';
import { Chain } from '../models/bitcoinUnits';
import { processNotificationsWithNavigation, isBitcoinUri, isLightningUri } from '../navigation/LinkingConfig';
import ActionSheet from '../screen/ActionSheet';
import { useStorage } from './context/useStorage';
import useWidgetCommunication from './useWidgetCommunication';
import useWatchConnectivity from './useWatchConnectivity';
import useDeviceQuickActions from './useDeviceQuickActions';
import useHandoffListener from './useHandoffListener';
import useMenuElements from './useMenuElements';
import { useExtendedNavigation } from './useExtendedNavigation';
import Lnurl from '../class/lnurl';

const ClipboardContentType = Object.freeze({
  BITCOIN: 'BITCOIN',
  LIGHTNING: 'LIGHTNING',
});

/**
 * Hook that initializes all companion listeners and functionality without rendering a component
 */
const useCompanionListeners = (skipIfNotInitialized = true) => {
  const { wallets, refreshAllWalletTransactions, walletsInitialized } = useStorage();
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const clipboardContent = useRef<undefined | string>();
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

  const processPushNotifications = useCallback(async () => {
    if (!shouldActivateListeners) return false;

    await new Promise(resolve => setTimeout(resolve, 200));
    try {
      // Get and clear stored notifications
      const notifications2process = await getStoredNotifications();
      await clearStoredNotifications();
      setApplicationIconBadgeNumber(0);

      // Get delivered notifications and schedule cleanup
      const deliveredNotifications = await getDeliveredNotifications();
      setTimeout(async () => {
        try {
          removeAllDeliveredNotifications();
        } catch (error) {
          console.error('Failed to remove delivered notifications:', error);
        }
      }, 5000);

      console.log('🔔 Processing notifications:', {
        stored: notifications2process.length,
        delivered: deliveredNotifications.length,
      });

      // Process stored notifications using centralized logic
      let didNavigate = false;
      if (notifications2process.length > 0) {
        await processNotificationsWithNavigation(notifications2process, wallets, action => {
          navigation.dispatch(action);
          didNavigate = true;
        });
      }

      // Process delivered notifications if no navigation occurred yet
      if (!didNavigate && deliveredNotifications.length > 0) {
        // Convert delivered notifications to our format if needed
        const deliveredAsPayloads = deliveredNotifications
          .map(notification => {
            // Try to extract notification data from the delivered notification format
            const payload = notification.data || notification;
            return {
              foreground: false, // Delivered notifications are considered tapped
              userInteraction: true,
              address: payload.address || '',
              txid: payload.txid || '',
              type: payload.type || 0,
              hash: payload.hash || '',
              subText: payload.subText || notification.title || '',
              message: payload.message || notification.body || '',
            };
          })
          .filter(payload => payload.address || payload.txid || payload.hash); // Only valid notifications

        if (deliveredAsPayloads.length > 0) {
          await processNotificationsWithNavigation(deliveredAsPayloads, wallets, action => {
            navigation.dispatch(action);
            didNavigate = true;
          });
        }
      }

      // Refresh all wallet transactions if we had any notifications
      if (deliveredNotifications.length > 0) {
        refreshAllWalletTransactions();
      }

      return didNavigate;
    } catch (error) {
      console.error('Failed to process push notifications:', error);
    }
    return false;
  }, [shouldActivateListeners, wallets, navigation, refreshAllWalletTransactions]);

  useEffect(() => {
    if (!shouldActivateListeners) return;

    initializeNotifications(processPushNotifications);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldActivateListeners]);

  // URL handling is now done by React Navigation's LinkingConfig
  // This eliminates the conflict between multiple URL event listeners

  const showClipboardAlert = useCallback(
    ({ contentType }: { contentType: undefined | string }) => {
      if (!shouldActivateListeners) return;

      triggerHapticFeedback(HapticFeedbackTypes.ImpactLight);
      getClipboardContent().then(clipboard => {
        if (!clipboard) return;
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
                // Route through React Navigation's linking system instead of handling locally
                // This ensures consistency with other deep link handling
                Linking.openURL(clipboard);
                break;
            }
          },
        );
      });
    },
    [shouldActivateListeners],
  );

  const handleAppStateChange = useCallback(
    async (nextAppState: AppStateStatus | undefined) => {
      if (!shouldActivateListeners || wallets.length === 0) return;

      if ((appState.current.match(/background/) && nextAppState === 'active') || nextAppState === undefined) {
        setTimeout(() => A(A.ENUM.APP_UNSUSPENDED), 2000);
        updateExchangeRate();
        const processed = await processPushNotifications();
        if (processed) return;
        const clipboard = await getClipboardContent();
        if (!clipboard) return;
        const isAddressFromStoredWallet = wallets.some(wallet => {
          if (wallet.chain === Chain.ONCHAIN) {
            return wallet.isAddressValid && wallet.isAddressValid(clipboard) && wallet.weOwnAddress(clipboard);
          } else {
            return (wallet as LightningCustodianWallet).isInvoiceGeneratedByWallet(clipboard) || wallet.weOwnAddress(clipboard);
          }
        });
        // Check for URI patterns that should be handled by React Navigation 7
        const clipboardHasBitcoinUri = isBitcoinUri(clipboard);

        const clipboardHasLightningUri = isLightningUri(clipboard);

        const isLNURL = Lnurl.isLnurl(clipboard);
        const isBothBitcoinAndLightning = false; // Simplified - both Bitcoin and Lightning handling is complex and rare

        if (
          !isAddressFromStoredWallet &&
          clipboardContent.current !== clipboard &&
          (clipboardHasBitcoinUri || clipboardHasLightningUri || isLNURL || isBothBitcoinAndLightning)
        ) {
          let contentType;
          if (clipboardHasBitcoinUri) {
            contentType = ClipboardContentType.BITCOIN;
          } else if (clipboardHasLightningUri || isLNURL) {
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
    [processPushNotifications, showClipboardAlert, wallets, shouldActivateListeners],
  );

  const addListeners = useCallback(() => {
    if (!shouldActivateListeners) return { urlSubscription: null, appStateSubscription: null };

    // URL events are now handled by React Navigation's LinkingConfig
    // No need to listen for URL events here as they should go through the navigation system
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return {
      urlSubscription: null, // No longer listening for URL events
      appStateSubscription,
    };
  }, [handleAppStateChange, shouldActivateListeners]);

  useEffect(() => {
    const subscriptions = addListeners();

    return () => {
      // URL subscription is no longer used - handled by React Navigation
      subscriptions.appStateSubscription?.remove?.();
    };
  }, [addListeners]);
};

export default useCompanionListeners;
