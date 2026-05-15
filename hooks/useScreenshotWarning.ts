import { useEffect } from 'react';
import { Platform } from 'react-native';
import { CaptureEventType, CaptureProtection } from 'react-native-capture-protection';
import presentAlert from '../components/Alert';
import { isDesktop } from '../blue_modules/environment';
import loc from '../loc';

export const useScreenshotWarning = (enabled: boolean = true) => {
  useEffect(() => {
    if (!enabled) return;
    if (isDesktop) return;
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;

    let listener: ReturnType<typeof CaptureProtection.addListener> | undefined;
    let cancelled = false;

    const setup = async () => {
      // On iOS, hide the screen from the app switcher preview so the seed does
      // not appear in the recent-apps card. Screenshots and screen recording
      // remain allowed - the listener below shows a warning on capture.
      if (Platform.OS === 'ios') {
        try {
          await CaptureProtection.prevent({ appSwitcher: true });
        } catch (e) {
          console.debug('useScreenshotWarning: prevent(appSwitcher) failed', e);
        }
      }

      if (Platform.OS === 'android') {
        try {
          await CaptureProtection.requestPermission();
        } catch (e) {
          console.debug('useScreenshotWarning: requestPermission failed', e);
        }
      }

      // bail out if the effect was cleaned up while awaiting permission
      if (cancelled) return;

      listener = CaptureProtection.addListener(eventType => {
        if (eventType === CaptureEventType.CAPTURED) {
          presentAlert({
            title: loc.wallets.seed_screenshot_title,
            message: loc.wallets.seed_screenshot_warning,
          });
        }
      });
    };

    setup();

    return () => {
      cancelled = true;
      listener?.remove?.();
      if (Platform.OS === 'ios') {
        CaptureProtection.allow({ appSwitcher: true }).catch(e => {
          console.debug('useScreenshotWarning: allow(appSwitcher) cleanup failed', e);
        });
      }
    };
  }, [enabled]);
};
