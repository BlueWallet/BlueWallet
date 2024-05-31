import 'react-native-gesture-handler'; // should be on top

import React, { lazy, Suspense, useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Linking, Platform, UIManager } from 'react-native';
import A from '../blue_modules/analytics';
import BlueClipboard from '../blue_modules/clipboard';
import { updateExchangeRate } from '../blue_modules/currency';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import { useStorage } from '../blue_modules/storage-context';
import { LightningCustodianWallet } from '../class';
import DeeplinkSchemaMatch from '../class/deeplink-schema-match';
import loc from '../loc';
import { Chain } from '../models/bitcoinUnits';
import { navigationRef } from '../NavigationService';
import ActionSheet from '../screen/ActionSheet';

const MenuElements = lazy(() => import('../components/MenuElements'));
const DeviceQuickActions = lazy(() => import('../components/DeviceQuickActions'));
const HandOffComponentListener = lazy(() => import('../components/HandOffComponentListener'));
const WidgetCommunication = lazy(() => import('../components/WidgetCommunication'));
const WatchConnectivity = lazy(() => import('./WatchConnectivity'));

const ClipboardContentType = Object.freeze({
  BITCOIN: 'BITCOIN',
  LIGHTNING: 'LIGHTNING',
});

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const CompanionDelegates = () => {
  const { wallets, addWallet, saveToDisk, setSharedCosigner } = useStorage();
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const clipboardContent = useRef<undefined | string>();

  const handleOpenURL = useCallback(
    (event: { url: string }) => {
      DeeplinkSchemaMatch.navigationRouteFor(event, value => navigationRef.navigate(...value), {
        wallets,
        addWallet,
        saveToDisk,
        setSharedCosigner,
      });
    },
    [],
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
    [],
  );

  const handleAppStateChange = useCallback(
    async (nextAppState: AppStateStatus | undefined) => {
      if (wallets.length === 0) return;
      if ((appState.current.match(/background/) && nextAppState === 'active') || nextAppState === undefined) {
        setTimeout(() => A(A.ENUM.APP_UNSUSPENDED), 2000);
        updateExchangeRate();
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
    [showClipboardAlert, wallets],
  );

  const addListeners = useCallback(() => {
    const urlSubscription = Linking.addEventListener('url', handleOpenURL);
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return {
      urlSubscription,
      appStateSubscription,
    };
  }, []);

  useEffect(() => {
    const subscriptions = addListeners();

    return () => {
      subscriptions.urlSubscription?.remove();
      subscriptions.appStateSubscription?.remove();
    };
  }, []);

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
