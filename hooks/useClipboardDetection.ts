import { CommonActions } from '@react-navigation/native';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';

import {
  getLastSeenClipboardHash,
  isClipboardSheetFocused,
  readClipboardForDetection,
  setLastSeenClipboardHash,
} from '../blue_modules/clipboard';
import {
  CLIPBOARD_IDLE_DELAY_MS,
  CLIPBOARD_RETRY_DELAY_MS,
  ClipboardPaymentKind,
  clipboardActionOnAppStateChange,
  evaluateClipboardOnForeground,
} from '../blue_modules/clipboardPayment';
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

/** Detects payment data on the clipboard after launch/resume and presents ClipboardDetected. */
const useClipboardDetection = (enabled: boolean) => {
  const { wallets } = useStorage();
  const lastSeenClipboardHash = useRef<string | undefined>(undefined);
  const needsRead = useRef(true);
  const clipboardReadInFlight = useRef(false);
  const retryClipboardAfterPastePrompt = useRef(false);
  const resumedFromBackground = useRef(false);
  const clipboardPasteFollowUpAttempts = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ignoreLastSeenOnNextRead = useRef(false);
  const readRef = useRef<() => Promise<void>>(async () => {});

  const clearTimer = () => {
    if (!timer.current) return;
    clearTimeout(timer.current);
    timer.current = null;
  };

  const readClipboard = useCallback(async () => {
    if (!enabled || wallets.length === 0 || clipboardReadInFlight.current) {
      if (clipboardReadInFlight.current && Platform.OS === 'ios') retryClipboardAfterPastePrompt.current = true;
      return;
    }
    clipboardReadInFlight.current = true;
    needsRead.current = false;
    try {
      const { content, pasteBlocked } = await readClipboardForDetection();
      if (pasteBlocked || !content) {
        // One follow-up while we stay in the foreground. A tight retry loop makes iOS
        // answer "not authorized" and never show the paste prompt.
        needsRead.current = true;
        if (isForegroundAppState(AppState.currentState) && clipboardPasteFollowUpAttempts.current < 1) {
          clipboardPasteFollowUpAttempts.current += 1;
          ignoreLastSeenOnNextRead.current = true;
          clearTimer();
          timer.current = setTimeout(() => {
            timer.current = null;
            readRef.current().catch(() => {});
          }, CLIPBOARD_IDLE_DELAY_MS);
        }
        return;
      }

      clipboardPasteFollowUpAttempts.current = 0;
      const ignoreLastSeen = ignoreLastSeenOnNextRead.current;
      ignoreLastSeenOnNextRead.current = false;
      retryClipboardAfterPastePrompt.current = false;
      const lastSeenHash = ignoreLastSeen
        ? lastSeenClipboardHash.current
        : ((await getLastSeenClipboardHash()) ?? lastSeenClipboardHash.current);
      const { offer, nextHash } = evaluateClipboardOnForeground(content, lastSeenHash, wallets, { ignoreLastSeen });
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

  const scheduleRead = useCallback((delayMs: number) => {
    clearTimer();
    timer.current = setTimeout(() => {
      timer.current = null;
      readRef.current().catch(() => {});
    }, delayMs);
  }, []);

  const onLeaveForeground = useCallback(
    (nextAppState: AppStateStatus) => {
      if (!enabled || wallets.length === 0) return;
      // `inactive` is also the launch transition and Control Center. Cancelling here drops
      // the only scheduled read, and coming back to `active` would not start another.
      if (nextAppState !== 'background') return;
      clearTimer();
      needsRead.current = true;
      clipboardPasteFollowUpAttempts.current = 0;
      resumedFromBackground.current = true;
    },
    [enabled, wallets.length],
  );

  const onEnterForeground = useCallback(
    (previousState: AppStateStatus, options?: { skipRead?: boolean }) => {
      const cameFromBackground = resumedFromBackground.current || (isDesktop && previousState === 'inactive');
      const readBecausePending = needsRead.current;
      resumedFromBackground.current = false;
      if (!enabled || wallets.length === 0) return;
      const action = clipboardActionOnAppStateChange({
        previous: previousState,
        next: 'active',
        shouldRetryPaste: retryClipboardAfterPastePrompt.current,
        resumedFromBackground: cameFromBackground || readBecausePending,
      });
      if (options?.skipRead && action === 'read' && !readBecausePending) return;
      if (action === 'retry_read') {
        ignoreLastSeenOnNextRead.current = true;
        retryClipboardAfterPastePrompt.current = false;
        scheduleRead(CLIPBOARD_RETRY_DELAY_MS);
      } else if (action === 'read') {
        retryClipboardAfterPastePrompt.current = false;
        scheduleRead(CLIPBOARD_IDLE_DELAY_MS);
      }
    },
    [enabled, scheduleRead, wallets.length],
  );

  useEffect(() => {
    if (!enabled || wallets.length === 0) return;
    // Not the shared timer: leaving the foreground must not cancel this first read.
    const initialRead = setTimeout(() => {
      if (!isForegroundAppState(AppState.currentState)) {
        needsRead.current = true;
        return;
      }
      readRef.current().catch(() => {});
    }, CLIPBOARD_IDLE_DELAY_MS);
    return () => clearTimeout(initialRead);
  }, [enabled, wallets.length]);

  useEffect(() => {
    if (!enabled || wallets.length === 0) return;
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'background') {
        needsRead.current = true;
        return;
      }
      if (nextState === 'active' && needsRead.current) scheduleRead(CLIPBOARD_IDLE_DELAY_MS);
    });
    return () => subscription.remove();
  }, [enabled, scheduleRead, wallets.length]);

  useEffect(() => () => clearTimer(), []);

  return { onLeaveForeground, onEnterForeground };
};

export default useClipboardDetection;
