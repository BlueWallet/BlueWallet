import AsyncStorage from '@react-native-async-storage/async-storage';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { findNodeHandle, Platform } from 'react-native';
import Keychain from 'react-native-keychain';
import { getApplicationName, getSystemName, getSystemVersion, getVersion, hasGmsSync, hasHmsSync } from 'react-native-device-info';
import { requestNotifications } from 'react-native-permissions';
import PushNotification from 'react-native-push-notification';

import loc from '../loc';
import ActionSheet from '../screen/ActionSheet';
import { groundControlUri } from './constants';

const GROUNDCONTROL_BASE_URI = 'GROUNDCONTROL_BASE_URI';
const NOTIFICATIONS_STORAGE = 'NOTIFICATIONS_STORAGE';
const NOTIFICATION_TOKEN_KEY = 'notification_token';
const NOTIFICATION_LEVEL_KEY = 'notification_level';
export const NOTIFICATIONS_NO_AND_DONT_ASK_FLAG = 'NOTIFICATIONS_NO_AND_DONT_ASK_FLAG';
let baseURI = groundControlUri;

let cachedIsNotificationsEnabled = null;

export const getNotificationConfig = async () => {
  console.warn('getNotificationConfig');
  try {
    const systemPermissions = await checkPermissions();

    console.warn('systemPermissions', systemPermissions);
    const notificationsDisabled = await AsyncStorage.getItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG);
    console.warn('notificationsDisabled', notificationsDisabled);
    if (notificationsDisabled === 'true') {
      return null;
    }
    console.warn('getNotificationConfig 2');

    const token = (await Keychain.getGenericPassword({ service: NOTIFICATION_TOKEN_KEY }))?.password || null;
    const level_all = (await Keychain.getGenericPassword({ service: NOTIFICATION_LEVEL_KEY }))?.password;
    console.warn('token level_all', token, level_all);

    if (level_all && systemPermissions.alert !== JSON.parse(level_all)) {
      await Keychain.setGenericPassword(NOTIFICATIONS_STORAGE, JSON.stringify(systemPermissions.alert), { service: NOTIFICATION_LEVEL_KEY });
    }

    console.debug('Notification config:', { token, level_all: systemPermissions.alert });
    return { token, level_all: systemPermissions.alert };
  } catch (e) {
    console.error('Error retrieving notification configuration:', e);
    return null;
  }
};


export const setNotificationConfig = async ({ token, level_all }) => {
  try {
    await AsyncStorage.removeItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG);

    if (token) {
      await Keychain.setGenericPassword(NOTIFICATIONS_STORAGE, token, { service: NOTIFICATION_TOKEN_KEY });
    }
    if (level_all !== undefined) {
      await Keychain.setGenericPassword(NOTIFICATIONS_STORAGE, JSON.stringify(level_all), { service: NOTIFICATION_LEVEL_KEY });
    }
  } catch (e) {
    console.error('Failed to store notification config:', e);
  }
};


function Notifications() {
  const postTokenConfig = async () => {
    const token = await getPushToken();
    if (!token || !token.token || !token.os) return;

    try {
      const lang = (await AsyncStorage.getItem('lang')) || 'en';
      const appVersion = getSystemName() + ' ' + getSystemVersion() + ';' + getApplicationName() + ' ' + getVersion();

      const response = await fetch(`${baseURI}/setTokenConfiguration`, {
        method: 'POST',
        headers: _getHeaders(),
        body: JSON.stringify({
          token: token.token,
          os: token.os,
          lang,
          app_version: appVersion,
        }),
      });

      if (response.ok) {
        const currentConfig = (await getNotificationConfig()) || {};
        await setNotificationConfig({ ...currentConfig, token: token.token, os: token.os, lang, app_version: appVersion });
      }
    } catch (e) {
      console.error(e);
      await AsyncStorage.setItem('lang', 'en');
      throw e;
    }
  };

  (async () => {
    try {
      const baseUriStored = await AsyncStorage.getItem(GROUNDCONTROL_BASE_URI);
      if (baseUriStored) {
        baseURI = baseUriStored;
      }
    } catch (e) {
      console.error(e);
      console.warn('Failed to load custom URI, falling back to default');
      baseURI = groundControlUri;
      AsyncStorage.setItem(GROUNDCONTROL_BASE_URI, groundControlUri).catch(err => console.error('Failed to reset URI:', err));
    }

    setApplicationIconBadgeNumber(0);

    if (!(await getPushToken())) {
      await configureNotifications();
    }

    if (await getPushToken()) {
      await postTokenConfig();
    }
  })();
  return null;
}

