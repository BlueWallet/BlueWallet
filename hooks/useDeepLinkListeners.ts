import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { getClipboardContent } from '../blue_modules/clipboard';
import { updateExchangeRate } from '../blue_modules/currency';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import { LightningCustodianWallet } from '../class';
import presentAlert from '../components/Alert';
import loc from '../loc';
import { Chain } from '../models/bitcoinUnits';
import ActionSheet from '../screen/ActionSheet';
import { useStorage } from './context/useStorage';
import {
  hasRecentDeepLinkActivity,
  isBitcoinAddress,
  isBothBitcoinAndLightning,
  isLightningInvoice,
  isLnUrl,
  navigateFromDeepLink,
} from '../navigation/linking';

const ClipboardContentType = Object.freeze({
  BITCOIN: 'BITCOIN',
  LIGHTNING: 'LIGHTNING',
});

const useDeepLinkListeners = () => {
  const { wallets, addWallet, saveToDisk, setSharedCosigner, walletsInitialized } = useStorage();
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const clipboardContent = useRef<undefined | string>(undefined);

  const shouldActivateListeners = walletsInitialized;

  const handleOpenURL = useCallback(
    async (event: { url: string }): Promise<void> => {
      if (!shouldActivateListeners) return;

      try {
        if (!event.url) return;

        const handled = await navigateFromDeepLink(event.url, {
          wallets,
          addWallet,
          saveToDisk,
          setSharedCosigner,
        });

        if (handled) {
          triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
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
        const clipboard = await getClipboardContent();
        if (!clipboard) return;
        if (hasRecentDeepLinkActivity()) {
          clipboardContent.current = clipboard;
          return;
        }

        const isAddressFromStoredWallet = wallets.some(wallet => {
          if (wallet.chain === Chain.ONCHAIN) {
            return wallet.isAddressValid && wallet.isAddressValid(clipboard) && wallet.weOwnAddress(clipboard);
          } else {
            return (wallet as LightningCustodianWallet).isInvoiceGeneratedByWallet(clipboard) || wallet.weOwnAddress(clipboard);
          }
        });
        const clipboardHasBitcoinAddress = isBitcoinAddress(clipboard);
        const clipboardHasLightningInvoice = isLightningInvoice(clipboard);
        const isLNURL = isLnUrl(clipboard);
        const clipboardHasBothBitcoinAndLightning = isBothBitcoinAndLightning(clipboard);
        if (
          !isAddressFromStoredWallet &&
          clipboardContent.current !== clipboard &&
          (clipboardHasBitcoinAddress || clipboardHasLightningInvoice || isLNURL || clipboardHasBothBitcoinAndLightning)
        ) {
          let contentType;
          if (clipboardHasBitcoinAddress) {
            contentType = ClipboardContentType.BITCOIN;
          } else if (clipboardHasLightningInvoice || isLNURL) {
            contentType = ClipboardContentType.LIGHTNING;
          } else if (clipboardHasBothBitcoinAndLightning) {
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

  useEffect(() => {
    if (!shouldActivateListeners) return;

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      appStateSubscription?.remove?.();
    };
  }, [handleAppStateChange, shouldActivateListeners]);
};

export default useDeepLinkListeners;
