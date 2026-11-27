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
const GROUNDCONTROL_SUBSCRIPTIONS = 'GROUNDCONTROL_SUBSCRIPTIONS';
const ANDROID_NOTIFICATION_CHANNEL_ID = 'channel_01';
export const NOTIFICATIONS_NO_AND_DONT_ASK_FLAG = 'NOTIFICATIONS_NO_AND_DONT_ASK_FLAG';
let baseURI = groundControlUri;
let notificationSubscriptions: EmitterSubscription[] = [];
let onProcessNotificationsHandler: undefined | (() => void | Promise<void>);
const handledNotificationKeys = new Set<string>();
/** Pushes being written right now: a duplicate delivery meanwhile is ignored. */
const pendingNotificationKeys = new Set<string>();
let pendingRegistrationPromise: Promise<boolean> | null = null;
let pendingRegistrationResolve: ((value: boolean) => void) | null = null;
let pendingRegistrationTimeout: ReturnType<typeof setTimeout> | undefined;
// Set once if the underlying push SDK throws during initialization (typically:
// Firebase config file missing in dev builds). When true, every subsequent
// public call short-circuits to a no-op so the rest of the app keeps working.
let nativeDisabled = false;
// Inputs and state of `syncGroundControlSubscriptions`.
let serverInstance: TServerInstance | null = null;
let subscriptionEntries: TSubscriptionEntry[] | null = null;
let lastSyncedSubscriptions: string | null = null;
let subscriptionSyncRunning = false;
let subscriptionSyncRequested = false;

const disableNative = (reason: string, error?: unknown) => {
  if (!nativeDisabled) {
    nativeDisabled = true;
    console.warn(`Push notifications disabled (${reason}):`, error);
  }
};

type TPushToken = {
  token: string;
  os: 'ios' | 'android';
};

export type TNeuraiChain = 'mainnet' | 'testnet';

/** Addresses of one wallet, to keep subscribed on GroundControl. */
export type TSubscriptionEntry = { chain: TNeuraiChain; addresses: string[] };

/** The GroundControl database this device talks to: its `instance_id`, the server and the push token it was seen with. */
type TServerInstance = { id: string; uri: string; token: string };

/** Addresses this device registered on one GroundControl database, persisted so app starts only send what is new. */
type TRegisteredSubscriptions = { instanceId: string; uri: string; token: string; addresses: Record<TNeuraiChain, string[]> };

const NEURAI_CHAINS: TNeuraiChain[] = ['mainnet', 'testnet'];

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

/**
 * What may be logged about a push: its kind and how it arrived. Addresses,
 * txids, messages and the device token tie this phone to wallet activity, so
 * they never reach a log, also in development builds (H13).
 */
export function describeNotification(payload: Partial<TPayload> | null | undefined): Record<string, unknown> {
  if (!payload) return {};
  return {
    type: payload.type,
    chain: typeof payload.chain === 'string' ? payload.chain : undefined,
    foreground: payload.foreground,
    userInteraction: payload.userInteraction,
    hasTxid: Boolean(payload.txid),
    hasAddress: Boolean(payload.address),
  };
}

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
  try {
    Notifications.registerRemoteNotifications();
  } catch (e) {
    disableNative('registerRemoteNotifications threw', e);
    settlePendingRegistration(false);
  }
  return pendingRegistrationPromise;
};