const _getHeaders = () => {
  return {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };
};

/**
 * Calls `configure`, which tries to obtain push token, save it, and registers all associated with
 * notifications callbacks
 *
 * @returns {Promise<boolean>} TRUE if acquired token, FALSE if not
 */
const configureNotifications = async onProcessNotifications => {
  return new Promise(resolve => {
    requestNotifications(['alert', 'sound', 'badge']).then(({ status, _ }) => {
      if (status === 'granted') {
        PushNotification.configure({
          onRegister: async token => {
            cachedIsNotificationsEnabled = true;
            resolve(true);
          },
          onNotification: async notification => {
            const payload = Object.assign({}, notification, notification.data);
            if (notification.data && notification.data.data) Object.assign(payload, notification.data.data);
            delete payload.data;
            console.debug('got push notification', payload);

            await addNotification(payload);

            notification.finish(PushNotificationIOS.FetchResult.NoData);

            if (payload.foreground && typeof onProcessNotifications === 'function') {
              onProcessNotifications();
            }
          },
          onAction: notification => {
            console.debug('ACTION:', notification.action);
            console.debug('NOTIFICATION:', notification);
          },
          onRegistrationError: err => {
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
      } else {
        resolve(false);
      }
    });
  });
};


export const clearNotificationConfig = async () => {
  try {
    await Keychain.resetGenericPassword({ service: NOTIFICATION_TOKEN_KEY }); 
    await Keychain.resetGenericPassword({ service: NOTIFICATION_LEVEL_KEY });
    await AsyncStorage.setItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG, 'true');
    cachedIsNotificationsEnabled = false; 
  } catch (e) {
    console.error('Failed to clear notification config:', e);
  }
};

export const tryToObtainPermissions = async function (anchor) {
  if (!(await isNotificationsCapable())) return false;
  
  if (await getPushToken()) return true;

  const noAndDontAskFlag = await AsyncStorage.getItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG);
  if (noAndDontAskFlag) return false;

  return new Promise(resolve => {
    const options = [loc.notifications.no_and_dont_ask, loc.notifications.ask_me_later, loc._.ok];
    const parameters = {
      title: loc.settings.notifications,
      message: loc.notifications.would_you_like_to_receive_notifications,
      options,
      cancelButtonIndex: 0,
      ...(anchor && { anchor: findNodeHandle(anchor) }),
    };
    ActionSheet.showActionSheetWithOptions(parameters, buttonIndex => {
      switch (buttonIndex) {
        case 0:
          AsyncStorage.setItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG, '1').then(() => resolve(false));
          break;
        case 1:
          resolve(false);
          break;
        case 2:
          configureNotifications().then(resolve).catch(() => resolve(false));
          break;
        default:
          resolve(false);
          break;
      }
    });
  });
};

export const isNotificationsEnabled = async () => {
  if (cachedIsNotificationsEnabled !== null) {
    return cachedIsNotificationsEnabled;
  }

  const token = (await Keychain.getGenericPassword(NOTIFICATION_TOKEN_KEY))?.password || null;
  const level_all = JSON.parse((await Keychain.getGenericPassword(NOTIFICATION_LEVEL_KEY))?.password || 'false');

  cachedIsNotificationsEnabled = !!token && !!level_all;
  return cachedIsNotificationsEnabled;
};
export const getPushToken = async () => {
  console.log('Attempting to retrieve push token');
  return new Promise((resolve, reject) => {
    PushNotification.configure({
      onRegister: token => {
        console.log('Push token received:', token);  
        resolve(token);
      },
      onRegistrationError: err => {
        console.error('Error during token registration:', err); 
        reject(err);
      },
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      popInitialNotification: true,
      requestPermissions: true, 
    });
  });
};

const addNotification = async notification => {
  let notifications = [];
  try {
    const stringified = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE);
    notifications = JSON.parse(stringified);
    if (!Array.isArray(notifications)) notifications = [];
  } catch (e) {
    console.error(e);
    notifications = [];
  }

  notifications.push(notification);
  await AsyncStorage.setItem(NOTIFICATIONS_STORAGE, JSON.stringify(notifications));
};

