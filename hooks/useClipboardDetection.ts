import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

import {
  getLastSeenClipboardHash,
  isClipboardSheetFocused,
  readClipboardForDetection,
  setLastSeenClipboardHash,
} from '../blue_modules/clipboard';
import {
  ClipboardPaymentKind,
  CLIPBOARD_IDLE_DELAY_MS,
  CLIPBOARD_PASTE_POLL_MAX_ATTEMPTS,
  CLIPBOARD_REFRESH_POLL_MS,
  CLIPBOARD_RETRY_DELAY_MS,
  clipboardActionOnAppStateChange,
  delayForClipboardAction,
  delayForClipboardPresentAttempt,
  evaluateClipboardOnForeground,
  isWalletUpdateInProgress,
} from '../blue_modules/clipboardPayment';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import { useStorage } from './context/useStorage';

type PendingClipboardSheet = {
  contentType: ClipboardPaymentKind;
  clipboard: string;
  nextHash: string;
};

/**
 * Detects payment data on the clipboard after launch/resume and presents ClipboardDetected.
 * App-state sequencing stays with the caller so push-notification handling can run first.
 */
const useClipboardDetection = (enabled: boolean) => {
  const { wallets, walletTransactionUpdateStatus } = useStorage();
  const navigation = useNavigation();
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
  const clipboardCheckPending = useRef(false);
  const clipboardIdleSettlePasses = useRef(0);
  const ignoreLastSeenOnNextRead = useRef(false);
  const scheduleClipboardDetectionRef = useRef<(delayMs: number, options?: { requireIdleSettle?: boolean }) => void>(() => {});
  const presentClipboardIfNeededRef = useRef<(lastSeen: string | undefined) => Promise<void>>(async () => {});
  const walletTxStatusRef = useRef(walletTransactionUpdateStatus);
  walletTxStatusRef.current = walletTransactionUpdateStatus;
  const pendingClipboardSheet = useRef<PendingClipboardSheet | null>(null);

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
      pendingClipboardSheet.current = pending;
      cancelPresentLoop();
      clipboardPresentAttempts.current = 0;

      const attempt = () => {
        clipboardPresentTimer.current = null;
        const queued = pendingClipboardSheet.current;
        if (!queued) return;
        if (isClipboardSheetFocused()) {
          pendingClipboardSheet.current = null;
          return;
        }

        if (enabled && AppState.currentState === 'active') {
          if (clipboardPresentAttempts.current === 0) {
            triggerHapticFeedback(HapticFeedbackTypes.ImpactLight);
          }
          navigation.navigate('ClipboardDetected', {
            payload: queued.clipboard,
            kind: queued.contentType,
            contentHash: queued.nextHash,
          });
        }

        clipboardPresentAttempts.current += 1;
        clipboardPresentTimer.current = setTimeout(attempt, delayForClipboardPresentAttempt(clipboardPresentAttempts.current));
      };

      attempt();
    },
    [cancelPresentLoop, enabled, navigation],
  );

  const presentClipboardIfNeeded = useCallback(
    async (lastSeen: string | undefined) => {
      if (!enabled || wallets.length === 0) return;
      if (clipboardReadInFlight.current) {
        retryClipboardAfterPastePrompt.current = true;
        return;
      }
      clipboardReadInFlight.current = true;
      try {
        const pastePolling = clipboardPasteFollowUpAttempts.current > 0;
        if (!pastePolling && isWalletUpdateInProgress(String(walletTxStatusRef.current))) {
          clipboardCheckPending.current = true;
          scheduleClipboardDetectionRef.current(CLIPBOARD_REFRESH_POLL_MS);
          return;
        }
        const { content, pasteBlocked } = await readClipboardForDetection();
        if (pasteBlocked) {
          retryClipboardAfterPastePrompt.current = true;
          if (AppState.currentState === 'active' && clipboardPasteFollowUpAttempts.current < CLIPBOARD_PASTE_POLL_MAX_ATTEMPTS) {
            clipboardPasteFollowUpAttempts.current += 1;
            ignoreLastSeenOnNextRead.current = true;
            cancelPastePoll();
            clipboardPastePollTimer.current = setTimeout(() => {
              clipboardPastePollTimer.current = null;
              presentClipboardIfNeededRef.current(lastSeenClipboardHash.current).catch(() => {});
            }, CLIPBOARD_RETRY_DELAY_MS);
          } else {
            clearIgnoreLastSeen();
          }
          return;
        }
        if (!content && AppState.currentState !== 'active') {
          retryClipboardAfterPastePrompt.current = true;
          return;
        }

        clipboardPasteFollowUpAttempts.current = 0;
        const ignoreLastSeen = ignoreLastSeenOnNextRead.current;
        clearIgnoreLastSeen();
        const lastSeenHash = ignoreLastSeen ? lastSeen : ((await getLastSeenClipboardHash()) ?? lastSeen);
        const { offer, nextHash } = evaluateClipboardOnForeground(content, lastSeenHash, wallets, { ignoreLastSeen });
        if (!content) return;

        if (!offer) {
          lastSeenClipboardHash.current = nextHash;
          await setLastSeenClipboardHash(nextHash);
          return;
        }

        retryClipboardAfterPastePrompt.current = false;
        presentClipboardSheetUntilVisible({
          contentType: offer.kind,
          clipboard: offer.payload,
          nextHash,
        });
      } finally {
        clipboardReadInFlight.current = false;
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
      cancelScheduledClipboard();
      cancelPresentLoop();
      if (nextAppState === 'background') {
        cancelPastePoll();
      }
      if (clipboardReadInFlight.current || pendingClipboardSheet.current) {
        retryClipboardAfterPastePrompt.current = true;
      }
      if (nextAppState === 'background' && !pendingClipboardSheet.current && !retryClipboardAfterPastePrompt.current) {
        clipboardCheckPending.current = false;
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
