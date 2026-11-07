import { useCallback, useEffect, useRef } from 'react';
import { AppState, NativeEventEmitter } from 'react-native';
import EventEmitterModule from '../blue_modules/NativeEventEmitter';
import type { OpenURLEvent } from '../helpers/sharedImage';

type OpenURLHandler = (event: OpenURLEvent) => Promise<void>;

const usePendingSharedImage = (enabled: boolean, handleOpenURL: OpenURLHandler) => {
  const draining = useRef(false);
  const drainRequested = useRef(false);

  const drainPendingSharedImages = useCallback(async () => {
    if (!enabled) return;

    drainRequested.current = true;
    if (draining.current) return;

    draining.current = true;
    try {
      do {
        drainRequested.current = false;
        while (true) {
          const url = await EventEmitterModule.consumePendingSharedImage();
          if (!url) break;
          await handleOpenURL({ url, sharedImage: true });
        }
      } while (drainRequested.current);
    } catch (error) {
      console.error('Failed to drain a pending shared image:', error);
    } finally {
      draining.current = false;
      if (drainRequested.current) drainPendingSharedImages().catch(() => undefined);
    }
  }, [enabled, handleOpenURL]);

  useEffect(() => {
    if (!enabled) return;

    const pendingSubscription = new NativeEventEmitter(EventEmitterModule).addListener('onSharedImagePending', drainPendingSharedImages);
    const appStateSubscription = AppState.addEventListener('change', state => {
      if (state === 'active') drainPendingSharedImages().catch(() => undefined);
    });

    // This is the acknowledgement boundary: the marker remains in the App
    // Group through lock/unlock until the unlocked listener mounts here.
    drainPendingSharedImages().catch(() => undefined);

    return () => {
      pendingSubscription.remove();
      appStateSubscription.remove();
    };
  }, [drainPendingSharedImages, enabled]);
};

export default usePendingSharedImage;
