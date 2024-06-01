import AsyncStorage from '@react-native-async-storage/async-storage';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { findNodeHandle, Platform } from 'react-native';
import { getApplicationName, getSystemName, getSystemVersion, getVersion, hasGmsSync, hasHmsSync } from 'react-native-device-info';
import {  requestNotifications } from 'react-native-permissions';
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

async function _setPushToken(token: PushToken) {
  const tokenString = JSON.stringify(token);
  const result = await AsyncStorage.setItem(PUSH_TOKEN, tokenString);
  console.debug(`{function: _setPushToken, result: ${result}}`);
  return result;
}

function setApplicationIconBadgeNumber(badges: number): void {
  PushNotification.setApplicationIconBadgeNumber(badges);
  console.debug(`{function: setApplicationIconBadgeNumber, badges: ${badges}}`);
}

async function getPushToken(): Promise<PushToken | false> {
  try {
    const token = await AsyncStorage.getItem(PUSH_TOKEN);
    if (token) {
      const parsedToken: PushToken = JSON.parse(token);
      console.debug(`{function: getPushToken, result: ${JSON.stringify(parsedToken)}}`);
      return parsedToken;
    }
  } catch (_) {}
  console.debug(`{function: getPushToken, result: false}`);
  return false;
}

async function addNotification(notification: object): Promise<void> {
  let notifications: object[] = [];
  try {
    const stringified = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE);
    if (stringified) {
      notifications = JSON.parse(stringified);
      if (!Array.isArray(notifications)) notifications = [];
    }
  } catch (_) {}

  notifications.push(notification);
  const result = await AsyncStorage.setItem(NOTIFICATIONS_STORAGE, JSON.stringify(notifications));
  console.debug(`{function: addNotification, result: ${result}}`);

  // Set the application badge number to the number of notifications not cleared
  setApplicationIconBadgeNumber(notifications.length);
}

const isNotificationsCapable = hasGmsSync() || hasHmsSync() || Platform.OS !== 'android';

