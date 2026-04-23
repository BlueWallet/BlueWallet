import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus, EmitterSubscription, Platform } from 'react-native';
import { getApplicationName, getSystemName, getSystemVersion, getVersion, hasGmsSync, hasHmsSync } from 'react-native-device-info';
import {
  Notification as RNNotification,
  NotificationBackgroundFetchResult,
  NotificationCompletion,
  Notifications,
} from 'react-native-notifications';
import { checkNotifications, requestNotifications, RESULTS } from 'react-native-permissions';
import loc from '../loc';
import { groundControlUri } from './constants';
import { fetch } from '../util/fetch';

const PUSH_TOKEN = 'PUSH_TOKEN';
const GROUNDCONTROL_BASE_URI = 'GROUNDCONTROL_BASE_URI';
const NOTIFICATIONS_STORAGE = 'NOTIFICATIONS_STORAGE';
const ANDROID_NOTIFICATION_CHANNEL_ID = 'channel_01';
export const NOTIFICATIONS_NO_AND_DONT_ASK_FLAG = 'NOTIFICATIONS_NO_AND_DONT_ASK_FLAG';
let baseURI = groundControlUri;
let notificationSubscriptions: EmitterSubscription[] = [];
let onProcessNotificationsHandler: undefined | (() => void | Promise<void>);
const handledNotificationKeys = new Set<string>();
let pendingRegistrationPromise: Promise<boolean> | null = null;
let pendingRegistrationResolve: ((value: boolean) => void) | null = null;
let pendingRegistrationTimeout: ReturnType<typeof setTimeout> | undefined;

type TPushToken = {
  token: string;
  os: 'ios' | 'android';
};

type TPayload = {
  subText?: string;
  title?: string;
  identifier?: string;
  message?: string | object;
  foreground: boolean;
  userInteraction: boolean;
  address: string;
  txid: string;
  type: number;
  hash: string;
  [key: string]: any;
};

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

const createPushToken = (deviceToken: string): TPushToken => ({
  token: deviceToken,
  os: Platform.OS as TPushToken['os'],
});

const settlePendingRegistration = (value: boolean) => {
  if (!pendingRegistrationResolve) return;
  const resolve = pendingRegistrationResolve;
  pendingRegistrationResolve = null;
  pendingRegistrationPromise = null;
  if (pendingRegistrationTimeout) {
    clearTimeout(pendingRegistrationTimeout);
    pendingRegistrationTimeout = undefined;
  }
  resolve(value);
};

const waitForRemoteRegistration = (timeoutMs = 10_000): Promise<boolean> => {
  if (pendingRegistrationPromise) return pendingRegistrationPromise;
  pendingRegistrationPromise = new Promise<boolean>(resolve => {
    pendingRegistrationResolve = resolve;
    pendingRegistrationTimeout = setTimeout(() => {
      settlePendingRegistration(false);
    }, timeoutMs);
  });
  Notifications.registerRemoteNotifications();
  return pendingRegistrationPromise;
};

const ensureAndroidNotificationChannel = () => {
  if (Platform.OS !== 'android') return;

  Notifications.setNotificationChannel({
    channelId: ANDROID_NOTIFICATION_CHANNEL_ID,
    name: 'BlueWallet notifications',
    description: 'Notifications about incoming payments',
    importance: 4,
    enableVibration: true,
    showBadge: true,
  });
};

const getNotificationKey = (payload: Partial<TPayload>, notification?: RNNotification) => {
  return JSON.stringify({
    identifier: notification?.identifier ?? payload.identifier ?? '',
    type: payload.type ?? '',
    hash: payload.hash ?? '',
    txid: payload.txid ?? '',
    address: payload.address ?? '',
    message: payload.message ?? '',
  });
};

const markNotificationHandled = (key: string) => {
  handledNotificationKeys.add(key);
  if (handledNotificationKeys.size > 100) {
    const oldestKey = handledNotificationKeys.values().next().value;
    if (oldestKey) handledNotificationKeys.delete(oldestKey);
  }
};

