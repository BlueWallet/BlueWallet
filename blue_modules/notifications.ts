import AsyncStorage from '@react-native-async-storage/async-storage';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { findNodeHandle, Platform } from 'react-native';
import { getApplicationName, getSystemName, getSystemVersion, getVersion, hasGmsSync, hasHmsSync } from 'react-native-device-info';
import { requestNotifications } from 'react-native-permissions';
import PushNotification, { PushNotificationPermissions } from 'react-native-push-notification';

import loc from '../loc';
import ActionSheet from '../screen/ActionSheet';
import { groundControlUri } from './constants';

const PUSH_TOKEN = 'PUSH_TOKEN';
const GROUNDCONTROL_BASE_URI = 'GROUNDCONTROL_BASE_URI';
const NOTIFICATIONS_STORAGE = 'NOTIFICATIONS_STORAGE';
const NOTIFICATIONS_NO_AND_DONT_ASK_FLAG = 'NOTIFICATIONS_NO_AND_DONT_ASK_FLAG';
let alreadyConfigured = false;
let baseURI = groundControlUri;

interface PushToken {
  token: string;
  os: string;
}

interface NotificationProps {
  onProcessNotifications: () => void;
}

// Fallback type definition for HeadersInit if it's not recognized
type HeadersInit = Record<string, string>;

async function _setPushToken(token: PushToken): Promise<void> {
  const tokenString = JSON.stringify(token);
  return AsyncStorage.setItem(PUSH_TOKEN, tokenString);
}

async function getPushToken(): Promise<PushToken | null> {
  try {
    const token = await AsyncStorage.getItem(PUSH_TOKEN);
    return token ? JSON.parse(token) : null;
  } catch (_) {
    return null;
  }
}

const isNotificationsCapable: boolean = hasGmsSync() || hasHmsSync() || Platform.OS !== 'android';

async function addNotification(notification: any): Promise<void> {
  let notifications: any[] = [];
  try {
    const stringified = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE);
    notifications = stringified ? JSON.parse(stringified) : [];
    if (!Array.isArray(notifications)) notifications = [];
  } catch (_) {}

  notifications.push(notification);
  await AsyncStorage.setItem(NOTIFICATIONS_STORAGE, JSON.stringify(notifications));
}

/**
 * Calls `configure`, which tries to obtain push token, save it, and registers all associated with
 * notifications callbacks
 *
 * @returns {Promise<boolean>} TRUE if acquired token, FALSE if not
 */
const configureNotifications = async function (props: NotificationProps): Promise<boolean> {
  return new Promise<boolean>(resolve => {
    requestNotifications(['alert', 'sound', 'badge']).then(({ status }) => {
      if (status === 'granted') {
        PushNotification.configure({
          onRegister: async function (token: { token: string }) {
            console.log('TOKEN:', token);
            alreadyConfigured = true;
            await _setPushToken({ token: token.token, os: Platform.OS });
            resolve(true);
          },
          onNotification: async function (notification: any) {
            const payload = { ...notification, ...notification.data };
            if (notification.data?.data) Object.assign(payload, notification.data.data);
            delete payload.data;
            console.log('got push notification', payload);

            await addNotification(payload);

            notification.finish(PushNotificationIOS.FetchResult.NoData);

            if (payload.foreground) props.onProcessNotifications();
          },
          onAction: function (notification: any) {
            console.log('ACTION:', notification.action);
            console.log('NOTIFICATION:', notification);
          },
          onRegistrationError: function (err: Error) {
            console.error(err.message, err);
            resolve(false);
          },
          permissions: {
            alert: true,
            badge: true,
            sound: true,
          },
          popInitialNotification: true,
          requestPermissions: true,
        });
      }
    });
  });
};

async function cleanUserOptOutFlag(): Promise<void> {
  return AsyncStorage.removeItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG);
}

/**
 * Should be called when user is most interested in receiving push notifications.
 * If we dont have a token it will show alert asking whether
 * user wants to receive notifications, and if yes - will configure push notifications.
 * FYI, on Android permissions are acquired when app is installed, so basically we dont need to ask,
 * we can just call `configure`. On iOS its different, and calling `configure` triggers system's dialog box.
 *
 * @returns {Promise<boolean>} TRUE if permissions were obtained, FALSE otherwise
 */