const configureNotifications = async function (): Promise<boolean> {
  return new Promise(function (resolve) {
    requestNotifications(['alert', 'sound', 'badge']).then(({ status }) => {
      if (status === 'granted') {
        PushNotification.configure({
          onRegister: async function (token) {
            console.debug(`{token: ${JSON.stringify(token)}, function: configureNotifications}`);
            alreadyConfigured = true;
            await _setPushToken(token);
            resolve(true);
          },

          onNotification: async function (notification) {
            const payload = Object.assign({}, notification, notification.data);
            if (notification.data && notification.data.data) Object.assign(payload, notification.data.data);
            if ('data' in payload) delete (payload as any).data; // Ensuring the operand is optional
            console.debug(`{notification: ${JSON.stringify(payload)}, function: configureNotifications}`);

            await addNotification(payload);

            notification.finish(PushNotificationIOS.FetchResult.NoData);

            if (payload.foreground) {
              console.debug(`{notification processed: ${JSON.stringify(payload)}, function: configureNotifications}`);
            }
          },

          onAction: function (notification) {
            console.debug(`{notification: ${JSON.stringify(notification)}, function: configureNotifications}`);
          },

          onRegistrationError: function (err) {
            console.debug(`{error: ${err.message}, function: configureNotifications}`, err);
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

async function cleanUserOptOutFlag() {
  const result = await AsyncStorage.removeItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG);
  console.debug(`{function: cleanUserOptOutFlag, result: ${result}}`);
  return result;
}

async function tryToObtainPermissions(anchor: any): Promise<boolean> {
  if (!isNotificationsCapable) {
    console.debug(`{function: tryToObtainPermissions, result: false}`);
    return false;
  }
  if (await getPushToken()) {
    if (!alreadyConfigured) configureNotifications();
    console.debug(`{function: tryToObtainPermissions, result: true}`);
    return true;
  }

  if (await AsyncStorage.getItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG)) {
    console.debug(`{function: tryToObtainPermissions, result: false}`);
    return false;
  }

  return new Promise(function (resolve) {
    const options = [loc.notifications.no_and_dont_ask, loc.notifications.ask_me_later, loc._.ok];

    ActionSheet.showActionSheetWithOptions(
      {
        title: loc.settings.notifications,
        message: loc.notifications.would_you_like_to_receive_notifications,
        options,
        cancelButtonIndex: 0,
        // @ts-ignore: fix later
        anchor: anchor ? findNodeHandle(anchor.current) : undefined,
      },
      buttonIndex => {
        switch (buttonIndex) {
          case 0:
            AsyncStorage.setItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG, '1').then(() => resolve(false));
            break;
          case 1:
            resolve(false);
            break;
          case 2:
            configureNotifications().then(resolve);
            break;
        }
      },
    );
  });
}

function _getHeaders() {
  return {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
  };
}

async function _sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getLevels(): Promise<Record<string, unknown>> {
  const pushToken = await getPushToken();
  if (!pushToken || !pushToken.token || !pushToken.os) return {};

  try {
    const response: Response | undefined = await Promise.race([
      fetch(`${baseURI}/getTokenConfiguration`, {
        method: 'POST',
        headers: _getHeaders().headers,
        body: JSON.stringify({ token: pushToken.token, os: pushToken.os }),
      }),
      _sleep(3000).then(() => undefined as unknown as Response),
    ]);
    if (!response) {
      console.debug(`{function: getLevels, result: {}}`);
      return {};
    }
    const result = await response.json();
    console.debug(`{function: getLevels, result: ${JSON.stringify(result)}}`);
    return result || {};
  } catch (_) {
    return {};
  }
}

async function majorTomToGroundControl(addresses: string[], hashes: string[], txids: string[]): Promise<object | undefined> {
  if (!Array.isArray(addresses) || !Array.isArray(hashes) || !Array.isArray(txids))
    throw new Error('no addresses or hashes or txids provided');
  const pushToken = await getPushToken();
  if (!pushToken || !pushToken.token || !pushToken.os) return;

  const response = await fetch(`${baseURI}/majorTomToGroundControl`, {
    method: 'POST',
    headers: _getHeaders().headers,
    body: JSON.stringify({ addresses, hashes, txids, token: pushToken.token, os: pushToken.os }),
  });
  const result = await response.json();
  console.debug(`{function: majorTomToGroundControl, result: ${JSON.stringify(result)}}`);
  return result;
}

async function unsubscribe(addresses: string[], hashes: string[], txids: string[]): Promise<object | undefined> {
  if (!Array.isArray(addresses) || !Array.isArray(hashes) || !Array.isArray(txids))
    throw new Error('no addresses or hashes or txids provided');
  const pushToken = await getPushToken();
  if (!pushToken || !pushToken.token || !pushToken.os) return;

  const response = await fetch(`${baseURI}/unsubscribe`, {
    method: 'POST',
    headers: _getHeaders().headers,
    body: JSON.stringify({ addresses, hashes, txids, token: pushToken.token, os: pushToken.os }),
  });
  const result = await response.json();
  console.debug(`{function: unsubscribe, result: ${JSON.stringify(result)}}`);
  console.debug('Abandoning notifications Permissions...');
  PushNotification.abandonPermissions();
  console.debug('Abandoned notifications Permissions...');
  return result;
}

async function isNotificationsEnabled(): Promise<boolean> {
  const levels = await getLevels();
  const result = !!(await getPushToken()) && !!levels.level_all;
  console.debug(`{function: isNotificationsEnabled, result: ${result}}`);
  return result;
}

function getDefaultUri(): string {
  const result = groundControlUri;
  console.debug(`{function: getDefaultUri, result: ${result}}`);
  return result;
}

async function saveUri(uri: string) {
  baseURI = uri || groundControlUri;
  const result = await AsyncStorage.setItem(GROUNDCONTROL_BASE_URI, uri);
  console.debug(`{function: saveUri, result: ${result}}`);
  return result;
}

async function getSavedUri(): Promise<string | null> {
  const result = await AsyncStorage.getItem(GROUNDCONTROL_BASE_URI);
  console.debug(`{function: getSavedUri, result: ${result}}`);
  return result;
}

async function isGroundControlUriValid(uri: string): Promise<boolean> {
  let response: Response | undefined;
  try {
    response = await Promise.race([
      fetch(`${uri}/ping`, { headers: _getHeaders().headers }).then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res;
      }),
      _sleep(2000).then(() => undefined as unknown as Response),
    ]);
  } catch (_) {}

  const result = response ? response.ok : false;
  console.debug(`{function: isGroundControlUriValid, result: ${result}}`);
  return result;
}

async function checkPermissions(): Promise<{ alert: boolean; badge: boolean; sound: boolean }> {
  return new Promise(function (resolve) {
    PushNotification.checkPermissions((result: PushNotificationPermissions) => {
      const permissions = {
        alert: result.alert ?? false,
        badge: result.badge ?? false,
        sound: result.sound ?? false,
      };
      console.debug(`{function: checkPermissions, result: ${JSON.stringify(permissions)}}`);
      resolve(permissions);
    });
  });
}

async function setLevels(levelAll: boolean): Promise<void> {
  const pushToken = await getPushToken();
  if (!pushToken || !pushToken.token || !pushToken.os) return;

  try {
    const response = await fetch(`${baseURI}/setTokenConfiguration`, {
      method: 'POST',
      headers: _getHeaders().headers,
      body: JSON.stringify({ level_all: !!levelAll, token: pushToken.token, os: pushToken.os }),
    });
    const result = await response.json();
    console.debug(`{function: setLevels, result: ${JSON.stringify(result)}}`);
    console.debug('Abandoning notifications Permissions...');
    PushNotification.abandonPermissions();
    console.debug('Abandoned notifications Permissions...');
  } catch (_) {}
}

async function getStoredNotifications(): Promise<object[]> {
  let notifications: object[] = [];
  try {
    const stringified = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE);
    if (stringified) {
      notifications = JSON.parse(stringified);
      if (!Array.isArray(notifications)) notifications = [];
    }
  } catch (_) {}

  console.debug(`{function: getStoredNotifications, result: ${JSON.stringify(notifications)}}`);
  return notifications;
}

async function postTokenConfig(): Promise<void> {
  const pushToken = await getPushToken();
  if (!pushToken || !pushToken.token || !pushToken.os) return;

  try {
    const lang = (await AsyncStorage.getItem('lang')) || 'en';
    const appVersion = `${getSystemName()} ${getSystemVersion()};${getApplicationName()} ${getVersion()}`;

    const response = await fetch(`${baseURI}/setTokenConfiguration`, {
      method: 'POST',
      headers: _getHeaders().headers,
      body: JSON.stringify({ token: pushToken.token, os: pushToken.os, lang, app_version: appVersion }),
    });
    const result = await response.json();
    console.debug(`{function: postTokenConfig, result: ${JSON.stringify(result)}}`);
  } catch (_) {}
}

async function clearStoredNotifications(): Promise<void> {
  const result = await AsyncStorage.setItem(NOTIFICATIONS_STORAGE, JSON.stringify([]));
  console.debug(`{function: clearStoredNotifications, result: ${result}}`);

  // Set the application badge number to zero
  setApplicationIconBadgeNumber(0);
}

function getDeliveredNotifications(): Promise<object[]> {
  return new Promise(resolve => {
    PushNotification.getDeliveredNotifications(notifications => {
      console.debug(`{function: getDeliveredNotifications, result: ${JSON.stringify(notifications)}}`);
      resolve(notifications);
    });
  });
}

function removeDeliveredNotifications(identifiers: string[] = []): void {
  PushNotification.removeDeliveredNotifications(identifiers);
  console.debug(`{function: removeDeliveredNotifications, identifiers: ${JSON.stringify(identifiers)}}`);
}

function removeAllDeliveredNotifications(): void {
  PushNotification.removeAllDeliveredNotifications();
  console.debug(`{function: removeAllDeliveredNotifications}`);
}

(async () => {
  try {
    const baseUriStored = await AsyncStorage.getItem(GROUNDCONTROL_BASE_URI);
    if (baseUriStored) {
      baseURI = baseUriStored;
    }
  } catch (_) {}

  setApplicationIconBadgeNumber(0);

  if (!(await getPushToken())) return;
  await configureNotifications();
  await postTokenConfig();
  console.debug(`{function: anonymous, result: Completed}`);
})();

export {
  _setPushToken,
  getPushToken,
  isNotificationsCapable,
  configureNotifications,
  cleanUserOptOutFlag,
  tryToObtainPermissions,
  _getHeaders,
  _sleep,
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