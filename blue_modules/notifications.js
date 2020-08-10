import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { Alert, Platform } from 'react-native';
import Frisbee from 'frisbee';
import { getApplicationName, getVersion, getSystemName, isEmulatorSync, getSystemVersion } from 'react-native-device-info';
import AsyncStorage from '@react-native-community/async-storage';
import loc from '../loc';
const PushNotification = require('react-native-push-notification');
const constants = require('./constants');
const EV = require('./events');
const PUSH_TOKEN = 'PUSH_TOKEN';
const GROUNDCONTROL_BASE_URI = 'GROUNDCONTROL_BASE_URI';
const NOTIFICATIONS_STORAGE = 'NOTIFICATIONS_STORAGE';
let alreadyConfigured = false;
let baseURI = constants.groundControlUri;

async function _setPushToken(token) {
  token = JSON.stringify(token);
  return AsyncStorage.setItem(PUSH_TOKEN, token);
}

async function getPushToken() {
  try {
    let token = await AsyncStorage.getItem(PUSH_TOKEN);
    token = JSON.parse(token);
    return token;
  } catch (_) {}
  return false;
}

/**
 * Calls `configure`, which tries to obtain push token, save it, and registers all associated with
 * notifications callbacks
 *
 * @returns {Promise<boolean>} TRUE if acquired token, FALSE if not
 */