async function tryToObtainPermissions(anchor: React.RefObject<any>, props: NotificationProps): Promise<boolean> {
  if (!isNotificationsCapable) return false;
  if (await getPushToken()) {
    if (!alreadyConfigured) configureNotifications(props);
    return true;
  }

  if (await AsyncStorage.getItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG)) {
    return false;
  }

  return new Promise<boolean>(resolve => {
    const options = [loc.notifications.no_and_dont_ask, loc.notifications.ask_me_later, loc._.ok];

    ActionSheet.showActionSheetWithOptions(
      {
        title: loc.settings.notifications,
        message: loc.notifications.would_you_like_to_receive_notifications,
        options,
        cancelButtonIndex: 0,
        anchor: findNodeHandle(anchor.current) ?? undefined,
      },
      (buttonIndex: number) => {
        switch (buttonIndex) {
          case 0:
            AsyncStorage.setItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG, '1').then(() => resolve(false));
            break;
          case 1:
            resolve(false);
            break;
          case 2:
            configureNotifications(props).then(resolve);
            break;
        }
      },
    );
  });
}

function _getHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };
}

async function _sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Submits onchain bitcoin addresses and ln invoice preimage hashes to GroundControl server, so later we could
 * be notified if they were paid
 *
 * @param addresses {string[]}
 * @param hashes {string[]}
 * @param txids {string[]}
 * @returns {Promise<object>} Response object from API rest call
 */
async function majorTomToGroundControl(addresses: string[], hashes: string[], txids: string[]): Promise<object | undefined> {
  if (!Array.isArray(addresses) || !Array.isArray(hashes) || !Array.isArray(txids))
    throw new Error('no addresses or hashes or txids provided');
  const pushToken = await getPushToken();
  if (!pushToken || !pushToken.token || !pushToken.os) return;

  const response = await fetch(`${baseURI}/majorTomToGroundControl`, {
    method: 'POST',
    headers: _getHeaders(),
    body: JSON.stringify({
      addresses,
      hashes,
      txids,
      token: pushToken.token,
      os: pushToken.os,
    }),
  });

  return response.json();
}

/**
 * The opposite of `majorTomToGroundControl` call.
 *
 * @param addresses {string[]}
 * @param hashes {string[]}
 * @param txids {string[]}
 * @returns {Promise<object>} Response object from API rest call
 */
async function unsubscribe(addresses: string[], hashes: string[], txids: string[]): Promise<object | undefined> {
  if (!Array.isArray(addresses) || !Array.isArray(hashes) || !Array.isArray(txids))
    throw new Error('no addresses or hashes or txids provided');
  const pushToken = await getPushToken();
  if (!pushToken || !pushToken.token || !pushToken.os) return;

  const response = await fetch(`${baseURI}/unsubscribe`, {
    method: 'POST',
    headers: _getHeaders(),
    body: JSON.stringify({
      addresses,
      hashes,
      txids,
      token: pushToken.token,
      os: pushToken.os,
    }),
  });

  console.log('Abandoning notifications Permissions...');
  PushNotification.abandonPermissions();
  console.log('Abandoned notifications Permissions...');
  return response.json();
}

/**
 * Queries groundcontrol for token configuration, which contains subscriptions to notification levels
 *
 * @returns {Promise<{}|*>}
 */
async function getLevels(): Promise<any> {
  const pushToken = await getPushToken();
  if (!pushToken || !pushToken.token || !pushToken.os) return {};

  let response;
  try {
    response = await Promise.race([
      fetch(`${baseURI}/getTokenConfiguration`, {
        method: 'POST',
        headers: _getHeaders(),
        body: JSON.stringify({
          token: pushToken.token,
          os: pushToken.os,
        }),
      }),
      _sleep(3000),
    ]);
  } catch (_) {}

  if (!response) return {};

  return response.json();
}

async function isNotificationsEnabled(): Promise<boolean> {
  const levels = await getLevels();
  return !!(await getPushToken()) && !!levels.level_all;
}

function getDefaultUri(): string {
  return groundControlUri;
}

async function saveUri(uri: string): Promise<void> {
  baseURI = uri || groundControlUri;
  return AsyncStorage.setItem(GROUNDCONTROL_BASE_URI, uri);
}

async function getSavedUri(): Promise<string | null> {
  return AsyncStorage.getItem(GROUNDCONTROL_BASE_URI);
}