const ensureAndroidNotificationChannel = () => {
  if (Platform.OS !== 'android') return;
  try {
    Notifications.setNotificationChannel({
      channelId: ANDROID_NOTIFICATION_CHANNEL_ID,
      name: 'NeuraiWallet notifications',
      description: 'Notifications about incoming payments',
      importance: 4,
      enableVibration: true,
      showBadge: true,
    });
  } catch (e) {
    disableNative('setNotificationChannel threw', e);
  }
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

export const storeIncomingNotification = async (
  notification: RNNotification,
  status: Pick<TPayload, 'foreground' | 'userInteraction'>,
  completion?: ((response: NotificationCompletion) => void) | ((response: NotificationBackgroundFetchResult) => void),
) => {
  try {
    const payload = normalizeNotificationPayload(notification, status);
    const notificationKey = getNotificationKey(payload, notification);
    if (handledNotificationKeys.has(notificationKey) || pendingNotificationKeys.has(notificationKey)) {
      return;
    }

    if (!payload.subText && !payload.message) {
      markNotificationHandled(notificationKey);
      console.warn('Notification missing required fields:', describeNotification(payload));
      return;
    }

    // Marked handled only once it is persisted: a failed write leaves the
    // push deliverable again instead of silently dropping it (H20).
    pendingNotificationKeys.add(notificationKey);
    try {
      await addNotification(payload);
      markNotificationHandled(notificationKey);
    } finally {
      pendingNotificationKeys.delete(notificationKey);
    }

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
  if (nativeDisabled) return;
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

try {
  AppState.addEventListener('change', handleAppStateChange);
} catch (e) {
  disableNative('AppState listener registration threw', e);
}

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
  if (nativeDisabled) return false;
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
 * Submits onchain Neurai addresses and txids to GroundControl server so we
 * later get notified when they're paid. The `chain` argument tags every
 * registered address/txid as belonging to mainnet or testnet — the server uses
 * it to avoid cross-chain false positives when the same string happens to be
 * valid on both networks.
 */
export const majorTomToGroundControl = async (addresses: string[], hashes: string[], txids: string[], chain: TNeuraiChain) => {
  if (nativeDisabled) return;
  console.log('majorTomToGroundControl: Starting notification registration', {
    addressCount: addresses?.length,
    hashCount: hashes?.length,
    txidCount: txids?.length,
    chain,
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
      chain,
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
      return {};
    }
  } catch (error) {
    console.error('Error in majorTomToGroundControl:', error);
    throw error;
  }
};

export const checkPermissions = async (): Promise<{ alert?: boolean; badge?: boolean; sound?: boolean; status?: string }> => {
  if (nativeDisabled) return { alert: false, badge: false, sound: false, status: 'unavailable' };
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
    disableNative('checkPermissions threw', error);
    return { alert: false, badge: false, sound: false, status: 'unavailable' };
  }
};

export const setLevels = async (levelAll: boolean) => {
  if (nativeDisabled) return;
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
      try {
        Notifications.removeAllDeliveredNotifications();
        if (Platform.OS === 'ios') {
          Notifications.ios.setBadgeCount(0);
          Notifications.ios.cancelAllLocalNotifications();
        }
      } catch (e) {
        disableNative('clearing delivered notifications threw', e);
      }
      await AsyncStorage.setItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG, 'true');
      console.log('Notifications disabled successfully');
    } else {
      await AsyncStorage.removeItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG);
    }
  } catch (error) {
    console.error('Error setting notification levels:', error);
  }
};

/**
 * Every change to the stored push queue runs one at a time. The queue is a
 * read-modify-write of one AsyncStorage key, and two pushes arriving together
 * used to overwrite each other (H20).
 */
let queueTail: Promise<unknown> = Promise.resolve();
function inNotificationQueue<T>(op: () => Promise<T>): Promise<T> {
  const run = queueTail.then(op, op);
  queueTail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/** The stored queue; an unreadable value is reset to empty, a storage error is thrown. */
async function readNotificationQueue(): Promise<TPayload[]> {
  let notifications: unknown;
  try {
    notifications = JSON.parse(String(await AsyncStorage.getItem(NOTIFICATIONS_STORAGE)));
  } catch (e) {
    if (!(e instanceof SyntaxError)) throw e;
    console.error('Invalid notifications format, resetting the queue');
    await AsyncStorage.setItem(NOTIFICATIONS_STORAGE, '[]');
    return [];
  }
  return Array.isArray(notifications) ? (notifications as TPayload[]) : [];
}

export const addNotification = (notification: TPayload): Promise<void> =>
  inNotificationQueue(async () => {
    const notifications = await readNotificationQueue();
    notifications.push(notification);
    await AsyncStorage.setItem(NOTIFICATIONS_STORAGE, JSON.stringify(notifications));
  });

/**
 * Removes one processed push from the queue. Called after the push was
 * dispatched, so a crash in between replays it instead of losing it (H20).
 */
export const acknowledgeStoredNotification = (notification: Partial<TPayload>): Promise<void> =>
  inNotificationQueue(async () => {
    const notifications = await readNotificationQueue();
    const key = getNotificationKey(notification);
    const index = notifications.findIndex(stored => getNotificationKey(stored) === key);
    if (index < 0) return;
    notifications.splice(index, 1);
    await AsyncStorage.setItem(NOTIFICATIONS_STORAGE, JSON.stringify(notifications));
  });

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

    const response = await fetch(`${baseURI}/setTokenConfiguration`, {
      method: 'POST',
      headers: _getHeaders(),
      body: JSON.stringify({
        token: pushToken.token,
        os: pushToken.os,
        lang,
        app_version: appVersion,
      }),
    });

    // Servers that identify their database answer with its id; older ones send an empty body.
    const instanceId = await response
      .json()
      .then(json => json?.instance_id)
      .catch(() => undefined);
    if (typeof instanceId === 'string' && instanceId) {
      serverInstance = { id: instanceId, uri: baseURI, token: pushToken.token };
      syncGroundControlSubscriptions().catch(error => console.warn('GroundControl subscription sync failed:', error));
    }
  } catch (e) {
    console.error(e);
    await AsyncStorage.setItem('lang', 'en');
    throw e;
  }
};

