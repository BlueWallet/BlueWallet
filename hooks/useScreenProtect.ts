import { CaptureProtection } from 'react-native-capture-protection';
import { isDesktop } from '../blue_modules/environment';
import { useCallback, useEffect, useRef, useState } from 'react';

// Capture protection (FLAG_SECURE on Android) belongs to the whole window, so every screen that
// asks for it shares one switch. Count the holders so a screen going away cannot lift the
// protection while another one still needs it, and keep it on for a moment after the last holder
// leaves: the closing animation keeps drawing the old screen for a few frames, and a screen share
// or recording would catch the secret in them (BlueWallet issue #8964).
const RELEASE_DELAY_MS = 1000;
// `prevent()` fails when no activity is attached, typically mid-transition; one retry a moment
// later usually lands.
const RETRY_DELAY_MS = 500;
let holders = 0;
let releaseTimer: ReturnType<typeof setTimeout> | undefined;

const acquire = (): void => {
  holders++;
  if (releaseTimer) {
    clearTimeout(releaseTimer);
    releaseTimer = undefined;
  }
};

const release = (): void => {
  holders = Math.max(0, holders - 1);
  if (holders > 0) return;
  if (releaseTimer) clearTimeout(releaseTimer);
  releaseTimer = setTimeout(() => {
    releaseTimer = undefined;
    if (holders === 0) CaptureProtection.allow().catch(() => {});
  }, RELEASE_DELAY_MS);
};

const protect = async (): Promise<boolean> => {
  try {
    await CaptureProtection.prevent();
    return true;
  } catch (error) {
    console.warn('useScreenProtect: could not enable capture protection', error);
    return false;
  }
};

const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/**
 * `isProtectionReady` turns true only once the window is protected: screens hold their secrets
 * back until then. If protection cannot be enabled, `isProtectionFailed` turns true and the
 * secrets stay hidden (H09); calling `enableScreenProtect` again (on focus, or from a retry
 * button) tries once more.
 */
export const useScreenProtect = () => {
  const isHolding = useRef(false);
  const isReady = useRef<boolean>(isDesktop);
  const inFlight = useRef<Promise<void> | null>(null);
  const [isProtectionReady, setIsProtectionReady] = useState<boolean>(isDesktop);
  const [isProtectionFailed, setIsProtectionFailed] = useState<boolean>(false);

  const enableScreenProtect = useCallback(async () => {
    if (isDesktop) return;
    if (!isHolding.current) {
      isHolding.current = true;
      acquire();
    } else if (isReady.current) {
      return;
    }
    if (inFlight.current) return inFlight.current;

    inFlight.current = (async () => {
      setIsProtectionFailed(false);
      let protectedNow = await protect();
      if (!protectedNow && isHolding.current) {
        await sleep(RETRY_DELAY_MS);
        if (isHolding.current) protectedNow = await protect();
      }
      if (protectedNow) await nextFrame();
      if (!isHolding.current) return;
      isReady.current = protectedNow;
      setIsProtectionReady(protectedNow);
      setIsProtectionFailed(!protectedNow);
    })().finally(() => {
      inFlight.current = null;
    });
    return inFlight.current;
  }, []);

  const disableScreenProtect = useCallback(async () => {
    if (isDesktop || !isHolding.current) return;
    isHolding.current = false;
    isReady.current = false;
    setIsProtectionReady(false);
    setIsProtectionFailed(false);
    release();
  }, []);

  useEffect(
    () => () => {
      if (isHolding.current) {
        isHolding.current = false;
        isReady.current = false;
        release();
      }
    },
    [],
  );

  const isScreenBeingRecorded = useCallback(async () => {
    if (isDesktop) return false;
    return await CaptureProtection.isScreenRecording();
  }, []);

  return {
    enableScreenProtect,
    disableScreenProtect,
    isProtectionReady,
    isProtectionFailed,
    isScreenBeingRecorded,
  };
};