export const clearStoredNotifications = async () => {
  try {
    await AsyncStorage.setItem(NOTIFICATIONS_STORAGE, JSON.stringify([]));
  } catch (e) {
    console.error('Error clearing notifications:', e);
    throw e;
  }
};

export const getDeliveredNotifications = async () => {
  return new Promise(resolve => {
    PushNotification.getDeliveredNotifications(notifications => resolve(notifications));
  });
};

export const removeDeliveredNotifications = (identifiers = []) => {
  PushNotification.removeDeliveredNotifications(identifiers);
};

export const setApplicationIconBadgeNumber = badges => {
  PushNotification.setApplicationIconBadgeNumber(badges);
};

export const removeAllDeliveredNotifications = () => {
  PushNotification.removeAllDeliveredNotifications();
};

export const isGroundControlUriValid = async uri => {
  let response;
  try {
    response = await Promise.race([fetch(`${uri}/ping`, { headers: _getHeaders() }), _sleep(2000)]);
  } catch (_) {}

  if (!response) return false;

  const json = await response.json();
  return !!json.description;
};

export const checkPermissions = async () => {
  return new Promise(resolve => {
    PushNotification.checkPermissions(result => {
      resolve(result);
    });
  });
};

export const getStoredNotifications = async () => {
  let notifications = [];
  try {
    const stringified = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE);
    notifications = JSON.parse(stringified);
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

export const unsubscribe = async (addresses, hashes, txids) => {
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

    console.debug('Abandoning notifications permissions...');
    PushNotification.abandonPermissions();
    console.debug('Abandoned notifications permissions');
    cachedIsNotificationsEnabled = false;

    return response;
  } catch (error) {
    console.error('Error during unsubscribe:', error);
    throw error;
  }
};

const _sleep = async ms => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const majorTomToGroundControl = async (addresses, hashes, txids) => {
  try {
    if (!Array.isArray(addresses) || !Array.isArray(hashes) || !Array.isArray(txids)) {
      throw new Error('No addresses, hashes, or txids provided');
    }

    const token = await getPushToken();
    if (!token || !token.token || !token.os) {
      return;
    }

    const requestBody = JSON.stringify({
      addresses,
      hashes,
      txids,
      token: token.token,
      os: token.os,
    });

    let response;
    try {
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
      return {};
    }
  } catch (error) {
    console.error('Error in majorTomToGroundControl:', error);
  }
};

export const getLevels = async () => {
  const config = await getNotificationConfig();
  if (!config?.token || !config?.os) return {};

  let response;
  try {
    response = await Promise.race([
      fetch(`${baseURI}/getTokenConfiguration`, {
        method: 'POST',
        headers: _getHeaders(),
        body: JSON.stringify({
          token: config.token,
          os: config.os,
        }),
      }),
      _sleep(3000),
    ]);
  } catch (e) {
    console.error(e);
    throw e;
  }

  if (!response) return {};

  const levels = await response.json();
  await setNotificationConfig({ ...config, level_all: levels.level_all });
  return levels;
};

export const setLevels = async levelAll => {
  const config = await getNotificationConfig();
  if (!config?.token || !config?.os) return;

  try {
    await fetch(`${baseURI}/setTokenConfiguration`, {
      method: 'POST',
      headers: _getHeaders(),
      body: JSON.stringify({
        level_all: !!levelAll,
        token: config.token,
        os: config.os,
      }),
    });
    cachedIsNotificationsEnabled = !!levelAll;
    await setNotificationConfig({ ...config, level_all: levelAll });
  } catch (e) {
    console.error(e);
    throw e;
  }
  console.warn('setLevels done');
};

export const isNotificationsCapable = hasGmsSync() || hasHmsSync() || Platform.OS !== 'android';

export const getDefaultUri = () => {
  return groundControlUri;
};

export const saveUri = async uri => {
  baseURI = uri || groundControlUri;
  try {
    await AsyncStorage.setItem(GROUNDCONTROL_BASE_URI, groundControlUri);
  } catch (storageError) {
    console.error('Failed to reset URI:', storageError);
    throw storageError;
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

export const cleanUserOptOutFlag = async () => {
  cachedIsNotificationsEnabled = null;
  return AsyncStorage.removeItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG);
};

export default Notifications;