const readRegisteredSubscriptions = async (): Promise<TRegisteredSubscriptions | null> => {
  try {
    const stored = JSON.parse(String(await AsyncStorage.getItem(GROUNDCONTROL_SUBSCRIPTIONS)));
    return stored && typeof stored === 'object' ? stored : null;
  } catch (_) {
    return null;
  }
};

/**
 * Keeps GroundControl subscribed to every address of the given wallets, including after its database was wiped (which
 * drops all subscriptions). Call it with the current wallets whenever they change: it only contacts the server for
 * addresses this device has not registered yet on the current database, identified by the `instance_id` that
 * /setTokenConfiguration returns on every app start. Until that id is known (or with servers that don't send one), it
 * does nothing.
 */
export const syncGroundControlSubscriptions = async (entries?: TSubscriptionEntry[]): Promise<void> => {
  if (entries) subscriptionEntries = entries;
  if (nativeDisabled || !serverInstance || serverInstance.uri !== baseURI || !subscriptionEntries) return;
  // Wallet updates can arrive while a sync waits on the server; fold them into a single follow-up run.
  subscriptionSyncRequested = true;
  if (subscriptionSyncRunning) return;
  subscriptionSyncRunning = true;
  try {
    while (subscriptionSyncRequested) {
      subscriptionSyncRequested = false;
      const instance = serverInstance;
      const wanted = subscriptionEntries;
      const syncKey = JSON.stringify([instance, wanted]);
      if (syncKey === lastSyncedSubscriptions) continue;
      if ((await AsyncStorage.getItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG)) === 'true') return;

      // A new database, another server or a rotated push token has none of what we registered before.
      const stored = await readRegisteredSubscriptions();
      const sameTarget = stored?.instanceId === instance.id && stored?.uri === instance.uri && stored?.token === instance.token;
      const registered: TRegisteredSubscriptions = {
        instanceId: instance.id,
        uri: instance.uri,
        token: instance.token,
        addresses: { mainnet: (sameTarget && stored?.addresses?.mainnet) || [], testnet: (sameTarget && stored?.addresses?.testnet) || [] },
      };

      for (const chain of NEURAI_CHAINS) {
        const known = new Set(registered.addresses[chain]);
        const missing = [...new Set(wanted.filter(entry => entry.chain === chain).flatMap(entry => entry.addresses))].filter(
          address => !known.has(address),
        );
        if (missing.length === 0) continue;
        await majorTomToGroundControl(missing, [], [], chain);
        registered.addresses[chain] = [...registered.addresses[chain], ...missing];
        await AsyncStorage.setItem(GROUNDCONTROL_SUBSCRIPTIONS, JSON.stringify(registered));
      }
      lastSyncedSubscriptions = syncKey;
    }
  } finally {
    subscriptionSyncRunning = false;
  }
};

