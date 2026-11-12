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
  const clipboardReadInFlight = useRef(false);
  const retryClipboardAfterPastePrompt = useRef(false);
  const resumedFromBackground = useRef(false);
  const pendingLaunchRead = useRef(false);
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
    try {
      const { content, pasteBlocked } = await readClipboardForDetection();
      if (pasteBlocked || !content) {
        // iOS 16+ may return empty before the user answers the paste prompt, so allow
        // one retry in this foreground session. Further retries loop the prompt: the
        // dialog flips AppState inactive→active, which is not a real resume.
        if (clipboardPasteFollowUpAttempts.current < 1) {
          clipboardPasteFollowUpAttempts.current += 1;
          retryClipboardAfterPastePrompt.current = true;
          ignoreLastSeenOnNextRead.current = true;
          if (isForegroundAppState(AppState.currentState)) {
            clearTimer();
            timer.current = setTimeout(() => {
              timer.current = null;
              readRef.current().catch(() => {});
            }, CLIPBOARD_IDLE_DELAY_MS);
          }
        } else {
          retryClipboardAfterPastePrompt.current = false;
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
      pendingLaunchRead.current = false;
      clipboardPasteFollowUpAttempts.current = 0;
      resumedFromBackground.current = true;
    },
    [enabled, wallets.length],
  );

  const onEnterForeground = useCallback(
    (previousState: AppStateStatus, options?: { skipRead?: boolean }) => {
      // Catalyst often reports window unfocus as `inactive` rather than `background`.
      // Do not treat that as a resume after a paste deny in this foreground session,
      // or the paste dialog's own inactive→active flip will loop the prompt.
      const cameFromBackground =
        resumedFromBackground.current || (isDesktop && previousState === 'inactive' && clipboardPasteFollowUpAttempts.current === 0);
      const launchPending = pendingLaunchRead.current;
      pendingLaunchRead.current = false;
      resumedFromBackground.current = false;
      if (!enabled || wallets.length === 0) return;
      const action = clipboardActionOnAppStateChange({
        previous: previousState,
        next: 'active',
        shouldRetryPaste: retryClipboardAfterPastePrompt.current,
        resumedFromBackground: cameFromBackground,
      });
      // A handled push notification already navigated somewhere; keep the pending read for
      // the next resume instead of covering that screen with the Detected sheet.
      if (options?.skipRead) {
        clearTimer();
        if (cameFromBackground) resumedFromBackground.current = true;
        if (launchPending) pendingLaunchRead.current = true;
        return;
      }
      if (action === 'retry_read') {
        ignoreLastSeenOnNextRead.current = true;
        retryClipboardAfterPastePrompt.current = false;
        scheduleRead(CLIPBOARD_RETRY_DELAY_MS);
      } else if (action === 'read' || launchPending) {
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
        pendingLaunchRead.current = true;
        return;
      }
      readRef.current().catch(() => {});
    }, CLIPBOARD_IDLE_DELAY_MS);
    return () => clearTimeout(initialRead);
  }, [enabled, wallets.length]);

  // AppState transitions are owned by useCompanionListeners, which calls onLeaveForeground /
  // onEnterForeground so notification handling and clipboard detection cannot race.
  useEffect(() => () => clearTimer(), []);

  return { onLeaveForeground, onEnterForeground };
};

export default useClipboardDetection;