/**
 * Validates whether the provided GroundControl URI is valid by pinging it.
 *
 * @param uri {string}
 * @returns {Promise<boolean>} TRUE if valid, FALSE otherwise
 */
async function isGroundControlUriValid(uri: string): Promise<boolean> {
  let response;
  try {
    response = await Promise.race([fetch(`${uri}/ping`, { headers: _getHeaders() }), _sleep(2000)]);
  } catch (_) {}

  if (!response) return false;

  const json = await response.json();
  return !!json.description;
}

/**
 * Returns a permissions object:
 * alert: boolean
 * badge: boolean
 * sound: boolean
 *
 * @returns {Promise<PushNotificationPermissions>}
 */
async function checkPermissions(): Promise<PushNotificationPermissions> {
  return new Promise<PushNotificationPermissions>(resolve => {
    PushNotification.checkPermissions((result: PushNotificationPermissions) => {
      resolve(result);
    });
  });
}

/**
 * Posts to groundcontrol info whether we want to opt in or out of specific notifications level
 *
 * @param levelAll {Boolean}
 * @returns {Promise<void>}
 */
async function setLevels(levelAll: boolean): Promise<void> {
  const pushToken = await getPushToken();
  if (!pushToken || !pushToken.token || !pushToken.os) return;

  try {
    await fetch(`${baseURI}/setTokenConfiguration`, {
      method: 'POST',
      headers: _getHeaders(),
      body: JSON.stringify({
        level_all: !!levelAll,
        token: pushToken.token,
        os: pushToken.os,
      }),
    });
    console.log('Abandoning notifications Permissions...');
    PushNotification.abandonPermissions();
    console.log('Abandoned notifications Permissions...');
  } catch (_) {}
}

async function getStoredNotifications(): Promise<any[]> {
  let notifications: any[] = [];
  try {
    const stringified = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE);
    notifications = stringified ? JSON.parse(stringified) : [];
    if (!Array.isArray(notifications)) notifications = [];
  } catch (_) {}

  return notifications;
}

async function postTokenConfig(): Promise<void> {
  const pushToken = await getPushToken();
  if (!pushToken || !pushToken.token || !pushToken.os) return;

  try {
    const lang = (await AsyncStorage.getItem('lang')) || 'en';
    const appVersion = `${getSystemName()} ${getSystemVersion()};${getApplicationName()} ${getVersion()}`;

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
  } catch (_) {}
}

async function clearStoredNotifications(): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIFICATIONS_STORAGE, JSON.stringify([]));
  } catch (_) {}
}

function getDeliveredNotifications(): Promise<any[]> {
  return new Promise<any[]>(resolve => {
    PushNotification.getDeliveredNotifications((notifications: any) => resolve(notifications));
  });
}

function removeDeliveredNotifications(identifiers: string[] = []): void {
  PushNotification.removeDeliveredNotifications(identifiers);
}

function setApplicationIconBadgeNumber(badges: number): void {
  PushNotification.setApplicationIconBadgeNumber(badges);
}

function removeAllDeliveredNotifications(): void {
  PushNotification.removeAllDeliveredNotifications();
}

// on app launch (load module):
(async () => {
  try {
    const baseUriStored = await AsyncStorage.getItem(GROUNDCONTROL_BASE_URI);
    if (baseUriStored) {
      baseURI = baseUriStored;
    }
  } catch (_) {}

  setApplicationIconBadgeNumber(0);

  const props: NotificationProps = {
    onProcessNotifications: () => {
      // Default empty function; replace with actual logic if needed.
    },
  };

  if (!(await getPushToken())) return;
  await configureNotifications(props);
  await postTokenConfig();
})();

export {
  getPushToken,
  isNotificationsCapable,
  configureNotifications,
  cleanUserOptOutFlag,
  tryToObtainPermissions,
  majorTomToGroundControl,
  unsubscribe,
  isNotificationsEnabled,
  getDefaultUri,
  saveUri,
  getSavedUri,
  isGroundControlUriValid,
  checkPermissions,
  setLevels,
  getLevels,
  getStoredNotifications,
  addNotification,
  postTokenConfig,
  clearStoredNotifications,
  getDeliveredNotifications,
  removeDeliveredNotifications,
  setApplicationIconBadgeNumber,
  removeAllDeliveredNotifications,
};
