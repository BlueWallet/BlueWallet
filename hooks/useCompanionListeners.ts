import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Linking } from 'react-native';
import A from '../blue_modules/analytics';
import { getClipboardContent } from '../blue_modules/clipboard';
import { updateExchangeRate } from '../blue_modules/currency';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import { LightningCustodianWallet } from '../class';
import loc from '../loc';
import { Chain } from '../models/bitcoinUnits';
import ActionSheet from '../screen/ActionSheet';
import { useStorage } from './context/useStorage';
import useWidgetCommunication from './useWidgetCommunication';
import useWatchConnectivity from './useWatchConnectivity';
import useDeviceQuickActions from './useDeviceQuickActions';
import useHandoffListener from './useHandoffListener';
import useMenuElements from './useMenuElements';

const ClipboardContentType = Object.freeze({
  BITCOIN: 'BITCOIN',
  LIGHTNING: 'LIGHTNING',
});

/**
 * Hook that initializes all companion listeners and functionality without rendering a component
 * 
 * Note: Deep linking and push notification handling have been moved to LinkingConfig
 */
const useCompanionListeners = (skipIfNotInitialized = true) => {
  const { wallets, walletsInitialized } = useStorage();
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const clipboardContent = useRef<undefined | string>();

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

  /**
   * Prompt user to open detected content from clipboard
   * The actual URL handling is delegated to the LinkingConfig system
   */
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
                // Use Linking.openURL to let LinkingConfig system handle the URL
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
        
        // We'll let the LinkingConfig system handle clipboard parsing
        // instead of manually checking for bitcoin/lightning addresses
        const clipboard = await getClipboardContent();
        if (!clipboard) return;
        
        const isAddressFromStoredWallet = wallets.some(wallet => {
          if (wallet.chain === Chain.ONCHAIN) {
            return wallet.isAddressValid && wallet.isAddressValid(clipboard) && wallet.weOwnAddress(clipboard);
          } else {
            return (wallet as LightningCustodianWallet).isInvoiceGeneratedByWallet(clipboard) || wallet.weOwnAddress(clipboard);
          }
        });
        
        // Use simpler heuristics to check if clipboard content looks like a URL
        // The actual parsing will be done by the LinkingConfig system
        const isBitcoinAddress = clipboard.toLowerCase().startsWith('bitcoin:');
        const isLightningInvoice = clipboard.toLowerCase().startsWith('lightning:') || clipboard.toLowerCase().startsWith('lnbc');
        const isBluewallet = clipboard.toLowerCase().includes('bluewallet:');
        const isValidUrl = clipboard.includes(':') && !isAddressFromStoredWallet;
        
        if (
          !isAddressFromStoredWallet &&
          clipboardContent.current !== clipboard &&
          (isBitcoinAddress || isLightningInvoice || isBluewallet || isValidUrl)
        ) {
          let contentType;
          if (isBitcoinAddress) {
            contentType = ClipboardContentType.BITCOIN;
          } else if (isLightningInvoice) {
            contentType = ClipboardContentType.LIGHTNING;
          } else {
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
    [showClipboardAlert, wallets, shouldActivateListeners],
  );

  /**
   * Set up app state listener
   * URL/deep link handling has been moved to LinkingConfig
   * Push notification handling has been moved to LinkingConfig
   */
  const addListeners = useCallback(() => {
    if (!shouldActivateListeners) return { appStateSubscription: null };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return {
      appStateSubscription,
    };
  }, [handleAppStateChange, shouldActivateListeners]);

  useEffect(() => {
    const subscriptions = addListeners();

    return () => {
      subscriptions.appStateSubscription?.remove?.();
    };
  }, [addListeners]);
};

export default useCompanionListeners;
