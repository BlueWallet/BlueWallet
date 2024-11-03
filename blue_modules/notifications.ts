import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { findNodeHandle, Platform } from 'react-native';
import { getApplicationName, getSystemName, getSystemVersion, getVersion, hasGmsSync, hasHmsSync } from 'react-native-device-info';
import { requestNotifications } from 'react-native-permissions';
import PushNotification, { ReceivedNotification } from 'react-native-push-notification';
import loc from '../loc';
import ActionSheet from '../screen/ActionSheet';
import { groundControlUri } from './constants';

const PUSH_TOKEN = 'PUSH_TOKEN';
const GROUNDCONTROL_BASE_URI = 'GROUNDCONTROL_BASE_URI';
const NOTIFICATIONS_STORAGE = 'NOTIFICATIONS_STORAGE';
const NOTIFICATIONS_NO_AND_DONT_ASK_FLAG = 'NOTIFICATIONS_NO_AND_DONT_ASK_FLAG';
let alreadyConfigured = false;
let baseURI = groundControlUri;

export const isNotificationsCapable = hasGmsSync() || hasHmsSync() || Platform.OS !== 'android';

interface PushToken {
  token: string;
  os: string;
}

interface NotificationPayload {
  [key: string]: any;
  foreground?: boolean;
}

interface Permissions {
  alert: boolean;
  badge: boolean;
  sound: boolean;
}

export async function setPushToken(token: PushToken): Promise<void> {
  await AsyncStorage.setItem(PUSH_TOKEN, JSON.stringify(token));
}

export async function getPushToken(): Promise<PushToken | false> {
  try {
    let token = await AsyncStorage.getItem(PUSH_TOKEN);
    token = token ? JSON.parse(token) : false;
    return token as unknown as PushToken;
  } catch (_) {}
  return false;
}

export async function addNotification(notification: NotificationPayload): Promise<void> {
  let notifications: any[] = [];
  try {
    const stringified = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE);
    notifications = JSON.parse(stringified || '[]');
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
export async function configureNotifications(onProcessNotifications: () => void): Promise<boolean> {
  return new Promise<boolean>(resolve => {
    requestNotifications(['alert', 'sound', 'badge']).then(({ status }) => {
      if (status === 'granted') {
        PushNotification.configure({
          // (optional) Called when Token is generated (iOS and Android)
          onRegister: async function (token: PushToken) {
            console.debug('TOKEN:', token);
            alreadyConfigured = true;
            await setPushToken(token);
            resolve(true);
          },

          // (required) Called when a remote is received or opened, or local notification is opened
          onNotification: async function (notification: Omit<ReceivedNotification, 'userInfo'>) {
            // since we do not know whether we:
            // 1) received notification while app is in background (and storage is not decrypted so wallets are not loaded)
            // 2) opening this notification right now but storage is still unencrypted
            // 3) any of the above but the storage is decrypted, and app wallets are loaded
            //
            // ...we save notification in internal notifications queue thats gona be processed later (on unsuspend with decrypted storage)

            const payload: NotificationPayload = Object.assign({}, notification, notification.data);
            if (notification.data && notification.data.data) Object.assign(payload, notification.data.data);
            delete payload.data;
            // ^^^ weird, but sometimes payload data is not in `data` but in root level
            console.debug('got push notification', payload);

            await addNotification(payload);

            // (required) Called when a remote is received or opened, or local notification is opened
            if (Platform.OS === 'ios') {
              (notification as any).finish(PushNotificationIOS.FetchResult.NoData);
            }

            // if user is staring at the app when he receives the notification we process it instantly
            // so app refetches related wallet
            if (payload.foreground) onProcessNotifications();
          },

          // (optional) Called when Registered Action is pressed and invokeApp is false, if true onNotification will be called (Android)
          onAction: function (notification: ReceivedNotification) {
            console.debug('ACTION:', notification.action);
            console.debug('NOTIFICATION:', notification);
            // process the action
          },

          // (optional) Called when the user fails to register for remote notifications. Typically occurs when APNS is having issues, or the device is a simulator. (iOS)
          onRegistrationError: function (err: any) {
            console.error(err.message, err);
            resolve(false);
          },

          // IOS ONLY (optional): default: all - Permissions to register.
          permissions: {
            alert: true,
            badge: true,
            sound: true,
          },

          // Should the initial notification be popped automatically
          // default: true
          popInitialNotification: true,

          /**
           * (optional) default: true
           * - Specified if permissions (ios) and token (android and ios) will requested or not,
           * - if not, you must call PushNotificationsHandler.requestPermissions() later
           * - if you are not using remote notification or do not have Firebase installed, use this:
           *     requestPermissions: Platform.OS === 'ios'
           */
          requestPermissions: true,
        });
      }
    });
  });
}

function getHeaders(): { [key: string]: string } {
  return {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Queries groundcontrol for token configuration, which contains subscriptions to notification levels
 *
 * @returns {Promise<{}|*>}
 */
export async function getLevels(): Promise<any> {
  const pushToken = await getPushToken();
  if (!pushToken || !pushToken.token || !pushToken.os) return {};

  let response: Response | undefined;
  try {
    response = (await Promise.race([
      fetch(`${baseURI}/getTokenConfiguration`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          token: pushToken.token,
          os: pushToken.os,
        }),
      }),
      sleep(3000).then(() => undefined),
    ])) as Response | undefined;
  } catch (_) {}

  if (!response) return {};

  return await response.json();
}

