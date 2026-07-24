import { CommonActions } from '@react-navigation/native';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Linking } from 'react-native';
import { reconcileArkBackgroundTaskResults } from '../blue_modules/arkade-background';
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
import { LightningCustodianWallet } from '../class/wallets/lightning-custodian-wallet';
import { LightningArkWallet } from '../class/wallets/lightning-ark-wallet';
import DeeplinkSchemaMatch from '../class/deeplink-schema-match';
import loc from '../loc';
import { Chain } from '../models/bitcoinUnits';
import { navigationRef } from '../NavigationService';
import ActionSheet from '../screen/ActionSheet';
import { useStorage } from './context/useStorage';
import { detectQRCodeInImage } from 'react-native-camera-kit-no-google';
import RNFS from 'react-native-fs';
import presentAlert from '../components/Alert';
import useWidgetCommunication from './useWidgetCommunication';
import useWatchConnectivity from './useWatchConnectivity';
import useDeviceQuickActions from './useDeviceQuickActions';
import useHandoffListener from './useHandoffListener';
import useMenuElements from './useMenuElements';
import { useExtendedNavigation } from './useExtendedNavigation';

const ClipboardContentType = Object.freeze({
  BITCOIN: 'BITCOIN',
  LIGHTNING: 'LIGHTNING',
});

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

  const handleOpenURL = useCallback(
    async (event: { url: string }): Promise<void> => {
      if (!shouldActivateListeners) return;

      try {
        if (!event.url) return;
        if (DeeplinkSchemaMatch.isBitcoinUriSchema(event.url)) {
          // NavigationContainer linking handles bitcoin deeplinks.
          return;
        }
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
      if (!shouldActivateListeners || wallets.length === 0) return;

      if ((appState.current.match(/inactive|background/) && nextAppState === 'active') || nextAppState === undefined) {
        updateExchangeRate();
        const processed = await processPushNotifications();
        // Reconcile in-process Ark background task results before the
        // notification-handled early return: if the background task observed
        // status changes while the app was backgrounded, the affected
        // wallets need a transactions refresh whether or not a notification
        // also fired.
        reconcileArkBackgroundTaskResults(fetchAndSaveWalletTransactions);
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
    [processPushNotifications, fetchAndSaveWalletTransactions, showClipboardAlert, wallets, shouldActivateListeners],
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