/** Drops unsubscribed addresses from the registration record, so the sync sends them again if they come back. */
const forgetRegisteredAddresses = async (addresses: string[], chain: TNeuraiChain) => {
  const stored = await readRegisteredSubscriptions();
  if (!stored?.addresses?.[chain]) return;
  stored.addresses[chain] = stored.addresses[chain].filter(address => !addresses.includes(address));
  await AsyncStorage.setItem(GROUNDCONTROL_SUBSCRIPTIONS, JSON.stringify(stored));
  lastSyncedSubscriptions = null;
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
  if (nativeDisabled) return false;
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
      try {
        notificationSubscriptions = [
          Notifications.events().registerRemoteNotificationsRegistered(async event => {
            console.log('configureNotifications: push token received');
            const token = createPushToken(event.deviceToken);
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
      } catch (e) {
        disableNative('events() registration threw', e);
        return false;
      }
    }

    try {
      Notifications.getInitialNotification()
        .then(async initialNotification => {
          if (initialNotification) {
            console.log('App was launched by a push notification');
            await storeIncomingNotification(initialNotification, { foreground: false, userInteraction: true });
          }
        })
        .catch(error => console.error('Failed to retrieve initial notification:', error));
    } catch (e) {
      disableNative('getInitialNotification threw', e);
    }

    return await waitForRemoteRegistration();
  } catch (error) {
    console.error('Error in configureNotifications:', error);
    return false;
  }
};

/**
 * Validates whether the provided GroundControl URI is valid by pinging it.
 */
/** True when `uri` answers `/ping` like a GroundControl server within `timeout` ms. */
export const isGroundControlUriValid = async (uri: string, timeout?: number) => {
  try {
    const response = await fetch(`${uri}/ping`, { headers: _getHeaders(), timeout });
    const json = await response.json();
    return !!json.description;
  } catch (_) {
    return false;
  }
};

export const isNotificationsCapable = (() => {
  try {
    return hasGmsSync() || hasHmsSync() || Platform.OS !== 'android';
  } catch (e) {
    console.warn('isNotificationsCapable probe threw, assuming non-capable:', e);
    return false;
  }
})();

export const getPushToken = async (): Promise<TPushToken | null> => {
  try {
    const token = await AsyncStorage.getItem(PUSH_TOKEN);
    if (!token) return null;
    return JSON.parse(String(token)) as TPushToken;
  } catch (e) {
    console.error(e);
    AsyncStorage.removeItem(PUSH_TOKEN);
    return null;
  }
};

/**
 * Queries groundcontrol for token configuration, which contains subscriptions to notification levels
 */
const getLevels = async () => {
  const pushToken = await getPushToken();
  if (!pushToken || !pushToken.token || !pushToken.os) return {};

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
 */
export const unsubscribe = async (addresses: string[], hashes: string[], txids: string[], chain: TNeuraiChain) => {
  if (nativeDisabled) return;
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
    chain,
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

    await forgetRegisteredAddresses(addresses, chain).catch(error => console.warn('Failed to update GroundControl subscriptions:', error));
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
    await inNotificationQueue(() => AsyncStorage.setItem(NOTIFICATIONS_STORAGE, JSON.stringify([])));
  } catch (_) {}
};

export const getDeliveredNotifications: () => Promise<Record<string, any>[]> = () => {
  if (nativeDisabled) return Promise.resolve([]);
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
    return Promise.resolve([]);
  }
};

export const removeDeliveredNotifications = (identifiers: string[] = []) => {
  if (nativeDisabled) return;
  try {
    if (Platform.OS === 'ios') {
      Notifications.ios.removeDeliveredNotifications(identifiers);
    }
  } catch (e) {
    disableNative('removeDeliveredNotifications threw', e);
  }
};

export const setApplicationIconBadgeNumber = (badges: number) => {
  if (nativeDisabled) return;
  try {
    if (Platform.OS === 'ios') {
      Notifications.ios.setBadgeCount(badges);
    }
  } catch (e) {
    disableNative('setBadgeCount threw', e);
  }
};

export const removeAllDeliveredNotifications = () => {
  if (nativeDisabled) return;
  try {
    Notifications.removeAllDeliveredNotifications();
  } catch (e) {
    disableNative('removeAllDeliveredNotifications threw', e);
  }
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
  if (nativeDisabled) return false;
  try {
    const levels = await getLevels();
    const token = await getPushToken();
    const isDisabledByUser = (await AsyncStorage.getItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG)) === 'true';

    return !isDisabledByUser && !!token && !!levels.level_all;
  } catch (error) {
    console.log('Error checking notification levels:', error);
    if (error instanceof SyntaxError) {
      throw error;
    }
    return false;
  }
};

/** A snapshot of the stored queue. Entries stay stored until acknowledged. */
export const getStoredNotifications = (): Promise<TPayload[]> => inNotificationQueue(readNotificationQueue);

// on app launch (load module):
export const initializeNotifications = async (onProcessNotifications?: () => void) => {
  if (nativeDisabled) return;
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

    currentPermissionStatus = await checkNotificationPermissionStatus();
    console.log('initializeNotifications: Permission status:', currentPermissionStatus);

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
    disableNative('initializeNotifications threw', error);
    baseURI = groundControlUri;
    await AsyncStorage.setItem(GROUNDCONTROL_BASE_URI, groundControlUri).catch(err => console.error('Failed to reset URI:', err));
  }
};