export async function cleanUserOptOutFlag(): Promise<void> {
  await AsyncStorage.removeItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG);
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
export async function tryToObtainPermissions(onProcessNotifications: () => void, anchor?: React.RefObject<any>): Promise<boolean> {
  if (!isNotificationsCapable) return false;
  if (await getPushToken()) {
    // we already have a token, no sense asking again, just configure pushes to register callbacks and we are done
    if (!alreadyConfigured) configureNotifications(onProcessNotifications); // no await so it executes in background while we return TRUE and use token
    return true;
  }

  if (await AsyncStorage.getItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG)) {
    // user doesn't want them
    return false;
  }

  return new Promise<boolean>(resolve => {
    const options = [loc.notifications.no_and_dont_ask, loc.notifications.ask_me_later, loc._.ok];

    ActionSheet.showActionSheetWithOptions(
      {
        title: loc.settings.notifications,
        message: `${loc.notifications.would_you_like_to_receive_notifications}\n${loc.settings.push_notifications_explanation}`,
        options,
        cancelButtonIndex: 0, // Assuming 'no and don't ask' is still treated as the cancel action
        anchor: anchor ? (findNodeHandle(anchor.current) ?? undefined) : undefined,
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
            configureNotifications(onProcessNotifications).then(resolve);
            break;
        }
      },
    );
  });
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
export async function majorTomToGroundControl(addresses: string[], hashes: string[], txids: string[]): Promise<any> {
  try {
    if (!Array.isArray(addresses) || !Array.isArray(hashes) || !Array.isArray(txids)) {
      throw new Error('No addresses, hashes, or txids provided');
    }

    const pushToken = await getPushToken();
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

    let response: Response | undefined;
    try {
      response = await fetch(`${baseURI}/majorTomToGroundControl`, {
        method: 'POST',
        headers: getHeaders(),
        body: requestBody,
      });
    } catch (networkError) {
      console.error('Network request failed:', networkError);
      throw networkError;
    }

    if (!response.ok) {
      return;
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
  }
}

/**
 * The opposite of `majorTomToGroundControl` call.
 *
 * @param addresses {string[]}
 * @param hashes {string[]}
 * @param txids {string[]}
 * @returns {Promise<object>} Response object from API rest call
 */
export async function unsubscribe(addresses: string[], hashes: string[], txids: string[]): Promise<any> {
  if (!Array.isArray(addresses) || !Array.isArray(hashes) || !Array.isArray(txids))
    throw new Error('no addresses or hashes or txids provided');
  const pushToken = await getPushToken();
  if (!pushToken || !pushToken.token || !pushToken.os) return;

  const response = await fetch(`${baseURI}/unsubscribe`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      addresses,
      hashes,
      txids,
      token: pushToken.token,
      os: pushToken.os,
    }),
  });

  console.debug('Abandoning notifications Permissions...');
  PushNotification.abandonPermissions();
  console.debug('Abandoned notifications Permissions...');
  return response.json();
}

