import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter, Platform } from 'react-native';
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
const ANDROID_NOTIFICATION_CHANNEL_ID = 'channel_01';
export const NOTIFICATIONS_NO_AND_DONT_ASK_FLAG = 'NOTIFICATIONS_NO_AND_DONT_ASK_FLAG';
let baseURI = groundControlUri;
let onProcessNotificationsHandler: undefined | ((payload?: TPayload) => void | Promise<void>);
let pendingOpenedNotification: TPayload | null = null;
let notificationEventsRegistered = false;
let remoteRegistrationRequested = false;
let remoteRegistrationCompleted = false;
let remoteRegistrationResult = false;

/**
 * Emitted via DeviceEventEmitter when the user taps a notification.
 * Subscribe to this in the React Navigation linking `subscribe` function.
 */
export const NOTIFICATION_OPENED_EVENT = 'bluewallet:notificationOpened' as const;

/**
 * Eagerly captured at module-load time so the native cold-boot notification
 * is not consumed by the OS before configureNotifications() runs (after
 * wallets have loaded from disk).  Per react-native-notifications docs,
 * getInitialNotification() resolves to the Notification that launched the
 * app, or undefined otherwise.
 */
let pendingInitialNotification: TNotificationSource | null = null;
const pendingInitialNotificationPromise: Promise<TNotificationSource | null> =
  typeof Notifications?.getInitialNotification === 'function'
    ? Notifications.getInitialNotification()
        .then(notification => {
          pendingInitialNotification = notification ?? null;
          return pendingInitialNotification;
        })
        .catch(() => null)
    : Promise.resolve(null);

const getInitialNotificationWithRetry = async (attempts = 5, delayMs = 250): Promise<TNotificationSource | null> => {
  let notification = pendingInitialNotification ?? (await pendingInitialNotificationPromise);
  if (notification) {
    return notification;
  }

  if (typeof Notifications?.getInitialNotification !== 'function') {
    return null;
  }

  // On RN bridgeless startup, the first JS call can race with the native bridge
  // setting `launchOptions`. Retry briefly so cold-start notification taps are not missed.
  for (let attempt = 0; attempt < attempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, delayMs));
    try {
      notification = (await Notifications.getInitialNotification()) ?? null;
      if (notification) {
        pendingInitialNotification = notification;
        return notification;
      }
    } catch {
      // Ignore retry failures and keep polling for the remaining attempts.
    }
  }

  return null;
};

export const setProcessNotificationsHandler = (handler: (payload?: TPayload) => void | Promise<void>) => {
  onProcessNotificationsHandler = handler;
};

/**
 * Function reference populated by `useNotifications` on mount.
 * Allows `tryToObtainPermissions` — which is called from UI screens that
 * have no hook context — to trigger the notifications configuration pipeline.
 */
let _configureNotificationsRef: (() => Promise<boolean>) | null = null;

/** Called by `useNotifications` to inject its `configureNotifications` fn. */
export const _setConfigureNotificationsFn = (fn: (() => Promise<boolean>) | null) => {
  _configureNotificationsRef = fn;
};

const handledNotificationKeys = new Set<string>();
let pendingRegistrationPromise: Promise<boolean> | null = null;
let pendingRegistrationResolve: ((value: boolean) => void) | null = null;
let pendingRegistrationTimeout: ReturnType<typeof setTimeout> | undefined;

type TPushToken = {
  token: string;
  os: 'ios' | 'android';
};

type TNotificationSource = RNNotification | Record<string, any>;

/** Notification types per GroundControl swagger PushNotificationBase */
export type TNotificationType = 1 | 2 | 3 | 4 | 5;

/**
 * Processed push notification payload. Fields map directly to the GroundControl
 * swagger schema; type-specific fields are optional:
 *   type 1 (LN invoice paid)       → sat, hash, memo
 *   type 2 (address got paid)       → address, sat, txid
 *   type 3 (address unconfirmed tx) → address, sat, txid
 *   type 4 (txid confirmed)         → txid
 *   type 5 (text message)           → text
 */
