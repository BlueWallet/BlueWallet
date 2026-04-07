import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  _setConfigureNotificationsFn,
  checkNotificationPermissionStatus,
  configureNotifications,
  initializeNotifications,
  NOTIFICATIONS_NO_AND_DONT_ASK_FLAG,
  setProcessNotificationsHandler,
  type TPayload,
} from '../blue_modules/notifications';

interface UseNotificationsOptions {
  /** Set to true once wallets are loaded and navigation is ready. */
  enabled?: boolean;
  /**
   * Called when a push notification is received or tapped and wallet
   * transactions should be re-fetched.
   */
  onProcessNotifications?: (payload?: TPayload) => unknown;
}

let hasBootstrappedNotifications = false;
let lastKnownPermissionStatus = 'unavailable';
let pendingPermissionRecovery: Promise<void> | null = null;

/**
 * Initialises react-native-notifications and wires up the process handler.
 * Mount this hook once, high in the component tree (e.g. inside App.tsx or
 * useDeepLinkListeners).
 *
 * Follows the react-native-notifications docs pattern:
 *   1. Register all event listeners (done inside initializeNotifications)
 *   2. Call Notifications.registerRemoteNotifications() (done inside configureNotifications)
 *   3. Handle the cold-boot notification via the eagerly-captured initial value
 *
 * The AppState listener re-initialises when the user grants permission while
 * the app is backgrounded, without requiring a restart.
 */
const useNotifications = ({ enabled = false, onProcessNotifications }: UseNotificationsOptions = {}) => {
  // Always-current ref — updated after every render so closures never go stale.
  const onProcessRef = useRef(onProcessNotifications);
  useEffect(() => {
    onProcessRef.current = onProcessNotifications;
  });

  // Tracks the last-known permission status to detect changes in AppState handler.
  const permissionStatusRef = useRef<string>('unavailable');

  // ── Inject configureNotifications into notifications.ts ────────────────────
  // This enables tryToObtainPermissions (called from UI screens without hook
  // context) to trigger the notification configuration pipeline via the ref.
  useEffect(() => {
    _setConfigureNotificationsFn(() => configureNotifications((payload?: TPayload) => onProcessRef.current?.(payload)));
    return () => {
      _setConfigureNotificationsFn(null);
    };
  }, []);

  // ── Step 1: initialise when enabled ────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    checkNotificationPermissionStatus()
      .then(status => {
        permissionStatusRef.current = status;
        lastKnownPermissionStatus = status;
      })
      .catch(error => {
        console.error('useNotifications: failed to sync permission status:', error);
      });

    if (hasBootstrappedNotifications) return;
    hasBootstrappedNotifications = true;
    initializeNotifications((payload?: TPayload) => onProcessRef.current?.(payload));
  }, [enabled]);

  // ── Step 2: keep the in-module handler current ─────────────────────────────
  // A stable closure is registered once; it always reads the latest callback
  // from the ref, so we don't need to re-call setProcessNotificationsHandler
  // every time onProcessNotifications changes.
  useEffect(() => {
    if (!enabled) return;
    setProcessNotificationsHandler(async (payload?: TPayload) => {
      await onProcessRef.current?.(payload);
    });
  }, [enabled]);

  // ── Step 3: re-initialise when notification permission is granted ───────────
  // Handles the case where the user navigates to System Settings, grants
  // permission, and returns to the app without restarting it.
  useEffect(() => {
    if (!enabled) return;

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState !== 'active') return;
      try {
        const isOptedOut = (await AsyncStorage.getItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG)) === 'true';
        if (isOptedOut) return;

        const previousStatus = lastKnownPermissionStatus || permissionStatusRef.current;
        const newStatus = await checkNotificationPermissionStatus();
        permissionStatusRef.current = newStatus;
        lastKnownPermissionStatus = newStatus;

        if (previousStatus !== 'granted' && newStatus === 'granted') {
          if (!pendingPermissionRecovery) {
            pendingPermissionRecovery = initializeNotifications((payload?: TPayload) => onProcessRef.current?.(payload)).finally(() => {
              pendingPermissionRecovery = null;
            });
          }
          await pendingPermissionRecovery;
        }
      } catch (error) {
        console.error('useNotifications: appState handler error:', error);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [enabled]); // handler reads refs; only attach while notifications are enabled
};

export default useNotifications;
