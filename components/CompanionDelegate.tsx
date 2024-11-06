import React, { useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus, DeviceEventEmitter, EmitterSubscription, Linking, NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { useStorage } from '../hooks/context/useStorage';
import QuickActions from 'react-native-quick-actions';
import { navigationRef } from '../NavigationService';
import A from '../blue_modules/analytics';
import BlueClipboard from '../blue_modules/clipboard';
import ActionSheet from '../screen/ActionSheet';
import presentAlert from '../components/Alert';
import DeeplinkSchemaMatch from '../class/deeplink-schema-match';
import { CommonActions } from '@react-navigation/native';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import {
  addNotification,
  clearStoredNotifications,
  getDeliveredNotifications,
  getStoredNotifications,
  removeAllDeliveredNotifications,
  setApplicationIconBadgeNumber,
} from '../blue_modules/notifications';
import { Chain } from '../models/bitcoinUnits';
import { LightningCustodianWallet } from '../class';
import useWidgetCommunication from '../hooks/useWidgetCommunication';
import useWatchConnectivity from '../hooks/useWatchConnectivity';
import useMenuElements from '../hooks/useMenuElements';
import useDeviceQuickActions from '../hooks/useDeviceQuickActions';
import { updateExchangeRate } from '../blue_modules/currency';
import { TWallet } from '../class/wallets/types';
import RNQRGenerator from 'rn-qr-generator';
import loc from '../loc';
import useOnAppLaunch from '../hooks/useOnAppLaunch';
import { read } from 'react-native-fs';

// @ts-ignore: NativeModules.EventEmitter is not typed
const eventEmitter = Platform.OS === 'ios' ? new NativeEventEmitter(NativeModules.EventEmitter) : undefined;

const ClipboardContentType = Object.freeze({
  BITCOIN: 'BITCOIN',
  LIGHTNING: 'LIGHTNING',
});

const CompanionDelegate = () => {
  const {
    walletsInitialized,
    wallets,
    addWallet,
    saveToDisk,
    setSharedCosigner,
    fetchAndSaveWalletTransactions,
    refreshAllWalletTransactions,
  } = useStorage();
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const clipboardContent = useRef<undefined | string>();
const { isViewAllWalletsEnabled, selectedDefaultWallet, ready} = useOnAppLaunch();

  useWidgetCommunication();
  useWatchConnectivity();
  useMenuElements();
  useDeviceQuickActions();

  const processPushNotifications = useCallback(async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      const notifications2process = await getStoredNotifications();
      await clearStoredNotifications();
      setApplicationIconBadgeNumber(0);
      const deliveredNotifications = await getDeliveredNotifications();
      setTimeout(() => removeAllDeliveredNotifications(), 5000);

      for (const payload of notifications2process) {
        const wasTapped = payload.foreground === false || (payload.foreground === true && payload.userInteraction);
        let wallet: LightningCustodianWallet | TWallet | undefined;
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
        try {
          await refreshAllWalletTransactions();
        } catch (error) {
          console.error('Error refreshing all wallet transactions:', error);
        }
      }

      return false;
    } catch (error) {
      console.error('Error processing push notifications:', error);
      return false;
    }
  }, [fetchAndSaveWalletTransactions, refreshAllWalletTransactions, wallets]);

  const handleOpenURL = useCallback(
    async (event: { url: string }): Promise<void> => {
      const { url } = event;

      if (url) {
        const decodedUrl = decodeURIComponent(url);
        const fileName = decodedUrl.split('/').pop()?.toLowerCase();

        if (fileName && /\.(jpe?g|png)$/i.test(fileName)) {
          try {
            const values = await RNQRGenerator.detect({
              uri: decodedUrl,
            });

            if (values && values.values.length > 0) {
              triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
              DeeplinkSchemaMatch.navigationRouteFor(
                { url: values.values[0] },
                (value: [string, any]) => navigationRef.navigate(...value),
                {
                  wallets,
                  addWallet,
                  saveToDisk,
                  setSharedCosigner,
                },
              );
            } else {
              triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
              presentAlert({ message: loc.send.qr_error_no_qrcode });
            }
          } catch (error) {
            console.error('Error detecting QR code:', error);
          }
        } else {
          triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
          DeeplinkSchemaMatch.navigationRouteFor(event, (value: [string, any]) => navigationRef.navigate(...value), {
            wallets,
            addWallet,
            saveToDisk,
            setSharedCosigner,
          });
        }
      }
    },
    [wallets, addWallet, saveToDisk, setSharedCosigner],
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
      const payload: any = Object.assign({}, notification, notification.data);
      if (notification.data && notification.data.data) Object.assign(payload, notification.data.data);
      payload.foreground = true;

      await addNotification(payload);
      if (payload.foreground) await processPushNotifications();
    },
    [processPushNotifications],
  );


  const walletQuickActions = useCallback(
    (data: any) => {
      try {
        const walletID = data?.userInfo?.url?.split('wallet/')[1];
        const wallet = wallets.find(w => w.getID() === walletID);
        if (wallet) {
          navigationRef.current?.navigate('WalletTransactions', {
            walletID: wallet.getID(),
            walletType: wallet.type,
          });
        }
      } catch (error) {
        console.error('Error handling wallet quick action:', error);
      }
    },
    [wallets],
  );
  const popInitialAction = useCallback(async (data: any): Promise<void> => {
    if (data) {
      const wallet = wallets.find((w: { getID: () => any }) => w.getID() === data.userInfo.url.split('wallet/')[1]);
      if (wallet) {
        navigationRef.current?.dispatch(
          CommonActions.navigate({
            name: 'WalletTransactions',
            params: {
              walletID: wallet.getID(),
              walletType: wallet.type,
            },
          }),
        );
      }
    } else {
      const url = await Linking.getInitialURL();
      if (url) {
        if (DeeplinkSchemaMatch.hasSchema(url)) {
          handleOpenURL({ url });
        }
      }
    }
  }, [wallets, handleOpenURL]);

  const popInitialShortcutAction = useCallback(async (): Promise<any> => {
    try {
      const data = await QuickActions.popInitialAction();
      return data;
    } catch (error) {
      return null;
    }
  }, []);

  const popInitialURLAction = useCallback(async (): Promise<void> => {
    if (!ready || !walletsInitialized) return;
  
    const initialAction = await popInitialShortcutAction();
    if (initialAction) {
      await popInitialAction(initialAction);
    } else {
      if (!isViewAllWalletsEnabled) {
        const wallet = wallets.find((w: TWallet) => w.getID() === selectedDefaultWallet);
        if (wallet) {
          navigationRef.current?.dispatch(
            CommonActions.navigate({
              name: 'WalletTransactions',
              params: {
                walletID: wallet.getID(),
                walletType: wallet.type,
              },
            }),
          );
        }
      }
    }
  }, [ready, walletsInitialized, isViewAllWalletsEnabled, selectedDefaultWallet, popInitialAction, popInitialShortcutAction]);
  
  useEffect(() => {
    if (!ready || !walletsInitialized) return;
  
    const quickActionSubscription = DeviceEventEmitter.addListener('quickActionShortcut', walletQuickActions);
    popInitialURLAction();
  
    const urlSubscription = Linking.addEventListener('url', handleOpenURL);
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    const notificationSubscription = eventEmitter?.addListener('onNotificationReceived', onNotificationReceived);
  
    return () => {
      if (quickActionSubscription && typeof quickActionSubscription.remove === 'function') {
        quickActionSubscription.remove();
      } else {
        DeviceEventEmitter.removeAllListeners('quickActionShortcut');
      }
      urlSubscription?.remove();
      appStateSubscription?.remove();
      notificationSubscription?.remove();
    };
  }, [ready, walletsInitialized, popInitialURLAction]);
  return null;
};

export default React.memo(CompanionDelegate);