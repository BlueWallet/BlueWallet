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
  CLIPBOARD_RESUME_DELAY_MS,
  CLIPBOARD_RETRY_DELAY_MS,
  ClipboardPaymentKind,
  clipboardActionOnAppStateChange,
  clipboardReadRetryLimit,
  delayForClipboardAction,
  evaluateClipboardOnForeground,
  isWalletUpdateInProgress,
} from '../blue_modules/clipboardPayment';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import { navigationRef } from '../NavigationService';
import { findNavigatorKeyForRoute } from '../navigation/navigationGuard';
import { useStorage } from './context/useStorage';

const CLIPBOARD_DETECTED_ROUTE = 'ClipboardDetected';

type PendingClipboardSheet = {
  contentType: ClipboardPaymentKind;
  clipboard: string;
  nextHash: string;
};

function isClipboardRouteActive(): boolean {
  return isClipboardSheetFocused() || (navigationRef.isReady() && navigationRef.getCurrentRoute()?.name === CLIPBOARD_DETECTED_ROUTE);
}

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

function clearTimer(timer: { current: ReturnType<typeof setTimeout> | null }) {
  if (timer.current) {
    clearTimeout(timer.current);
    timer.current = null;
  }
}

/**
 * Detects payment data on the clipboard after launch/resume and presents ClipboardDetected.
 * App-state sequencing stays with the caller so push-notification handling can run first.
 */