const normalizeNotificationPayload = (notification: RNNotification, status: Pick<TPayload, 'foreground' | 'userInteraction'>): TPayload => {
  const rawPayload =
    notification.payload && typeof notification.payload === 'object' ? (deepClone(notification.payload) as Record<string, any>) : {};
  const nestedPayload = rawPayload.data && typeof rawPayload.data === 'object' ? rawPayload.data : {};
  const nestedData = nestedPayload.data && typeof nestedPayload.data === 'object' ? nestedPayload.data : {};

  const payload: TPayload = {
    ...rawPayload,
    ...nestedPayload,
    ...nestedData,
    title: notification.title ?? rawPayload.title,
    subText: rawPayload.subText ?? rawPayload.subtitle ?? notification.title,
    message: rawPayload.message ?? notification.body,
    identifier: notification.identifier,
    foreground: status.foreground,
    userInteraction: status.userInteraction,
  } as TPayload;

  delete payload.data;
  return payload;
};

const storeIncomingNotification = async (
  notification: RNNotification,
  status: Pick<TPayload, 'foreground' | 'userInteraction'>,
  completion?: ((response: NotificationCompletion) => void) | ((response: NotificationBackgroundFetchResult) => void),
) => {
  try {
    const payload = normalizeNotificationPayload(notification, status);
    const notificationKey = getNotificationKey(payload, notification);
    if (handledNotificationKeys.has(notificationKey)) {
      return;
    }
    markNotificationHandled(notificationKey);

    if (!payload.subText && !payload.message) {
      console.warn('Notification missing required fields:', payload);
      return;
    }

    await addNotification(payload);

    if (payload.foreground && onProcessNotificationsHandler) {
      await onProcessNotificationsHandler();
    }
  } catch (error) {
    console.error('Failed to store incoming notification:', error);
  } finally {
    if (completion) {
      if (status.foreground) {
        (completion as (response: NotificationCompletion) => void)({ alert: false, sound: false, badge: false });
      } else {
        (completion as (response: NotificationBackgroundFetchResult) => void)(NotificationBackgroundFetchResult.NO_DATA);
      }
    }
  }
};

const checkAndroidNotificationPermission = async () => {
  try {
    const { status } = await checkNotifications();
    console.log('Notification permission check:', status);
    return status === RESULTS.GRANTED;
  } catch (err) {
    console.error('Failed to check notification permission:', err);
    return false;
  }
};

export const checkNotificationPermissionStatus = async () => {
  try {
    const { status } = await checkNotifications();
    return status;
  } catch (error) {
    console.error('Failed to check notification permissions:', error);
    return 'unavailable'; // Return 'unavailable' if the status cannot be retrieved
  }
};

