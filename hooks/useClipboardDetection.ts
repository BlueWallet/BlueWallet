import { CommonActions } from '@react-navigation/native';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

import {
  getClipboardContent,
  getLastSeenClipboardHash,
  isClipboardSheetFocused,
  setLastSeenClipboardHash,
} from '../blue_modules/clipboard';
import { ClipboardPaymentKind, evaluateClipboardOnForeground } from '../blue_modules/clipboardPayment';
import { isDesktop } from '../blue_modules/environment';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import { navigationRef } from '../NavigationService';
import { useStorage } from './context/useStorage';

const CLIPBOARD_DETECTED_ROUTE = 'ClipboardDetected';

// Reading the pasteboard while the app is `inactive` (normal for the iOS Simulator until its
// window is key) comes back as "Operation not authorized" and iOS does not show the paste prompt.
const isForegroundAppState = (state: AppStateStatus) => state === 'active' || state === 'unknown';

function pushClipboardDetectedSheet(params: { payload: string; kind: ClipboardPaymentKind; contentHash: string }): boolean {
  if (!navigationRef.isReady()) return false;
  if (navigationRef.getCurrentRoute()?.name === CLIPBOARD_DETECTED_ROUTE) return true;
  navigationRef.dispatch(CommonActions.navigate(CLIPBOARD_DETECTED_ROUTE, params));
  return true;
}

/**
 * Detects payment data on the clipboard once at launch and once per resume, and presents
 * ClipboardDetected. A failed, empty or denied read is never retried: on iOS the read already
 * waits for the paste prompt, and the prompt's own inactive→active flip is not a resume.
 */
const useClipboardDetection = (enabled: boolean) => {
  const { wallets } = useStorage();
  const lastSeenClipboardHash = useRef<string | undefined>(undefined);
  const clipboardReadInFlight = useRef(false);
  // Launch counts as a resume; a launch while not yet foreground is read on the first `active`.
  const readOnNextForeground = useRef(true);
  const readRef = useRef<() => Promise<void>>(async () => {});

  const readClipboard = useCallback(async () => {
    if (!enabled || wallets.length === 0 || clipboardReadInFlight.current) return;
    clipboardReadInFlight.current = true;
    try {
      const content = await getClipboardContent();
      if (!content) return;

      const lastSeenHash = (await getLastSeenClipboardHash()) ?? lastSeenClipboardHash.current;
      const { offer, nextHash } = evaluateClipboardOnForeground(content, lastSeenHash, wallets);
      if (!offer) {
        lastSeenClipboardHash.current = nextHash;
        await setLastSeenClipboardHash(nextHash);
        return;
      }
      if (isClipboardSheetFocused() || (navigationRef.isReady() && navigationRef.getCurrentRoute()?.name === CLIPBOARD_DETECTED_ROUTE)) {
        return;
      }
      if (
        pushClipboardDetectedSheet({
          payload: offer.payload,
          kind: offer.kind,
          contentHash: nextHash,
        })
      ) {
        triggerHapticFeedback(HapticFeedbackTypes.ImpactLight);
      }
    } finally {
      clipboardReadInFlight.current = false;
    }
  }, [enabled, wallets]);
  readRef.current = readClipboard;

  const onLeaveForeground = useCallback((nextAppState: AppStateStatus) => {
    // `inactive` is also Control Center and the iOS paste prompt, so only `background` is a resume.
    if (nextAppState === 'background') readOnNextForeground.current = true;
  }, []);

  const onEnterForeground = useCallback(
    (previousState: AppStateStatus, options?: { skipRead?: boolean }) => {
      if (!enabled || wallets.length === 0) return;
      // Catalyst reports window unfocus as `inactive` rather than `background`.
      if (!readOnNextForeground.current && !(isDesktop && previousState === 'inactive')) return;
      // A handled push notification already navigated somewhere; keep the read for the next resume.
      if (options?.skipRead) return;
      readOnNextForeground.current = false;
      readRef.current().catch(() => {});
    },
    [enabled, wallets.length],
  );

  useEffect(() => {
    if (!enabled || wallets.length === 0 || !isForegroundAppState(AppState.currentState)) return;
    readOnNextForeground.current = false;
    readRef.current().catch(() => {});
  }, [enabled, wallets.length]);

  // AppState transitions are owned by useCompanionListeners, which calls onLeaveForeground /
  // onEnterForeground so notification handling and clipboard detection cannot race.
  return { onLeaveForeground, onEnterForeground };
};

export default useClipboardDetection;