export async function isNotificationsEnabled(): Promise<boolean> {
  const levels = await getLevels();
  return !!(await getPushToken()) && !!levels.level_all;
}

export function getDefaultUri(): string {
  return groundControlUri;
}

export async function saveUri(uri: string | null): Promise<void> {
  baseURI = uri || groundControlUri; // setting the url to use currently. if not set - use default
  await AsyncStorage.setItem(GROUNDCONTROL_BASE_URI, uri ?? '');
}

export async function getSavedUri(): Promise<string | null> {
  return AsyncStorage.getItem(GROUNDCONTROL_BASE_URI);
}

/**
 * Validates whether the provided GroundControl URI is valid by pinging it.
 *
 * @param uri {string}
 * @returns {Promise<boolean>} TRUE if valid, FALSE otherwise
 */
export async function isGroundControlUriValid(uri: string): Promise<boolean> {
  let response: Response | undefined;
  try {
    response = (await Promise.race([
      fetch(`${uri}/ping`, { headers: getHeaders() })
        .then(res => res)
        .catch(() => undefined),
      sleep(2000).then(() => undefined),
    ])) as Response | undefined;
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
 * @returns {Promise<Object>}
 */
export async function checkPermissions(): Promise<Permissions> {
  return new Promise<Permissions>(resolve => {
    PushNotification.checkPermissions(result => {
      resolve({
        alert: result.alert ?? false,
        badge: result.badge ?? false,
        sound: result.sound ?? false,
      });
    });
  });
}

/**
 * Posts to groundcontrol info whether we want to opt in or out of specific notifications level
 *
 * @param levelAll {Boolean}
 * @returns {Promise<*>}
 */
export async function setLevels(levelAll: boolean): Promise<void> {
  const pushToken = await getPushToken();
  if (!pushToken || !pushToken.token || !pushToken.os) return;

  try {
    await fetch(`${baseURI}/setTokenConfiguration`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        level_all: !!levelAll,
        token: pushToken.token,
        os: pushToken.os,
      }),
    });
  } catch (_) {}
}

export async function getStoredNotifications(): Promise<any[]> {
  let notifications: any[] = [];
  try {
    const stringified = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE);
    notifications = JSON.parse(stringified || '[]');
    if (!Array.isArray(notifications)) notifications = [];
  } catch (_) {}

  return notifications;
}

export async function postTokenConfig(): Promise<void> {
  const pushToken = await getPushToken();
  if (!pushToken || !pushToken.token || !pushToken.os) return;

  try {
    const lang = (await AsyncStorage.getItem('lang')) || 'en';
    const appVersion = getSystemName() + ' ' + getSystemVersion() + ';' + getApplicationName() + ' ' + getVersion();

    await fetch(`${baseURI}/setTokenConfiguration`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        token: pushToken.token,
        os: pushToken.os,
        lang,
        app_version: appVersion,
      }),
    });
  } catch (_) {}
}

export async function clearStoredNotifications(): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIFICATIONS_STORAGE, JSON.stringify([]));
  } catch (_) {}
}

export function getDeliveredNotifications(): Promise<any[]> {
  return new Promise<any[]>(resolve => {
    PushNotification.getDeliveredNotifications((notifications: any[]) => resolve(notifications));
  });
}

export function removeDeliveredNotifications(identifiers: string[] = []): void {
  PushNotification.removeDeliveredNotifications(identifiers);
}

export function setApplicationIconBadgeNumber(badges: number): void {
  PushNotification.setApplicationIconBadgeNumber(badges);
}

export function removeAllDeliveredNotifications(): void {
  PushNotification.removeAllDeliveredNotifications();
}

// on app launch (load module):
(async () => {
  // first, fetching to see if app uses custom GroundControl server, not the default one
  try {
    const baseUriStored = await AsyncStorage.getItem(GROUNDCONTROL_BASE_URI);
    if (baseUriStored) {
      baseURI = baseUriStored;
    }
  } catch (_) {}

  // every launch should clear badges:
  setApplicationIconBadgeNumber(0);

  if (!(await getPushToken())) return;
  // if we previously had token that means we already acquired permission from the user and it is safe to call
  // `configure` to register callbacks etc
  await configureNotifications(() => {});
  await postTokenConfig();
})();