export type TPayload = {
  // Base fields (swagger PushNotificationBase)
  type: TNotificationType;
  badge?: number;
  level?: string;
  // Type 1: lightning invoice paid
  hash?: string;
  sat?: number;
  memo?: string;
  // Types 2 & 3: onchain address activity
  address?: string;
  // Types 2, 3, 4: transaction ID
  txid?: string;
  // Type 5: arbitrary text message
  text?: string;
  // App-side display fields (populated by normalizeNotificationPayload)
  title?: string;
  subText?: string;
  message?: string | object;
  identifier?: string;
  // App-side delivery context
  foreground: boolean;
  userInteraction: boolean;
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
  remoteRegistrationCompleted = true;
  remoteRegistrationResult = value;

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

export const consumePendingOpenedNotification = (): TPayload | null => {
  const payload = pendingOpenedNotification;
  pendingOpenedNotification = null;
  return payload;
};

/**
 * Returns a promise that resolves once the device has received (or failed to
 * receive) a remote-notifications registration token.  Callers must have
 * already registered the relevant event handlers before invoking this, and
 * must separately call `Notifications.registerRemoteNotifications()`.
 */
const waitForRemoteRegistration = (timeoutMs = 10_000): Promise<boolean> => {
  if (pendingRegistrationPromise) return pendingRegistrationPromise;
  pendingRegistrationPromise = new Promise<boolean>(resolve => {
    pendingRegistrationResolve = resolve;
    pendingRegistrationTimeout = setTimeout(() => {
      settlePendingRegistration(false);
    }, timeoutMs);
  });
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

const ensureNotificationEventSubscriptions = () => {
  if (notificationEventsRegistered) {
    return;
  }

  notificationEventsRegistered = true;

  Notifications.events().registerRemoteNotificationsRegistered(async event => {
    console.log('processing event', event);
    const token = createPushToken(event.deviceToken);
    if (__DEV__) {
      console.log('configureNotifications: Token received:', token);
    }
    await _setPushToken(token);
    await postTokenConfig().catch(error => console.error('Failed to post token configuration:', error));
    settlePendingRegistration(true);
  });

  Notifications.events().registerRemoteNotificationsRegistrationFailed(error => {
    console.error('Registration error:', error);
    settlePendingRegistration(false);
  });

  Notifications.events().registerRemoteNotificationsRegistrationDenied(() => {
    console.log('Remote notification registration denied');
    settlePendingRegistration(false);
  });

  Notifications.events().registerNotificationReceivedForeground(async (notification, completion) => {
    await storeIncomingNotification(notification, { foreground: true, userInteraction: false }, completion);
  });

  Notifications.events().registerNotificationReceivedBackground(async (notification, completion) => {
    await storeIncomingNotification(notification, { foreground: false, userInteraction: false }, completion);
  });

  Notifications.events().registerNotificationOpened(async (notification, completion) => {
    try {
      await storeIncomingNotification(notification, { foreground: false, userInteraction: true });
    } finally {
      completion();
    }
  });
};

try {
  ensureNotificationEventSubscriptions();
} catch (error) {
  console.warn('Failed to eagerly register notification event subscriptions:', error);
}

const getNotificationKey = (payload: Partial<TPayload>, notification?: TNotificationSource) => {
  // NOTE: 'message' is intentionally excluded — it can differ between getInitialNotification()
  // and registerNotificationOpened() for the same notification (one path uses a flat launch
  // userInfo dict, the other a wrapped Notification instance), which would break deduplication.
  const notificationRecord = notification && typeof notification === 'object' ? (notification as Record<string, any>) : undefined;

  return JSON.stringify({
    identifier: notificationRecord?.identifier ?? payload.identifier ?? '',
    type: payload.type ?? '',
    hash: payload.hash ?? '',
    txid: payload.txid ?? '',
    address: payload.address ?? '',
    foreground: payload.foreground ?? false,
    userInteraction: payload.userInteraction ?? false,
  });
};

const markNotificationHandled = (key: string) => {
  handledNotificationKeys.add(key);
  if (handledNotificationKeys.size > 100) {
    const oldestKey = handledNotificationKeys.values().next().value;
    if (oldestKey) handledNotificationKeys.delete(oldestKey);
  }
};

const normalizeNotificationPayload = (
  notification: TNotificationSource,
  status: Pick<TPayload, 'foreground' | 'userInteraction'>,
): TPayload => {
  const source =
    notification && typeof notification === 'object' ? (deepClone(notification as Record<string, any>) as Record<string, any>) : {};

  // Warm path (`registerNotificationOpened`) provides a Notification instance whose
  // custom payload is under `.payload`. Cold boot (`getInitialNotification`) returns
  // the raw launch userInfo dictionary directly. Support both shapes.
  const baseNotification =
    source.payload && typeof source.payload === 'object'
      ? { ...source, payload: deepClone(source.payload) }
      : source.notification && typeof source.notification === 'object'
        ? (deepClone(source.notification) as Record<string, any>)
        : source;

  const rawPayload =
    baseNotification.payload && typeof baseNotification.payload === 'object'
      ? (baseNotification.payload as Record<string, any>)
      : baseNotification;
  const nestedPayload = rawPayload.data && typeof rawPayload.data === 'object' ? rawPayload.data : {};
  const nestedData = nestedPayload.data && typeof nestedPayload.data === 'object' ? nestedPayload.data : {};
  const apsAlert = rawPayload.aps?.alert && typeof rawPayload.aps.alert === 'object' ? rawPayload.aps.alert : {};
  const title = baseNotification.title ?? rawPayload.title ?? apsAlert.title;
  const body = baseNotification.body ?? rawPayload.body ?? apsAlert.body;

  const payload: TPayload = {
    ...rawPayload,
    ...nestedPayload,
    ...nestedData,
    title,
    subText: rawPayload.subText ?? rawPayload.subtitle ?? title,
    message: rawPayload.message ?? body,
    identifier: baseNotification.identifier ?? source.identifier,
    foreground: status.foreground,
    userInteraction: status.userInteraction,
  } as TPayload;

  delete payload.data;
  return payload;
};

const storeIncomingNotification = async (
  notification: TNotificationSource,
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

    if (payload.userInteraction) {
      pendingOpenedNotification = payload;
      DeviceEventEmitter.emit(NOTIFICATION_OPENED_EVENT, payload);
    }

    if ((payload.foreground || payload.userInteraction) && onProcessNotificationsHandler) {
      await onProcessNotificationsHandler(payload);
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
    if (_configureNotificationsRef) {
      return _configureNotificationsRef();
    }
    return false;
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
 * Call order follows the library docs:
 *   1. Register event handlers (registerRemoteNotificationsRegistered, etc.)
 *   2. Call registerRemoteNotifications() to trigger token flow
 *   3. Handle the cold-boot notification (app launched via tap) if present
 *
 * @returns {Promise<boolean>} whether successfully registered for remote push notifications
 */
export const configureNotifications = async (onProcessNotifications?: (payload?: TPayload) => void): Promise<boolean> => {
  console.log('configureNotifications()');
  if (onProcessNotifications) {
    onProcessNotificationsHandler = onProcessNotifications;
  }

  ensureNotificationEventSubscriptions();

  try {
    const { status } = await checkNotifications();
    if (status !== RESULTS.GRANTED) {
      console.log('configureNotifications: Permissions not granted');
      return false;
    }

    ensureAndroidNotificationChannel();

    // Step 2: Request the push token once. Event subscriptions are already in place,
    // so any cold-start notification-open event can be buffered even before React
    // Navigation finishes attaching its listener.
    const registrationPromise = remoteRegistrationCompleted ? Promise.resolve(remoteRegistrationResult) : waitForRemoteRegistration();
    if (!remoteRegistrationRequested) {
      remoteRegistrationRequested = true;
      Notifications.registerRemoteNotifications();
    }

    // Step 3: Handle cold-boot (app was launched by the user tapping a notification).
    // On bridgeless startup, launchOptions can become visible slightly after the first JS
    // call to getInitialNotification(). Retry briefly so the launch notification is still
    // picked up even if the initial eager read raced the bridge initialization.
    const initialNotification = await getInitialNotificationWithRetry();
    console.log('configureNotifications: initial notification present:', !!initialNotification);
    if (initialNotification) {
      pendingInitialNotification = null;
      await storeIncomingNotification(initialNotification, { foreground: false, userInteraction: true });
    }

    return await registrationPromise;
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

export const getDeliveredNotifications = async (): Promise<TPayload[]> => {
  if (Platform.OS !== 'ios') {
    return [];
  }

  // iOS delivered notifications come back as a flat native dict where `content.userInfo`
  // fields are merged into the root via `addEntriesFromDictionary`. Our GroundControl data
  // lives under the `data` key (or at the root), NOT under `notification.payload.data` as
  // `normalizeNotificationPayload` would expect. Extract only the fields we actually need.
  try {
    const notifications: any[] = await Notifications.ios.getDeliveredNotifications();
    return notifications
      .map((n: any) => {
        const data: Record<string, any> = n.data && typeof n.data === 'object' ? n.data : {};
        return {
          type: data.type ?? n.type,
          hash: data.hash ?? n.hash,
          sat: data.sat ?? n.sat,
          address: data.address ?? n.address,
          txid: data.txid ?? n.txid,
          text: data.text ?? n.text,
          foreground: true,
          userInteraction: false,
        } as TPayload;
      })
      .filter(payload => payload.type != null || !!payload.address || !!payload.hash || !!payload.txid || !!payload.text);
  } catch (error) {
    console.error('Error getting delivered notifications:', error);
    return [];
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
    const currentPermissionStatus = await checkNotificationPermissionStatus();
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