const configureNotifications = async function () {
  return new Promise(function (resolve) {
    PushNotification.configure({
      // (optional) Called when Token is generated (iOS and Android)
      onRegister: async function (token) {
        console.log('TOKEN:', token);
        alreadyConfigured = true;
        await _setPushToken(token);
        resolve(true);
      },

      // (required) Called when a remote is received or opened, or local notification is opened
      onNotification: async function (notification) {
        // since we do not know whether we:
        // 1) received notification while app is in background (and storage is not decrypted so wallets are not loaded)
        // 2) opening this notification right now but storage is still unencrypted
        // 3) any of the above but the storage is decrypted, and app wallets are loaded
        //
        // ...we save notification in internal notifications queue thats gona be processed later (on unsuspend with decrypted storage)

        if (Platform.OS === 'ios' && notification.foreground === true && notification.userInteraction === false) {
          // iOS hack
          // @see https://github.com/zo0r/react-native-push-notification/issues/1585
          notification.userInteraction = true;
          // also, on iOS app is not suspending/unsuspending when user taps a notification bubble,so we simulate it
          // since its where we actually handle notifications:
          setTimeout(() => EV(EV.enum.PROCESS_PUSH_NOTIFICATIONS), 500);
        }

        let notifications = [];
        try {
          const stringified = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE);
          notifications = JSON.parse(stringified);
          if (!Array.isArray(notifications)) notifications = [];

          const payload = Object.assign({}, notification, notification.data);
          if (notification.data && notification.data.data) Object.assign(payload, notification.data.data);
          delete payload.data;
          // ^^^ weird, but sometimes payload data is not in `data` but in root level

          notifications.push(payload);
          await AsyncStorage.setItem(NOTIFICATIONS_STORAGE, JSON.stringify(notifications));
        } catch (_) {}

        // (required) Called when a remote is received or opened, or local notification is opened
        notification.finish(PushNotificationIOS.FetchResult.NoData);
      },

      // (optional) Called when Registered Action is pressed and invokeApp is false, if true onNotification will be called (Android)
      onAction: function (notification) {
        console.log('ACTION:', notification.action);
        console.log('NOTIFICATION:', notification);

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
  });
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
const tryToObtainPermissions = async function () {
  if (isEmulatorSync() && Platform.OS === 'ios') {
    console.log('Running inside iOS emulator. Exiting Push Notification configuration...');
    return false;
  }
  if (await getPushToken()) {
    // we already have a token, no sense asking again, just configure pushes to register callbacks and we are done
    if (!alreadyConfigured) configureNotifications(); // no await so it executes in background while we return TRUE and use token
    return true;
  }

  return new Promise(function (resolve) {
    Alert.alert(
      'Would you like to receive notifications when you get incoming payments?',
      '',
      [
        {
          text: 'Ask Me Later',
          onPress: () => {
            resolve(false);
          },
          style: 'cancel',
        },
        {
          text: loc._.ok,
          onPress: async () => {
            resolve(await configureNotifications());
          },
          style: 'default',
        },
      ],
      { cancelable: false },
    );
  });
};

function _getHeaders() {
  return {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
  };
}

async function _sleep(ms) {
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
const majorTomToGroundControl = async function (addresses, hashes, txids) {
  if (!Array.isArray(addresses) || !Array.isArray(hashes) || !Array.isArray(txids))
    throw new Error('no addresses or hashes or txids provided');
  const pushToken = await getPushToken();
  if (!pushToken || !pushToken.token || !pushToken.os) return;

  const api = new Frisbee({ baseURI });

  return await api.post(
    '/majorTomToGroundControl',
    Object.assign({}, _getHeaders(), {
      body: {
        addresses,
        hashes,
        txids,
        token: pushToken.token,
        os: pushToken.os,
      },
    }),
  );
};

/**
 * The opposite of `majorTomToGroundControl` call.
 *
 * @param addresses {string[]}
 * @param hashes {string[]}
 * @param txids {string[]}
 * @returns {Promise<object>} Response object from API rest call
 */
const unsubscribe = async function (addresses, hashes, txids) {
  if (!Array.isArray(addresses) || !Array.isArray(hashes) || !Array.isArray(txids))
    throw new Error('no addresses or hashes or txids provided');
  const pushToken = await getPushToken();
  if (!pushToken || !pushToken.token || !pushToken.os) return;

  const api = new Frisbee({ baseURI });

  return await api.post(
    '/unsubscribe',
    Object.assign({}, _getHeaders(), {
      body: {
        addresses,
        hashes,
        txids,
        token: pushToken.token,
        os: pushToken.os,
      },
    }),
  );
};

const isNotificationsEnabled = async function () {
  const levels = await getLevels();

  return !!(await getPushToken()) && !!levels.level_all;
};

const getDefaultUri = function () {
  return constants.groundControlUri;
};

const saveUri = async function (uri) {
  baseURI = uri || constants.groundControlUri; // settign the url to use currently. if not set - use default
  return AsyncStorage.setItem(GROUNDCONTROL_BASE_URI, uri);
};

const getSavedUri = async function () {
  return AsyncStorage.getItem(GROUNDCONTROL_BASE_URI);
};

const isGroundControlUriValid = async function (uri) {
  const apiCall = new Frisbee({
    baseURI: uri,
  });
  let response;
  try {
    response = await Promise.race([apiCall.get('/ping', _getHeaders()), _sleep(2000)]);
  } catch (_) {}

  if (!response || !response.body) return false; // either sleep expired or apiCall threw an exception

  const json = response.body;
  if (json.description) return true;

  return false;
};

/**
 * Returns a permissions object:
 * alert: boolean
 * badge: boolean
 * sound: boolean
 *
 * @returns {Promise<Object>}
 */
const checkPermissions = async function () {
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
const setLevels = async function (levelAll) {
  const pushToken = await getPushToken();
  if (!pushToken || !pushToken.token || !pushToken.os) return;

  const api = new Frisbee({ baseURI });

  try {
    await api.post(
      '/setTokenConfiguration',
      Object.assign({}, _getHeaders(), {
        body: {
          level_all: !!levelAll,
          token: pushToken.token,
          os: pushToken.os,
        },
      }),
    );
  } catch (_) {}
};

/**
 * Queries groundcontrol for token configuration, which contains subscriptions to notification levels
 *
 * @returns {Promise<{}|*>}
 */
const getLevels = async function () {
  const pushToken = await getPushToken();
  if (!pushToken || !pushToken.token || !pushToken.os) return;

  const api = new Frisbee({ baseURI });

  let response;
  try {
    response = await Promise.race([
      api.post('/getTokenConfiguration', Object.assign({}, _getHeaders(), { body: { token: pushToken.token, os: pushToken.os } })),
      _sleep(3000),
    ]);
  } catch (_) {}

  if (!response || !response.body) return {}; // either sleep expired or apiCall threw an exception

  return response.body;
};

const getStoredNotifications = async function () {
  let notifications = [];
  try {
    const stringified = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE);
    notifications = JSON.parse(stringified);
    if (!Array.isArray(notifications)) notifications = [];
  } catch (_) {}

  return notifications;
};

const postTokenConfig = async function () {
  const pushToken = await getPushToken();
  if (!pushToken || !pushToken.token || !pushToken.os) return;

  const api = new Frisbee({ baseURI });

  try {
    const lang = (await AsyncStorage.getItem('lang')) || 'en';
    const appVersion = getSystemName() + ' ' + getSystemVersion() + ';' + getApplicationName() + ' ' + getVersion();

    await api.post(
      '/setTokenConfiguration',
      Object.assign({}, _getHeaders(), {
        body: {
          token: pushToken.token,
          os: pushToken.os,
          lang,
          app_version: appVersion,
        },
      }),
    );
  } catch (_) {}
};

const clearStoredNotifications = async function () {
  try {
    await AsyncStorage.setItem(NOTIFICATIONS_STORAGE, JSON.stringify([]));
  } catch (_) {}
};

const setApplicationIconBadgeNumber = function (badges) {
  PushNotification.setApplicationIconBadgeNumber(badges);
};

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
  await configureNotifications();
  await postTokenConfig();
})();

module.exports.tryToObtainPermissions = tryToObtainPermissions;
module.exports.majorTomToGroundControl = majorTomToGroundControl;
module.exports.unsubscribe = unsubscribe;
module.exports.isNotificationsEnabled = isNotificationsEnabled;
module.exports.getDefaultUri = getDefaultUri;
module.exports.saveUri = saveUri;
module.exports.isGroundControlUriValid = isGroundControlUriValid;
module.exports.getSavedUri = getSavedUri;
module.exports.getPushToken = getPushToken;
module.exports.checkPermissions = checkPermissions;
module.exports.setLevels = setLevels;
module.exports.getStoredNotifications = getStoredNotifications;
module.exports.clearStoredNotifications = clearStoredNotifications;
module.exports.setApplicationIconBadgeNumber = setApplicationIconBadgeNumber;