// Listener to monitor notification permission status changes while app is running
let currentPermissionStatus = 'unavailable';
const handleAppStateChange = async (nextAppState: AppStateStatus) => {
  try {
    if (nextAppState === 'active') {
      const isDisabledByUser = (await AsyncStorage.getItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG)) === 'true';
      if (!isDisabledByUser) {
        const newPermissionStatus = await checkNotificationPermissionStatus();
        if (newPermissionStatus !== currentPermissionStatus) {
          currentPermissionStatus = newPermissionStatus;
          if (newPermissionStatus === 'granted') {
            await initializeNotifications();
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed handling app state notification refresh:', error);
  }
};

AppState.addEventListener('change', handleAppStateChange);

export const cleanUserOptOutFlag = async () => {
  return AsyncStorage.removeItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG);
};

/**
 * Should be called when user is most interested in receiving push notifications.
 * If we dont have a token it will show alert asking whether
 * user wants to receive notifications, and if yes - will configure push notifications.
 *
 * @returns {Promise<boolean>} TRUE if permissions were obtained, FALSE otherwise
 */
export const tryToObtainPermissions = async (): Promise<boolean> => {
  console.log('tryToObtainPermissions: Starting user-triggered permission request');

  if (!isNotificationsCapable) {
    console.log('tryToObtainPermissions: Device not capable');
    return false;
  }

  try {
    const rationale = {
      title: loc.settings.notifications,
      message: loc.notifications.would_you_like_to_receive_notifications,
      buttonPositive: loc._.ok,
      buttonNegative: loc.notifications.no_and_dont_ask,
    };

    const { status } = await requestNotifications(
      ['alert', 'sound', 'badge'],
      Platform.OS === 'android' && Platform.Version < 33 ? rationale : undefined,
    );
    if (status !== RESULTS.GRANTED) {
      console.log('tryToObtainPermissions: Permission denied');
      return false;
    }
    return configureNotifications();
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};
/**
 * Submits onchain bitcoin addresses and ln invoice preimage hashes to GroundControl server, so later we could
 * be notified if they were paid
 *
 * @param addresses {string[]}
 * @param hashes {string[]}
 * @param txids {string[]}
 * @returns {Promise<object>} Response object from API rest call
 */
export const majorTomToGroundControl = async (addresses: string[], hashes: string[], txids: string[]) => {
  console.log('majorTomToGroundControl: Starting notification registration', {
    addressCount: addresses?.length,
    hashCount: hashes?.length,
    txidCount: txids?.length,
  });

  try {
    const noAndDontAskFlag = await AsyncStorage.getItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG);
    if (noAndDontAskFlag === 'true') {
      console.warn('User has opted out of notifications.');
      return;
    }

    if (!Array.isArray(addresses) || !Array.isArray(hashes) || !Array.isArray(txids)) {
      throw new Error('No addresses, hashes, or txids provided');
    }

    const pushToken = await getPushToken();
    console.log('majorTomToGroundControl: Retrieved push token:', !!pushToken);
    if (!pushToken || !pushToken.token || !pushToken.os) {
      return;
    }

    const requestBody = JSON.stringify({
      addresses,
      hashes,
      txids,
      token: pushToken.token,
      os: pushToken.os,
    });

    let response;
    try {
      console.log('majorTomToGroundControl: Sending request to:', `${baseURI}/majorTomToGroundControl`);
      response = await fetch(`${baseURI}/majorTomToGroundControl`, {
        method: 'POST',
        headers: _getHeaders(),
        body: requestBody,
      });
    } catch (networkError) {
      console.error('Network request failed:', networkError);
      throw networkError;
    }

    if (!response.ok) {
      throw new Error(`Ground Control request failed with status ${response.status}: ${response.statusText}`);
    }

    const responseText = await response.text();
    if (responseText) {
      try {
        return JSON.parse(responseText);
      } catch (jsonError) {
        console.error('Error parsing response JSON:', jsonError);
        throw jsonError;
      }
    } else {
      return {}; // Return an empty object if there is no response body
    }
  } catch (error) {
    console.error('Error in majorTomToGroundControl:', error);
    throw error;
  }
};

/**
 * Returns a permissions object:
 * alert: boolean
 * badge: boolean
 * sound: boolean
 *
 * @returns {Promise<Object>}
 */
export const checkPermissions = async () => {
  try {
    if (Platform.OS === 'ios') {
      return Notifications.ios.checkPermissions();
    }

    const { status } = await checkNotifications();
    const granted = status === RESULTS.GRANTED;
    return {
      alert: granted,
      badge: granted,
      sound: granted,
      status,
    };
  } catch (error) {
    console.error('Error checking permissions:', error);
    throw error;
  }
};

/**
 * Posts to groundcontrol info whether we want to opt in or out of specific notifications level
 *
 * @param levelAll {Boolean}
 * @returns {Promise<*>}
 */
export const setLevels = async (levelAll: boolean) => {
  const pushToken = await getPushToken();
  if (!pushToken || !pushToken.token || !pushToken.os) return;

  try {
    const response = await fetch(`${baseURI}/setTokenConfiguration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        level_all: !!levelAll,
        token: pushToken.token,
        os: pushToken.os,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to set token configuration: ' + response.statusText);
    }

    if (!levelAll) {
      console.log('Disabling notifications as user opted out...');
      Notifications.removeAllDeliveredNotifications();
      if (Platform.OS === 'ios') {
        Notifications.ios.setBadgeCount(0);
        Notifications.ios.cancelAllLocalNotifications();
      }
      await AsyncStorage.setItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG, 'true');
      console.log('Notifications disabled successfully');
    } else {
      await AsyncStorage.removeItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG); // Clear flag when enabling
    }
  } catch (error) {
    console.error('Error setting notification levels:', error);
  }
};

export const addNotification = async (notification: TPayload) => {
  let notifications = [];
  try {
    const stringified = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE);
    notifications = JSON.parse(String(stringified));
    if (!Array.isArray(notifications)) notifications = [];
  } catch (e) {
    console.error(e);
    // Start fresh with just the new notification
    notifications = [];
  }

  notifications.push(notification);
  await AsyncStorage.setItem(NOTIFICATIONS_STORAGE, JSON.stringify(notifications));
};

const postTokenConfig = async () => {
  console.log('postTokenConfig: Starting token configuration');
  const pushToken = await getPushToken();
  console.log('postTokenConfig: Retrieved push token:', !!pushToken);

  if (!pushToken || !pushToken.token || !pushToken.os) {
    console.log('postTokenConfig: Invalid token or missing OS info');
    return;
  }

  try {
    const lang = (await AsyncStorage.getItem('lang')) || 'en';
    const appVersion = getSystemName() + ' ' + getSystemVersion() + ';' + getApplicationName() + ' ' + getVersion();
    console.log('postTokenConfig: Posting configuration', { lang, appVersion });

    await fetch(`${baseURI}/setTokenConfiguration`, {
      method: 'POST',
      headers: _getHeaders(),
      body: JSON.stringify({
        token: pushToken.token,
        os: pushToken.os,
        lang,
        app_version: appVersion,
      }),
    });
  } catch (e) {
    console.error(e);
    await AsyncStorage.setItem('lang', 'en');
    throw e;
  }
};

const _setPushToken = async (token: TPushToken) => {
  try {
    return await AsyncStorage.setItem(PUSH_TOKEN, JSON.stringify(token));
  } catch (error) {
    console.error('Error setting push token:', error);
    throw error;
  }
};

/**
 * Configures notifications. For Android, it will show a native rationale prompt if necessary.
 *
 * @returns {Promise<boolean>} whether successfully registered for remote push notifications
 */
const configureNotifications = async (onProcessNotifications?: () => void): Promise<boolean> => {
  console.log('configureNotifications()');
  if (onProcessNotifications) {
    onProcessNotificationsHandler = onProcessNotifications;
  }

  try {
    const { status } = await checkNotifications();
    if (status !== RESULTS.GRANTED) {
      console.log('configureNotifications: Permissions not granted');
      return false;
    }

    ensureAndroidNotificationChannel();

    if (notificationSubscriptions.length === 0) {
      notificationSubscriptions = [
        Notifications.events().registerRemoteNotificationsRegistered(async event => {
          console.log('processing event', event);
          const token = createPushToken(event.deviceToken);
          if (__DEV__) {
            console.log('configureNotifications: Token received:', token);
          }
          await _setPushToken(token);
          await postTokenConfig().catch(error => console.error('Failed to post token configuration:', error));
          settlePendingRegistration(true);
        }),
        Notifications.events().registerRemoteNotificationsRegistrationFailed(error => {
          console.error('Registration error:', error);
          settlePendingRegistration(false);
        }),
        Notifications.events().registerRemoteNotificationsRegistrationDenied(() => {
          console.log('Remote notification registration denied');
          settlePendingRegistration(false);
        }),
        Notifications.events().registerNotificationReceivedForeground(async (notification, completion) => {
          await storeIncomingNotification(notification, { foreground: true, userInteraction: false }, completion);
        }),
        Notifications.events().registerNotificationReceivedBackground(async (notification, completion) => {
          await storeIncomingNotification(notification, { foreground: false, userInteraction: false }, completion);
        }),
        Notifications.events().registerNotificationOpened(async (notification, completion) => {
          try {
            await storeIncomingNotification(notification, { foreground: false, userInteraction: true });
          } finally {
            completion();
          }
        }),
      ];
    }

    Notifications.getInitialNotification()
      .then(async initialNotification => {
        if (initialNotification) {
          console.log('App was launched by a push notification:', initialNotification);
          await storeIncomingNotification(initialNotification, { foreground: false, userInteraction: true });
        }
      })
      .catch(error => console.error('Failed to retrieve initial notification:', error));

    // waiting and returning actual result of remote pushes registration: success or failure
    return await waitForRemoteRegistration();
  } catch (error) {
    console.error('Error in configureNotifications:', error);
    return false;
  }
};

/**
 * Validates whether the provided GroundControl URI is valid by pinging it.
 *
 * @param uri {string}
 * @returns {Promise<boolean>} TRUE if valid, FALSE otherwise
 */
export const isGroundControlUriValid = async (uri: string) => {
  try {
    const response = await fetch(`${uri}/ping`, { headers: _getHeaders() });
    const json = await response.json();
    return !!json.description;
  } catch (_) {
    return false;
  }
};

export const isNotificationsCapable = hasGmsSync() || hasHmsSync() || Platform.OS !== 'android';

export const getPushToken = async (): Promise<TPushToken> => {
  try {
    const token = await AsyncStorage.getItem(PUSH_TOKEN);
    return JSON.parse(String(token)) as TPushToken;
  } catch (e) {
    console.error(e);
    AsyncStorage.removeItem(PUSH_TOKEN);
    throw e;
  }
};

/**
 * Queries groundcontrol for token configuration, which contains subscriptions to notification levels
 *
 * @returns {Promise<{}|*>}
 */
const getLevels = async () => {
  const pushToken = await getPushToken();
  if (!pushToken || !pushToken.token || !pushToken.os) return;

  try {
    const response = await fetch(`${baseURI}/getTokenConfiguration`, {
      method: 'POST',
      headers: _getHeaders(),
      body: JSON.stringify({
        token: pushToken.token,
        os: pushToken.os,
      }),
    });

    if (!response) return {};
    return await response.json();
  } catch (_) {
    return {};
  }
};

/**
 * The opposite of `majorTomToGroundControl` call.
 *
 * @param addresses {string[]}
 * @param hashes {string[]}
 * @param txids {string[]}
 * @returns {Promise<object>} Response object from API rest call
 */
export const unsubscribe = async (addresses: string[], hashes: string[], txids: string[]) => {
  if (!Array.isArray(addresses) || !Array.isArray(hashes) || !Array.isArray(txids)) {
    throw new Error('No addresses, hashes, or txids provided');
  }

  const token = await getPushToken();
  if (!token?.token || !token?.os) {
    console.error('No push token or OS found');
    return;
  }

  const body = JSON.stringify({
    addresses,
    hashes,
    txids,
    token: token.token,
    os: token.os,
  });

  try {
    const response = await fetch(`${baseURI}/unsubscribe`, {
      method: 'POST',
      headers: _getHeaders(),
      body,
    });

    if (!response.ok) {
      console.error('Failed to unsubscribe:', response.statusText);
      return;
    }

    return response;
  } catch (error) {
    console.error('Error during unsubscribe:', error);
    throw error;
  }
};

const _getHeaders = () => {
  return {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };
};

export const clearStoredNotifications = async () => {
  try {
    await AsyncStorage.setItem(NOTIFICATIONS_STORAGE, JSON.stringify([]));
  } catch (_) {}
};

export const getDeliveredNotifications: () => Promise<Record<string, any>[]> = () => {
  try {
    if (Platform.OS !== 'ios') {
      return Promise.resolve([]);
    }

    return Notifications.ios
      .getDeliveredNotifications()
      .then(notifications =>
        notifications.map(notification => normalizeNotificationPayload(notification, { foreground: true, userInteraction: false })),
      );
  } catch (error) {
    console.error('Error getting delivered notifications:', error);
    throw error;
  }
};

export const removeDeliveredNotifications = (identifiers = []) => {
  if (Platform.OS === 'ios') {
    Notifications.ios.removeDeliveredNotifications(identifiers);
  }
};

export const setApplicationIconBadgeNumber = (badges: number) => {
  if (Platform.OS === 'ios') {
    Notifications.ios.setBadgeCount(badges);
  }
};

export const removeAllDeliveredNotifications = () => {
  Notifications.removeAllDeliveredNotifications();
};

export const getDefaultUri = () => {
  return groundControlUri;
};

export const saveUri = async (uri: string) => {
  try {
    baseURI = uri || groundControlUri;
    await AsyncStorage.setItem(GROUNDCONTROL_BASE_URI, baseURI);
  } catch (error) {
    console.error('Error saving URI:', error);
    throw error;
  }
};

export const getSavedUri = async () => {
  try {
    const baseUriStored = await AsyncStorage.getItem(GROUNDCONTROL_BASE_URI);
    if (baseUriStored) {
      baseURI = baseUriStored;
    }
    return baseUriStored;
  } catch (e) {
    console.error(e);
    try {
      await AsyncStorage.setItem(GROUNDCONTROL_BASE_URI, groundControlUri);
    } catch (storageError) {
      console.error('Failed to reset URI:', storageError);
    }
    throw e;
  }
};

export const isNotificationsEnabled = async () => {
  try {
    const levels = await getLevels();
    const token = await getPushToken();
    const isDisabledByUser = (await AsyncStorage.getItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG)) === 'true';

    // Return true only if we have all requirements and user hasn't opted out
    return !isDisabledByUser && !!token && !!levels.level_all;
  } catch (error) {
    console.log('Error checking notification levels:', error);
    if (error instanceof SyntaxError) {
      throw error;
    }
    return false;
  }
};

export const getStoredNotifications = async (): Promise<TPayload[]> => {
  let notifications = [];
  try {
    notifications = JSON.parse(String(await AsyncStorage.getItem(NOTIFICATIONS_STORAGE)));
    if (!Array.isArray(notifications)) notifications = [];
  } catch (e) {
    if (e instanceof SyntaxError) {
      console.error('Invalid notifications format:', e);
      notifications = [];
      await AsyncStorage.setItem(NOTIFICATIONS_STORAGE, '[]');
    } else {
      console.error('Error accessing notifications:', e);
      throw e;
    }
  }

  return notifications;
};

// on app launch (load module):
export const initializeNotifications = async (onProcessNotifications?: () => void) => {
  console.log('initializeNotifications: Starting initialization');

  try {
    const noAndDontAskFlag = await AsyncStorage.getItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG);
    console.log('initializeNotifications: No ask flag status:', noAndDontAskFlag);

    if (noAndDontAskFlag === 'true') {
      console.warn('User has opted out of notifications.');
      return;
    }

    const baseUriStored = await AsyncStorage.getItem(GROUNDCONTROL_BASE_URI);
    baseURI = baseUriStored || groundControlUri;
    console.log('Base URI set to:', baseURI);

    setApplicationIconBadgeNumber(0);

    // Only check permissions, never request
    currentPermissionStatus = await checkNotificationPermissionStatus();
    console.log('initializeNotifications: Permission status:', currentPermissionStatus);

    // Handle Android 13+ permissions differently
    const canProceed =
      Platform.OS === 'android'
        ? isNotificationsCapable && (await checkAndroidNotificationPermission())
        : currentPermissionStatus === 'granted';

    if (canProceed) {
      console.log('initializeNotifications: Can proceed with notification setup');
      await configureNotifications(onProcessNotifications);
    } else {
      console.log('Notifications require user action to enable');
    }
  } catch (error) {
    console.error('Failed to initialize notifications:', error);
    baseURI = groundControlUri;
    await AsyncStorage.setItem(GROUNDCONTROL_BASE_URI, groundControlUri).catch(err => console.error('Failed to reset URI:', err));
  }
};
