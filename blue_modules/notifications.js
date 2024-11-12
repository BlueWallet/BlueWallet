import AsyncStorage from '@react-native-async-storage/async-storage';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { AppState, findNodeHandle, Platform } from 'react-native';
import { getApplicationName, getSystemName, getSystemVersion, getVersion, hasGmsSync, hasHmsSync } from 'react-native-device-info';
import { checkNotifications, requestNotifications } from 'react-native-permissions';
import PushNotification from 'react-native-push-notification';

import loc from '../loc';
import ActionSheet from '../screen/ActionSheet';
import { groundControlUri } from './constants';

const PUSH_TOKEN = 'PUSH_TOKEN';
const GROUNDCONTROL_BASE_URI = 'GROUNDCONTROL_BASE_URI';
const NOTIFICATIONS_STORAGE = 'NOTIFICATIONS_STORAGE';
const NOTIFICATIONS_NO_AND_DONT_ASK_FLAG = 'NOTIFICATIONS_NO_AND_DONT_ASK_FLAG';
let alreadyConfigured = false;
let baseURI = groundControlUri;

// Function to check notification permission status at the system level
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
const handleAppStateChange = async nextAppState => {
  if (nextAppState === 'active') {
    const newPermissionStatus = await checkNotificationPermissionStatus();
    if (newPermissionStatus !== currentPermissionStatus) {
      currentPermissionStatus = newPermissionStatus;
      if (newPermissionStatus === 'granted') {
        // Re-initialize notifications if permissions are granted
        await initializeNotifications();
      } else {
        // Optionally, handle the case where permissions are revoked (e.g., disable in-app notifications)
        console.warn('Notifications have been disabled at the system level.');
      }
    }
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
 * FYI, on Android permissions are acquired when app is installed, so basically we dont need to ask,
 * we can just call `configure`. On iOS its different, and calling `configure` triggers system's dialog box.
 *
 * @returns {Promise<boolean>} TRUE if permissions were obtained, FALSE otherwise
 */
export const tryToObtainPermissions = async anchor => {
  if (!isNotificationsCapable) return false;

  try {
    if (await getPushToken()) {
      // we already have a token, no sense asking again, just configure pushes to register callbacks and we are done
      if (!alreadyConfigured) configureNotifications(); // no await so it executes in background while we return TRUE and use token
      return true;
    }
  } catch (error) {
    console.error('Failed to get push token:', error);
    return false;
  }

  if (await AsyncStorage.getItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG)) {
    // user doesn't want them
    return false;
  }

  return new Promise(function (resolve) {
    const buttons = [loc.notifications.no_and_dont_ask, loc.notifications.ask_me_later, loc._.ok];
    const options = {
      title: loc.settings.notifications,
      message: `${loc.notifications.would_you_like_to_receive_notifications}\n${loc.settings.push_notifications_explanation}`,
      options: buttons,
      cancelButtonIndex: 0, // Assuming 'no and don't ask' is still treated as the cancel action
    };

    if (anchor) {
      options.anchor = findNodeHandle(anchor.current);
    }
    ActionSheet.showActionSheetWithOptions(options, buttonIndex => {
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
    });
  });
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
export const majorTomToGroundControl = async (addresses, hashes, txids) => {
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
  return new Promise(function (resolve) {
    PushNotification.checkPermissions(result => {
      resolve(result);
    });
  });
};

/**
 * Posts to groundcontrol info whether we want to opt in or out of specific notifications level
 *
 * @param levelAll {Boolean}
 * @returns {Promise<*>}
 */
export const setLevels = async levelAll => {
  const pushToken = await getPushToken();
  if (!pushToken || !pushToken.token || !pushToken.os) return;

  try {
    const response = await fetch(`${baseURI}/setTokenConfiguration`, {
      method: 'POST',
      headers: _getHeaders(),
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
      console.debug('Abandoning notifications Permissions...');
      PushNotification.abandonPermissions();
      console.debug('Abandoned notifications Permissions...');
    }
  } catch (e) {
    console.error(e);
  }
};

export const addNotification = async notification => {
  let notifications = [];
  try {
    const stringified = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE);
    notifications = JSON.parse(stringified);
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
  const pushToken = await getPushToken();
  if (!pushToken || !pushToken.token || !pushToken.os) return;

  try {
    const lang = (await AsyncStorage.getItem('lang')) || 'en';
    const appVersion = getSystemName() + ' ' + getSystemVersion() + ';' + getApplicationName() + ' ' + getVersion();

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

const _setPushToken = async token => {
  token = JSON.stringify(token);
  return AsyncStorage.setItem(PUSH_TOKEN, token);
};

/**
 * Calls `configure`, which tries to obtain push token, save it, and registers all associated with
 * notifications callbacks
 *
 * @returns {Promise<boolean>} TRUE if acquired token, FALSE if not
 */
export const configureNotifications = async onProcessNotifications => {
  return new Promise(function (resolve) {
    requestNotifications(['alert', 'sound', 'badge']).then(({ status, _ }) => {
      if (status === 'granted') {
        PushNotification.configure({
          // (optional) Called when Token is generated (iOS and Android)
          onRegister: async token => {
            console.debug('TOKEN:', token);
            alreadyConfigured = true;
            await _setPushToken(token);
            resolve(true);
          },

          // (required) Called when a remote is received or opened, or local notification is opened
          onNotification: async notification => {
            // since we do not know whether we:
            // 1) received notification while app is in background (and storage is not decrypted so wallets are not loaded)
            // 2) opening this notification right now but storage is still unencrypted
            // 3) any of the above but the storage is decrypted, and app wallets are loaded
            //
            // ...we save notification in internal notifications queue thats gona be processed later (on unsuspend with decrypted storage)

            const payload = Object.assign({}, notification, notification.data);
            if (notification.data && notification.data.data) Object.assign(payload, notification.data.data);
            delete payload.data;
            // ^^^ weird, but sometimes payload data is not in `data` but in root level
            console.debug('Received Push Notification Payload: ', payload);

            await addNotification(payload);

            // (required) Called when a remote is received or opened, or local notification is opened
            notification.finish(PushNotificationIOS.FetchResult.NoData);

            // if user is staring at the app when he receives the notification we process it instantly
            // so app refetches related wallet
            if (payload.foreground && onProcessNotifications) {
              await onProcessNotifications();
            }
          },

          // (optional) Called when Registered Action is pressed and invokeApp is false, if true onNotification will be called (Android)
          onAction: notification => {
            console.debug('ACTION:', notification.action);
            console.debug('NOTIFICATION:', notification);

            // process the action
          },

          // (optional) Called when the user fails to register for remote notifications. Typically occurs when APNS is having issues, or the device is a simulator. (iOS)
          onRegistrationError: function (err) {
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
  // …
};

const _sleep = async ms => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Validates whether the provided GroundControl URI is valid by pinging it.
 *
 * @param uri {string}
 * @returns {Promise<boolean>} TRUE if valid, FALSE otherwise
 */
export const isGroundControlUriValid = async uri => {
  let response;
  try {
    response = await Promise.race([fetch(`${uri}/ping`, { headers: _getHeaders() }), _sleep(2000)]);
  } catch (_) {}

  if (!response) return false;

  const json = await response.json();
  return !!json.description;
};

export const isNotificationsCapable = hasGmsSync() || hasHmsSync() || Platform.OS !== 'android';

export const getPushToken = async () => {
  try {
    let token = await AsyncStorage.getItem(PUSH_TOKEN);
    token = JSON.parse(token);
    return token;
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

  return await response.json();
};

/**
 * The opposite of `majorTomToGroundControl` call.
 *
 * @param addresses {string[]}
 * @param hashes {string[]}
 * @param txids {string[]}
 * @returns {Promise<object>} Response object from API rest call
 */
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

export const getDeliveredNotifications = () => {
  return new Promise(resolve => {
    PushNotification.getDeliveredNotifications(notifications => resolve(notifications));
  });
};

export const removeDeliveredNotifications = (identifiers = []) => {
  PushNotification.removeDeliveredNotifications(identifiers);
};

export const setApplicationIconBadgeNumber = function (badges) {
  PushNotification.setApplicationIconBadgeNumber(badges);
};

export const removeAllDeliveredNotifications = () => {
  PushNotification.removeAllDeliveredNotifications();
};

export const getDefaultUri = () => {
  return groundControlUri;
};

export const saveUri = async uri => {
  baseURI = uri || groundControlUri; // setting the url to use currently. if not set - use default
  try {
    await AsyncStorage.setItem(GROUNDCONTROL_BASE_URI, baseURI);
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

export const isNotificationsEnabled = async () => {
  const levels = await getLevels();
  return !!(await getPushToken()) && !!levels.level_all;
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

// on app launch (load module):
export const initializeNotifications = async onProcessNotifications => {
  try {
    const baseUriStored = await AsyncStorage.getItem(GROUNDCONTROL_BASE_URI);
    baseURI = baseUriStored || groundControlUri;
  } catch (e) {
    console.error('Failed to load custom URI, falling back to default', e);
    baseURI = groundControlUri;
    await AsyncStorage.setItem(GROUNDCONTROL_BASE_URI, groundControlUri).catch(err => console.error('Failed to reset URI:', err));
  }

  setApplicationIconBadgeNumber(0);

  try {
    currentPermissionStatus = await checkNotificationPermissionStatus();
    if (currentPermissionStatus === 'granted' && (await getPushToken())) {
      await configureNotifications(onProcessNotifications);
      await postTokenConfig();
    } else {
      console.warn('Notifications are disabled at the system level.');
    }
  } catch (error) {
    console.error('Failed to initialize notifications:', error);
  }
};