const useClipboardDetection = (enabled: boolean) => {
  const { wallets, walletTransactionUpdateStatus } = useStorage();
  const lastSeenClipboardHash = useRef<string | undefined>(undefined);
  const clipboardSeeded = useRef(false);
  const clipboardReadInFlight = useRef(false);
  const retryClipboardAfterPastePrompt = useRef(false);
  const clipboardPasteFollowUpAttempts = useRef(0);
  const clipboardScheduleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clipboardPresentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clipboardPastePollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clipboardCheckPending = useRef(false);
  const ignoreLastSeenOnNextRead = useRef(false);
  const queuedForegroundRead = useRef(false);
  const pendingClipboardSheet = useRef<PendingClipboardSheet | null>(null);
  const presentClipboardIfNeededRef = useRef<(lastSeen: string | undefined) => Promise<void>>(async () => {});
  const walletTxStatusRef = useRef(walletTransactionUpdateStatus);
  walletTxStatusRef.current = walletTransactionUpdateStatus;

  const persistHash = useCallback(async (hash: string) => {
    lastSeenClipboardHash.current = hash;
    await setLastSeenClipboardHash(hash);
  }, []);

  const presentClipboardSheet = useCallback(
    (pending: PendingClipboardSheet) => {
      pendingClipboardSheet.current = pending;
      clearTimer(clipboardPresentTimer);

      const tryPush = (): boolean => {
        if (isClipboardRouteActive()) {
          pendingClipboardSheet.current = null;
          return true;
        }
        if (!enabled || AppState.currentState !== 'active') return false;
        const pushed = pushClipboardDetectedSheet({
          payload: pending.clipboard,
          kind: pending.contentType,
          contentHash: pending.nextHash,
        });
        if (pushed) triggerHapticFeedback(HapticFeedbackTypes.ImpactLight);
        return pushed;
      };

      const giveUp = () => {
        pendingClipboardSheet.current = null;
        persistHash(pending.nextHash).catch(() => {});
      };

      if (tryPush()) return;

      clipboardPresentTimer.current = setTimeout(() => {
        clipboardPresentTimer.current = null;
        if (pendingClipboardSheet.current?.nextHash !== pending.nextHash) return;
        if (!tryPush()) giveUp();
      }, CLIPBOARD_RESUME_DELAY_MS);
    },
    [enabled, persistHash],
  );

  const presentClipboardIfNeeded = useCallback(
    async (lastSeen: string | undefined) => {
      if (!enabled || wallets.length === 0) return;
      if (clipboardReadInFlight.current) {
        queuedForegroundRead.current = true;
        if (Platform.OS === 'ios') retryClipboardAfterPastePrompt.current = true;
        return;
      }
      clipboardReadInFlight.current = true;

      try {
        if (clipboardPasteFollowUpAttempts.current === 0 && isWalletUpdateInProgress(String(walletTxStatusRef.current))) {
          clipboardCheckPending.current = true;
          clearTimer(clipboardScheduleTimer);
          clipboardScheduleTimer.current = setTimeout(() => {
            presentClipboardIfNeededRef.current(lastSeenClipboardHash.current).catch(() => {});
          }, CLIPBOARD_REFRESH_POLL_MS);
          return;
        }
        const { content, pasteBlocked } = await readClipboardForDetection();
        if (pasteBlocked) {
          const platform = Platform.OS === 'ios' ? 'ios' : 'android';
          if (
            AppState.currentState === 'active' &&
            clipboardPasteFollowUpAttempts.current < clipboardReadRetryLimit(platform, 'paste_blocked')
          ) {
            clipboardPasteFollowUpAttempts.current += 1;
            ignoreLastSeenOnNextRead.current = true;
            retryClipboardAfterPastePrompt.current = true;
            clearTimer(clipboardPastePollTimer);
            clipboardPastePollTimer.current = setTimeout(() => {
              clipboardPastePollTimer.current = null;
              presentClipboardIfNeededRef.current(lastSeenClipboardHash.current).catch(() => {});
            }, CLIPBOARD_RETRY_DELAY_MS);
          } else {
            retryClipboardAfterPastePrompt.current = false;
            ignoreLastSeenOnNextRead.current = false;
          }
          return;
        }
        if (!content) {
          if (AppState.currentState !== 'active' && Platform.OS === 'ios') {
            retryClipboardAfterPastePrompt.current = true;
          }
          return;
        }

        clipboardPasteFollowUpAttempts.current = 0;
        const ignoreLastSeen = ignoreLastSeenOnNextRead.current;
        ignoreLastSeenOnNextRead.current = false;
        const lastSeenHash = ignoreLastSeen ? lastSeen : ((await getLastSeenClipboardHash()) ?? lastSeen);
        const { offer, nextHash } = evaluateClipboardOnForeground(content, lastSeenHash, wallets, { ignoreLastSeen });
        retryClipboardAfterPastePrompt.current = false;
        await persistHash(nextHash);
        if (!offer || isClipboardRouteActive()) return;
        presentClipboardSheet({
          contentType: offer.kind,
          clipboard: offer.payload,
          nextHash,
        });
      } finally {
        clipboardReadInFlight.current = false;
        if (queuedForegroundRead.current) {
          queuedForegroundRead.current = false;
          if (!clipboardPastePollTimer.current) {
            presentClipboardIfNeededRef.current(lastSeenClipboardHash.current).catch(() => {});
          }
        }
      }
    },
    [enabled, persistHash, presentClipboardSheet, wallets],
  );
  presentClipboardIfNeededRef.current = presentClipboardIfNeeded;

  const scheduleClipboardDetection = useCallback(
    (initialDelayMs: number) => {
      clearTimer(clipboardScheduleTimer);
      clipboardCheckPending.current = true;

      const runWhenRefreshIdle = () => {
        clipboardScheduleTimer.current = null;
        if (AppState.currentState !== 'active') return;
        if (isWalletUpdateInProgress(String(walletTxStatusRef.current))) {
          clipboardCheckPending.current = true;
          clipboardScheduleTimer.current = setTimeout(runWhenRefreshIdle, CLIPBOARD_REFRESH_POLL_MS);
          return;
        }
        clipboardCheckPending.current = false;
        presentClipboardIfNeededRef.current(lastSeenClipboardHash.current).catch(() => {});
      };

      clipboardScheduleTimer.current = setTimeout(runWhenRefreshIdle, initialDelayMs);
    },
    [],
  );

  const onLeaveForeground = useCallback(
    (nextAppState: AppStateStatus) => {
      if (!enabled || wallets.length === 0) return;
      clearTimer(clipboardScheduleTimer);
      clearTimer(clipboardPresentTimer);
      if (nextAppState === 'background') clearTimer(clipboardPastePollTimer);
    },
    [enabled, wallets.length],
  );

  const onEnterForeground = useCallback(
    (previousState: AppStateStatus, options?: { skipRead?: boolean }) => {
      if (!enabled || wallets.length === 0) return;
      if (!/inactive|background/.test(previousState)) return;

      const action = clipboardActionOnAppStateChange({
        previous: previousState,
        next: 'active',
        hasPendingOffer: pendingClipboardSheet.current !== null,
        shouldRetryPaste: retryClipboardAfterPastePrompt.current,
        hasScheduledCheck: clipboardCheckPending.current,
      });

      const skipFreshRead = Boolean(options?.skipRead) && action === 'read';
      if (action === 'flush_pending') {
        const pending = pendingClipboardSheet.current;
        if (pending) presentClipboardSheet(pending);
      } else if (!skipFreshRead && (action === 'retry_read' || action === 'read' || action === 'resume_scheduled')) {
        if (action === 'retry_read') ignoreLastSeenOnNextRead.current = true;
        retryClipboardAfterPastePrompt.current = false;
        scheduleClipboardDetection(delayForClipboardAction(action));
      }
    },
    [enabled, presentClipboardSheet, scheduleClipboardDetection, wallets.length],
  );

  useEffect(() => {
    if (!enabled || wallets.length === 0 || clipboardSeeded.current) return;
    clipboardSeeded.current = true;
    (async () => {
      lastSeenClipboardHash.current = await getLastSeenClipboardHash();
      scheduleClipboardDetection(CLIPBOARD_IDLE_DELAY_MS);
    })();
  }, [enabled, scheduleClipboardDetection, wallets.length]);

  useEffect(() => {
    return () => {
      clearTimer(clipboardScheduleTimer);
      clearTimer(clipboardPresentTimer);
      clearTimer(clipboardPastePollTimer);
    };
  }, []);

  return { onLeaveForeground, onEnterForeground };
};

export default useClipboardDetection;
