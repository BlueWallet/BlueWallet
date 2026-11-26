import { CommonActions } from '@react-navigation/native';
import { useCallback, useEffect, useRef } from 'react';
import Clipboard from '@react-native-clipboard/clipboard';

import { getLastSeenClipboardHash, readClipboardForDetection, setLastSeenClipboardHash } from '../blue_modules/clipboard';
import { CLIPBOARD_IDLE_DELAY_MS, ClipboardPaymentKind, evaluateClipboardOnForeground } from '../blue_modules/clipboardPayment';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import { navigationRef } from '../NavigationService';
import { useStorage } from './context/useStorage';

const CLIPBOARD_DETECTED_ROUTE = 'ClipboardDetected';

function pushClipboardDetectedSheet(params: { payload: string; kind: ClipboardPaymentKind; contentHash: string }): boolean {
  if (!navigationRef.isReady()) return false;
  if (navigationRef.getCurrentRoute()?.name === CLIPBOARD_DETECTED_ROUTE) return true;
  navigationRef.dispatch(CommonActions.navigate(CLIPBOARD_DETECTED_ROUTE, params));
  return true;
}

/** Detects payment data on the clipboard at launch and when it changes. */
const useClipboardDetection = (enabled: boolean) => {
  const { wallets } = useStorage();
  const lastSeenClipboardHash = useRef<string | undefined>(undefined);
  const clipboardReadInFlight = useRef(false);
  const clipboardChangeVersion = useRef(0);
  const subscribed = useRef(false);
  const clipboardPasteFollowUpAttempts = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ignoreLastSeenOnNextRead = useRef(false);
  const readRef = useRef<() => Promise<void>>(async () => {});
  const pendingOffer = useRef<{ payload: string; kind: ClipboardPaymentKind; contentHash: string } | null>(null);

  const presentPendingOffer = useCallback(() => {
    const offer = pendingOffer.current;
    if (!offer || !navigationRef.isReady() || navigationRef.getCurrentRoute()?.name === CLIPBOARD_DETECTED_ROUTE) return;
    pendingOffer.current = null;
    if (pushClipboardDetectedSheet(offer)) triggerHapticFeedback(HapticFeedbackTypes.ImpactLight);
  }, []);

  const clearTimer = () => {
    if (!timer.current) return;
    clearTimeout(timer.current);
    timer.current = null;
  };

  const readClipboard = useCallback(async () => {
    if (!enabled || wallets.length === 0 || clipboardReadInFlight.current) {
      return;
    }
    clipboardReadInFlight.current = true;
    const readVersion = clipboardChangeVersion.current;
    try {
      const { content, pasteBlocked } = await readClipboardForDetection();
      if (!subscribed.current || readVersion !== clipboardChangeVersion.current) return;
      if (pasteBlocked || !content) {
        // One follow-up while we stay in the foreground. A tight retry loop makes iOS
        // answer "not authorized" and never show the paste prompt.
        if (clipboardPasteFollowUpAttempts.current < 1) {
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
      const lastSeenHash = ignoreLastSeen
        ? lastSeenClipboardHash.current
        : ((await getLastSeenClipboardHash()) ?? lastSeenClipboardHash.current);
      if (!subscribed.current || readVersion !== clipboardChangeVersion.current) return;
      const { offer, nextHash } = evaluateClipboardOnForeground(content, lastSeenHash, wallets, { ignoreLastSeen });
      if (!offer) {
        pendingOffer.current = null;
        lastSeenClipboardHash.current = nextHash;
        await setLastSeenClipboardHash(nextHash);
        return;
      }
      pendingOffer.current = { payload: offer.payload, kind: offer.kind, contentHash: nextHash };
      presentPendingOffer();
    } finally {
      clipboardReadInFlight.current = false;
      if (subscribed.current && readVersion !== clipboardChangeVersion.current) {
        clearTimer();
        timer.current = setTimeout(() => {
          timer.current = null;
          readRef.current().catch(() => {});
        }, CLIPBOARD_IDLE_DELAY_MS);
      }
    }
  }, [enabled, presentPendingOffer, wallets]);
  readRef.current = readClipboard;

  const scheduleRead = useCallback((delayMs: number) => {
    clearTimer();
    timer.current = setTimeout(() => {
      timer.current = null;
      readRef.current().catch(() => {});
    }, delayMs);
  }, []);

  useEffect(() => {
    if (!enabled || wallets.length === 0) return;

    subscribed.current = true;
    const subscription = Clipboard.addListener(() => {
      clipboardChangeVersion.current += 1;
      pendingOffer.current = null;
      clipboardPasteFollowUpAttempts.current = 0;
      scheduleRead(CLIPBOARD_IDLE_DELAY_MS);
    });
    const removeStateListener = navigationRef.addListener('state', presentPendingOffer);
    const removeReadyListener = navigationRef.addListener('ready', presentPendingOffer);
    scheduleRead(CLIPBOARD_IDLE_DELAY_MS);
    return () => {
      subscribed.current = false;
      pendingOffer.current = null;
      removeStateListener();
      removeReadyListener();
      subscription.remove();
      clearTimer();
    };
  }, [enabled, presentPendingOffer, scheduleRead, wallets.length]);
};

export default useClipboardDetection;
