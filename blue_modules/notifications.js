import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { Alert, Platform } from 'react-native';
import { AppStorage } from '../class';
import Frisbee from 'frisbee';
const PushNotification = require('react-native-push-notification');
const BlueApp: AppStorage = require('../BlueApp');
let alreadyConfigured = false;

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
        await BlueApp.setPushToken(token);
        resolve(true);
      },

      // (required) Called when a remote is received or opened, or local notification is opened
      onNotification: function (notification) {
        console.log('NOTIFICATION:', notification);

        // process the notification

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
 * On iOS (if we dont have a token) it will show alert asking whether
 * user wants to receive notifications, and if yes - will configure push notifications.
 * On Android does nothing as push permissions are acquiered when app is installed.
 *
 * @returns {Promise<boolean>} TRUE if permissions were obtained, FALSE otherwise
 */
const tryToObtainPermissions = async function () {
  if (Platform.OS !== 'ios') {
    return !!(await BlueApp.getPushToken());
  }

  if (await BlueApp.getPushToken()) {
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
          text: 'Yeah why not',
          onPress: async () => {
            resolve(await configureNotifications());
          },
          style: 'default',
        },
        {
          text: 'Ask me later',
          onPress: () => {
            resolve(false);
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
 * @returns {Promise<object>} Response object from API rest call
 */
const majorTomToGroundControl = async function (addresses, hashes) {
  if (!Array.isArray(addresses) || !Array.isArray(hashes)) throw new Error('no addresses or hashes provided');
  const pushToken = await BlueApp.getPushToken();
  if (!pushToken || !pushToken.token || !pushToken.os) return;

  const baseURI = 'https://groundcontrol-dev.herokuapp.com/';
  const api = new Frisbee({ baseURI: baseURI });

  const response = await api.post(
    '/majorTomToGroundControl',
    Object.assign({}, _getHeaders(), {
      body: {
        addresses,
        hashes,
        token: pushToken.token,
        os: pushToken.os,
      },
    }),
  );

  console.warn(response);
  return response;
};

// on Android permissions are acquired when app is installed, so it is safe to setup push notifications as soon as
// this module loads (app launches)
if (Platform.OS === 'android') {
  configureNotifications();
}

module.exports.tryToObtainPermissions = tryToObtainPermissions;
module.exports.majorTomToGroundControl = majorTomToGroundControl;
