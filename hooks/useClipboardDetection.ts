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
  CLIPBOARD_PRESENT_MAX_ATTEMPTS,
  CLIPBOARD_REFRESH_POLL_MS,
  CLIPBOARD_RETRY_DELAY_MS,
  ClipboardPaymentKind,
  clipboardActionOnAppStateChange,
  clipboardReadRetryLimit,
  delayForClipboardAction,
  delayForClipboardPresentAttempt,
  evaluateClipboardOnForeground,
  isWalletUpdateInProgress,
  shouldIgnoreLastSeenOnClipboardRetry,
  type ClipboardReadRetryReason,
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
  const clipboardFlushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clipboardPresentAttempts = useRef(0);
  const clipboardPresentPushed = useRef(false);
  const clipboardCheckPending = useRef(false);
  const clipboardIdleSettlePasses = useRef(0);
  const ignoreLastSeenOnNextRead = useRef(false);
  const scheduleClipboardDetectionRef = useRef<(delayMs: number, options?: { requireIdleSettle?: boolean }) => void>(() => {});
  const presentClipboardIfNeededRef = useRef<(lastSeen: string | undefined) => Promise<void>>(async () => {});
  const walletTxStatusRef = useRef(walletTransactionUpdateStatus);
  walletTxStatusRef.current = walletTransactionUpdateStatus;
  const pendingClipboardSheet = useRef<PendingClipboardSheet | null>(null);
  const androidWindowBlurred = useRef(false);
  const queuedForegroundRead = useRef(false);

  const cancelScheduledClipboard = useCallback(() => {
    if (clipboardScheduleTimer.current) {
      clearTimeout(clipboardScheduleTimer.current);
      clipboardScheduleTimer.current = null;
    }
  }, []);

  const cancelPastePoll = useCallback(() => {
    if (clipboardPastePollTimer.current) {
      clearTimeout(clipboardPastePollTimer.current);
      clipboardPastePollTimer.current = null;
    }
  }, []);

  const cancelPresentLoop = useCallback(() => {
    if (clipboardPresentTimer.current) {
      clearTimeout(clipboardPresentTimer.current);
      clipboardPresentTimer.current = null;
    }
  }, []);

  const clearIgnoreLastSeen = useCallback(() => {
    ignoreLastSeenOnNextRead.current = false;
  }, []);

  const presentClipboardSheetUntilVisible = useCallback(
    (pending: PendingClipboardSheet) => {
      const alreadyPushed = clipboardPresentPushed.current && pendingClipboardSheet.current?.nextHash === pending.nextHash;
      pendingClipboardSheet.current = pending;
      cancelPresentLoop();
      clipboardPresentAttempts.current = 0;
      clipboardPresentPushed.current = alreadyPushed || isClipboardRouteActive();

      const attempt = () => {
        clipboardPresentTimer.current = null;
        const queued = pendingClipboardSheet.current;
        if (!queued) return;
        if (isClipboardRouteActive()) {
          pendingClipboardSheet.current = null;
          return;
        }

        if (enabled && AppState.currentState === 'active' && !clipboardPresentPushed.current) {
          const pushed = pushClipboardDetectedSheet({
            payload: queued.clipboard,
            kind: queued.contentType,
            contentHash: queued.nextHash,
          });
          if (pushed) {
            clipboardPresentPushed.current = true;
            triggerHapticFeedback(HapticFeedbackTypes.ImpactLight);
          }
        }

        clipboardPresentAttempts.current += 1;
        if (clipboardPresentAttempts.current >= CLIPBOARD_PRESENT_MAX_ATTEMPTS) {
          pendingClipboardSheet.current = null;
          return;
        }
        clipboardPresentTimer.current = setTimeout(attempt, delayForClipboardPresentAttempt(clipboardPresentAttempts.current));
      };

      attempt();
    },
    [cancelPresentLoop, enabled],
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

      const scheduleReadRetry = (reason: ClipboardReadRetryReason) => {
        const platform = Platform.OS === 'ios' ? 'ios' : 'android';
        if (AppState.currentState !== 'active') return false;
        if (clipboardPasteFollowUpAttempts.current >= clipboardReadRetryLimit(platform, reason)) return false;
        clipboardPasteFollowUpAttempts.current += 1;
        if (shouldIgnoreLastSeenOnClipboardRetry(reason)) {
          ignoreLastSeenOnNextRead.current = true;
        }
        retryClipboardAfterPastePrompt.current = reason === 'paste_blocked';
        cancelPastePoll();
        clipboardPastePollTimer.current = setTimeout(() => {
          clipboardPastePollTimer.current = null;
          presentClipboardIfNeededRef.current(lastSeenClipboardHash.current).catch(() => {});
        }, CLIPBOARD_RETRY_DELAY_MS);
        return true;
      };

      try {
        const pastePolling = clipboardPasteFollowUpAttempts.current > 0;
        if (!pastePolling && isWalletUpdateInProgress(String(walletTxStatusRef.current))) {
          clipboardCheckPending.current = true;
          scheduleClipboardDetectionRef.current(CLIPBOARD_REFRESH_POLL_MS);
          return;
        }
        const { content, pasteBlocked } = await readClipboardForDetection();
        if (pasteBlocked) {
          if (!scheduleReadRetry('paste_blocked')) {
            retryClipboardAfterPastePrompt.current = false;
            clearIgnoreLastSeen();
          }
          return;
        }
        if (!content) {
          if (scheduleReadRetry('empty')) return;
          if (AppState.currentState !== 'active' && Platform.OS === 'ios') {
            retryClipboardAfterPastePrompt.current = true;
          }
          return;
        }

        clipboardPasteFollowUpAttempts.current = 0;
        const ignoreLastSeen = ignoreLastSeenOnNextRead.current;
        clearIgnoreLastSeen();
        const lastSeenHash = ignoreLastSeen ? lastSeen : ((await getLastSeenClipboardHash()) ?? lastSeen);
        const { offer, nextHash } = evaluateClipboardOnForeground(content, lastSeenHash, wallets, { ignoreLastSeen });

        if (!offer) {
          lastSeenClipboardHash.current = nextHash;
          await setLastSeenClipboardHash(nextHash);
          retryClipboardAfterPastePrompt.current = false;
          return;
        }

        retryClipboardAfterPastePrompt.current = false;
        if (isClipboardRouteActive()) {
          lastSeenClipboardHash.current = nextHash;
          return;
        }
        presentClipboardSheetUntilVisible({
          contentType: offer.kind,
          clipboard: offer.payload,
          nextHash,
        });
      } finally {
        clipboardReadInFlight.current = false;
        if (queuedForegroundRead.current) {
          queuedForegroundRead.current = false;
          if (!clipboardPastePollTimer.current) {
            scheduleClipboardDetectionRef.current(CLIPBOARD_RETRY_DELAY_MS, { requireIdleSettle: false });
          }
        }
      }
    },
    [cancelPastePoll, clearIgnoreLastSeen, enabled, presentClipboardSheetUntilVisible, wallets],
  );
  presentClipboardIfNeededRef.current = presentClipboardIfNeeded;

  const scheduleClipboardDetection = useCallback(
    (initialDelayMs: number, options?: { requireIdleSettle?: boolean }) => {
      cancelScheduledClipboard();
      clipboardCheckPending.current = true;
      clipboardIdleSettlePasses.current = 0;
      const requireIdleSettle = options?.requireIdleSettle !== false;

      const runWhenRefreshIdle = () => {
        clipboardScheduleTimer.current = null;
        if (AppState.currentState !== 'active') {
          return;
        }
        if (isWalletUpdateInProgress(String(walletTxStatusRef.current))) {
          clipboardIdleSettlePasses.current = 0;
          clipboardScheduleTimer.current = setTimeout(runWhenRefreshIdle, CLIPBOARD_REFRESH_POLL_MS);
          return;
        }
        if (requireIdleSettle) {
          clipboardIdleSettlePasses.current += 1;
          if (clipboardIdleSettlePasses.current < 2) {
            clipboardScheduleTimer.current = setTimeout(runWhenRefreshIdle, CLIPBOARD_REFRESH_POLL_MS);
            return;
          }
        }
        clipboardIdleSettlePasses.current = 0;
        clipboardCheckPending.current = false;
        presentClipboardIfNeededRef.current(lastSeenClipboardHash.current).catch(() => {});
      };

      clipboardScheduleTimer.current = setTimeout(runWhenRefreshIdle, initialDelayMs);
    },
    [cancelScheduledClipboard],
  );
  scheduleClipboardDetectionRef.current = scheduleClipboardDetection;

  const onLeaveForeground = useCallback(
    (nextAppState: AppStateStatus) => {
      if (!enabled || wallets.length === 0) return;
      androidWindowBlurred.current = true;
      cancelScheduledClipboard();
      cancelPresentLoop();
      if (nextAppState === 'background') {
        cancelPastePoll();
      }
    },
    [cancelPastePoll, cancelPresentLoop, cancelScheduledClipboard, enabled, wallets.length],
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
        if (pending) {
          if (clipboardFlushTimer.current) clearTimeout(clipboardFlushTimer.current);
          clipboardFlushTimer.current = setTimeout(() => {
            clipboardFlushTimer.current = null;
            if (pendingClipboardSheet.current) presentClipboardSheetUntilVisible(pendingClipboardSheet.current);
          }, delayForClipboardAction(action));
        }
      } else if (!skipFreshRead && (action === 'retry_read' || action === 'read' || action === 'resume_scheduled')) {
        if (action === 'retry_read') {
          ignoreLastSeenOnNextRead.current = true;
        }
        retryClipboardAfterPastePrompt.current = false;
        scheduleClipboardDetection(delayForClipboardAction(action), {
          requireIdleSettle: action !== 'retry_read',
        });
      }
    },
    [enabled, presentClipboardSheetUntilVisible, scheduleClipboardDetection, wallets.length],
  );

  useEffect(() => {
    if (!enabled || wallets.length === 0 || clipboardSeeded.current) return;
    clipboardSeeded.current = true;
    (async () => {
      const stored = await getLastSeenClipboardHash();
      lastSeenClipboardHash.current = stored;
      scheduleClipboardDetectionRef.current(CLIPBOARD_IDLE_DELAY_MS);
    })();
  }, [enabled, wallets.length]);

  useEffect(() => {
    if (!enabled || Platform.OS !== 'android') return undefined;
    const blurSub = AppState.addEventListener('blur', () => {
      androidWindowBlurred.current = true;
    });
    const focusSub = AppState.addEventListener('focus', () => {
      if (!androidWindowBlurred.current) return;
      androidWindowBlurred.current = false;
      onEnterForeground('background');
    });
    return () => {
      blurSub.remove();
      focusSub.remove();
    };
  }, [enabled, onEnterForeground]);

  useEffect(() => {
    return () => {
      cancelScheduledClipboard();
      cancelPresentLoop();
      cancelPastePoll();
      if (clipboardFlushTimer.current) {
        clearTimeout(clipboardFlushTimer.current);
        clipboardFlushTimer.current = null;
      }
    };
  }, [cancelPastePoll, cancelPresentLoop, cancelScheduledClipboard]);

  return { onLeaveForeground, onEnterForeground };
};

export default useClipboardDetection;
