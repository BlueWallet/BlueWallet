import { StackActions } from '@react-navigation/native';
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
  CLIPBOARD_REFRESH_POLL_MS,
  CLIPBOARD_RETRY_DELAY_MS,
  ClipboardPaymentKind,
  clipboardActionOnAppStateChange,
  evaluateClipboardOnForeground,
} from '../blue_modules/clipboardPayment';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import { navigationRef } from '../NavigationService';
import { findNavigatorKeyForRoute } from '../navigation/navigationGuard';
import { useStorage } from './context/useStorage';

const CLIPBOARD_DETECTED_ROUTE = 'ClipboardDetected';

function pushClipboardDetectedSheet(params: { payload: string; kind: ClipboardPaymentKind; contentHash: string }): boolean {
  if (!navigationRef.isReady()) return false;
  if (navigationRef.getCurrentRoute()?.name === CLIPBOARD_DETECTED_ROUTE) return true;
  const target = findNavigatorKeyForRoute(navigationRef.getRootState(), CLIPBOARD_DETECTED_ROUTE);
  if (!target) return false;
  navigationRef.dispatch({
    ...StackActions.push(CLIPBOARD_DETECTED_ROUTE, params),
    target,
  });
  return true;
}

/** Detects payment data on the clipboard after launch/resume and presents ClipboardDetected. */
const useClipboardDetection = (enabled: boolean) => {
  const { wallets, walletTransactionUpdateStatus } = useStorage();
  const lastSeenClipboardHash = useRef<string | undefined>(undefined);
  const clipboardSeeded = useRef(false);
  const clipboardReadInFlight = useRef(false);
  const retryClipboardAfterPastePrompt = useRef(false);
  const clipboardPasteFollowUpAttempts = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ignoreLastSeenOnNextRead = useRef(false);
  const readRef = useRef<() => Promise<void>>(async () => {});
  const walletTxStatusRef = useRef(walletTransactionUpdateStatus);
  walletTxStatusRef.current = walletTransactionUpdateStatus;

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
      if (pasteBlocked) {
        // iOS Allow Paste can outlive one follow-up; Android 12+ toasts on each read.
        const maxAttempts = Platform.OS === 'ios' ? 20 : 3;
        if (AppState.currentState === 'active' && clipboardPasteFollowUpAttempts.current < maxAttempts) {
          clipboardPasteFollowUpAttempts.current += 1;
          ignoreLastSeenOnNextRead.current = true;
          retryClipboardAfterPastePrompt.current = true;
          clearTimer();
          timer.current = setTimeout(() => {
            timer.current = null;
            readRef.current().catch(() => {});
          }, CLIPBOARD_RETRY_DELAY_MS);
        } else {
          retryClipboardAfterPastePrompt.current = false;
          ignoreLastSeenOnNextRead.current = false;
        }
        return;
      }
      if (!content) {
        if (AppState.currentState !== 'active' && Platform.OS === 'ios') retryClipboardAfterPastePrompt.current = true;
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
    const runWhenIdle = () => {
      timer.current = null;
      if (AppState.currentState !== 'active') return;
      if (String(walletTxStatusRef.current) !== 'NONE') {
        timer.current = setTimeout(runWhenIdle, CLIPBOARD_REFRESH_POLL_MS);
        return;
      }
      readRef.current().catch(() => {});
    };
    timer.current = setTimeout(runWhenIdle, delayMs);
  }, []);

  const onLeaveForeground = useCallback(
    (nextAppState: AppStateStatus) => {
      if (!enabled || wallets.length === 0) return;
      clearTimer();
      if (nextAppState === 'background') clipboardPasteFollowUpAttempts.current = 0;
    },
    [enabled, wallets.length],
  );

  const onEnterForeground = useCallback(
    (previousState: AppStateStatus, options?: { skipRead?: boolean }) => {
      if (!enabled || wallets.length === 0) return;
      const action = clipboardActionOnAppStateChange({
        previous: previousState,
        next: 'active',
        shouldRetryPaste: retryClipboardAfterPastePrompt.current,
      });
      if (options?.skipRead && action === 'read') return;
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
    if (!enabled || wallets.length === 0 || clipboardSeeded.current) return;
    clipboardSeeded.current = true;
    (async () => {
      lastSeenClipboardHash.current = await getLastSeenClipboardHash();
      scheduleRead(CLIPBOARD_IDLE_DELAY_MS);
    })();
  }, [enabled, scheduleRead, wallets.length]);

  useEffect(() => () => clearTimer(), []);

  return { onLeaveForeground, onEnterForeground };
};

export default useClipboardDetection;
