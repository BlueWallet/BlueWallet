import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  _setConfigureNotificationsFn,
  checkNotificationPermissionStatus,
  configureNotifications,
  getDeliveredNotifications,
  initializeNotifications,
  NOTIFICATIONS_NO_AND_DONT_ASK_FLAG,
  removeAllDeliveredNotifications,
  setApplicationIconBadgeNumber,
  setProcessNotificationsHandler,
  type TPayload,
} from '../blue_modules/notifications';
import { useStorage } from './context/useStorage';

let hasBootstrappedNotifications = false;
let lastKnownPermissionStatus: string | null = null;
let pendingPermissionRecovery: Promise<void> | null = null;
let appStateSubscription: { remove: () => void } | null = null;

/**
 * Initialises react-native-notifications, processes incoming push payloads,
 * and re-fetches wallet transactions as needed.
 *
 * Mount once at the top of the component tree (MasterView).
 */
const useNotifications = () => {
  const { wallets, walletsInitialized, fetchAndSaveWalletTransactions, refreshAllWalletTransactions } = useStorage();
  const walletsRef = useRef(wallets);
  const fetchRef = useRef(fetchAndSaveWalletTransactions);
  const refreshRef = useRef(refreshAllWalletTransactions);

  useEffect(() => {
    walletsRef.current = wallets;
  }, [wallets]);
  useEffect(() => {
    fetchRef.current = fetchAndSaveWalletTransactions;
  }, [fetchAndSaveWalletTransactions]);
  useEffect(() => {
    refreshRef.current = refreshAllWalletTransactions;
  }, [refreshAllWalletTransactions]);

  const permissionStatusRef = useRef<string>('unavailable');

  const processNotifications = useCallback(async (payload?: TPayload) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    try {
      setApplicationIconBadgeNumber(0);

      const findWallet = (p: TPayload) => {
        switch (+p.type) {
          case 2:
          case 3:
            return walletsRef.current.find(w => p.address && w.weOwnAddress(p.address));
          case 1:
            return walletsRef.current.find(w => p.hash && w.weOwnTransaction(p.hash));
          case 4:
            return walletsRef.current.find(w => p.txid && w.weOwnTransaction(p.txid));
          default:
            return undefined;
        }
      };

      if (payload) {
        const wallet = findWallet(payload);
        if (wallet) {
          fetchRef.current(wallet.getID());
        }
      }

      const delivered = await getDeliveredNotifications();
      setTimeout(() => {
        try {
          removeAllDeliveredNotifications();
        } catch {}
      }, 5000);

      if (delivered.length > 0) {
        for (const d of delivered) {
          const wallet = findWallet(d);
          if (wallet) {
            fetchRef.current(wallet.getID());
          }
        }
        refreshRef.current();
      }
    } catch (error) {
      console.error('useNotifications: failed to process notifications:', error);
    }
  }, []);

  // ── Wire globals so non-hook code (tryToObtainPermissions) can trigger config
  useEffect(() => {
    if (!walletsInitialized) return;

    _setConfigureNotificationsFn(() => configureNotifications(processNotifications));
    setProcessNotificationsHandler(processNotifications);

    return () => {
      _setConfigureNotificationsFn(null);
      setProcessNotificationsHandler(undefined);
    };
  }, [walletsInitialized, processNotifications]);

  // ── Initialise once ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!walletsInitialized) return;

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
    initializeNotifications(processNotifications);
  }, [walletsInitialized, processNotifications]);

  // ── AppState: permission recovery + process delivered notifications ─────────
  useEffect(() => {
    if (!walletsInitialized) return;

    if (!appStateSubscription) {
      const handleAppStateChange = async (nextAppState: AppStateStatus) => {
        if (nextAppState !== 'active') return;
        try {
          const isOptedOut = (await AsyncStorage.getItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG)) === 'true';
          if (isOptedOut) return;

          const previousStatus = lastKnownPermissionStatus ?? permissionStatusRef.current;
          const newStatus = await checkNotificationPermissionStatus();
          permissionStatusRef.current = newStatus;
          lastKnownPermissionStatus = newStatus;

          if (previousStatus !== null && previousStatus !== 'granted' && newStatus === 'granted') {
            if (!pendingPermissionRecovery) {
              pendingPermissionRecovery = initializeNotifications(processNotifications).finally(() => {
                pendingPermissionRecovery = null;
              });
            }
            await pendingPermissionRecovery;
          }
        } catch (error) {
          console.error('useNotifications: appState handler error:', error);
        }
      };

      appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    }

    return () => {
      appStateSubscription?.remove();
      appStateSubscription = null;
    };
  }, [walletsInitialized, processNotifications]);
};

export default useNotifications;
