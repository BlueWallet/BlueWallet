import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { Alert, Platform } from 'react-native';
import Frisbee from 'frisbee';
import { isEmulatorSync } from 'react-native-device-info';
import AsyncStorage from '@react-native-community/async-storage';
import loc from '../loc';
const PushNotification = require('react-native-push-notification');
const constants = require('./constants');
const PUSH_TOKEN = 'PUSH_TOKEN';
let alreadyConfigured = false;

async function _setPushToken(token) {
  token = JSON.stringify(token);
  return AsyncStorage.setItem(PUSH_TOKEN, token);
}

async function _getPushToken() {
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
      onNotification: function (notification) {
        console.log('NOTIFICATION:', notification);

        // process the notification
        PushNotification.setApplicationIconBadgeNumber(0); // always reset badges to zero

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
  if (isEmulatorSync && Platform.OS === 'ios') {
    console.log('Running inside iOS emulator. Exiting Push Notification configuration...');
    return false;
  }
  if (await _getPushToken()) {
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
  const pushToken = await _getPushToken();
  if (!pushToken || !pushToken.token || !pushToken.os) return;

  const api = new Frisbee({ baseURI: constants.groundControlUri });

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
  const pushToken = await _getPushToken();
  if (!pushToken || !pushToken.token || !pushToken.os) return;

  const api = new Frisbee({ baseURI: constants.groundControlUri });

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

// on app launch (load module):
(async () => {
  if (!(await _getPushToken())) return;
  // if we previously had token that means we already acquired permission from the user and it is safe to call
  // `configure` to register callbacks etc
  await configureNotifications();
})();

// every launch should clear badges:
PushNotification.setApplicationIconBadgeNumber(0);

module.exports.tryToObtainPermissions = tryToObtainPermissions;
module.exports.majorTomToGroundControl = majorTomToGroundControl;
module.exports.unsubscribe = unsubscribe;
