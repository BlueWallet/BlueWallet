// notifications.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import { findNodeHandle, Platform } from 'react-native';
import { getApplicationName, getSystemName, getSystemVersion, getVersion, hasGmsSync, hasHmsSync } from 'react-native-device-info';
import { requestNotifications } from 'react-native-permissions';
import { Notifications as WixNotifications, Notification, NotificationCompletion, RegistrationError } from 'react-native-notifications';

import loc from '../loc';
import ActionSheet from '../screen/ActionSheet';
import { groundControlUri } from './constants';

// Constants
const PUSH_TOKEN_KEY = 'PUSH_TOKEN';
const GROUNDCONTROL_BASE_URI_KEY = 'GROUNDCONTROL_BASE_URI';
const NOTIFICATIONS_STORAGE_KEY = 'NOTIFICATIONS_STORAGE';
const NOTIFICATIONS_NO_AND_DONT_ASK_FLAG_KEY = 'NOTIFICATIONS_NO_AND_DONT_ASK_FLAG';

// Variables
let alreadyConfigured = false;
let baseURI: string = groundControlUri;
let onProcessNotificationsCallback: (() => void) | null = null;

// Type Definitions
interface PushToken {
  token: string;
  os: string;
}

interface NotificationPayload {
  [key: string]: any;
}

// Utility Functions
const getHeaders = (): Record<string, string> => ({
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
});

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Stores the push token in AsyncStorage.
 */
const setPushToken = async (token: PushToken): Promise<void> => {
  const tokenString = JSON.stringify(token);
  await AsyncStorage.setItem(PUSH_TOKEN_KEY, tokenString);
};

/**
 * Retrieves the push token from AsyncStorage.
 */
export const getPushToken = async (): Promise<PushToken | null> => {
  try {
    const tokenString = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (tokenString) {
      return JSON.parse(tokenString) as PushToken;
    }
  } catch (error) {
    console.error('Error retrieving push token:', error);
  }
  return null;
};

/**
 * Handles incoming notifications by saving them and optionally processing immediately.
 */
const handleNotification = async (notification: NotificationPayload): Promise<void> => {
  const payload = { ...notification };
  console.debug('Got push notification', payload);

  await addNotification(payload);

  // If the app is in the foreground and a callback is set, process notifications immediately
  if (payload.foreground && onProcessNotificationsCallback) {
    onProcessNotificationsCallback();
  }
};

/**
 * Configures Wix Notifications: registers event listeners and requests permissions.
 *
 * @param onProcessNotifications - Callback to process notifications when app is active
 * @returns {Promise<boolean>} TRUE if permissions granted and token acquired, FALSE otherwise
 */
export const configureNotifications = async (onProcessNotifications: () => void): Promise<boolean> => {
  return new Promise<boolean>(resolve => {
    onProcessNotificationsCallback = onProcessNotifications;

    // Register for remote notifications
    WixNotifications.registerRemoteNotifications();

    // Listener for successful registration
    const onRegister = WixNotifications.events().registerRemoteNotificationsRegistered(async (event: { deviceToken: string }) => {
      console.debug('TOKEN:', event.deviceToken);
      alreadyConfigured = true;
      await setPushToken({ token: event.deviceToken, os: Platform.OS });
      resolve(true);
      // Remove listeners to prevent memory leaks
      onRegister.remove();
      onRegistrationError.remove();
      onNotificationReceived.remove();
      onNotificationOpened.remove();
    });

    // Listener for registration errors
    const onRegistrationError = WixNotifications.events().registerRemoteNotificationsRegistrationFailed((error: RegistrationError) => {
      console.error('Registration Error:', error);
      resolve(false);
      // Remove listeners to prevent memory leaks
      onRegister.remove();
      onRegistrationError.remove();
      onNotificationReceived.remove();
      onNotificationOpened.remove();
    });

    // Listener for notifications received in foreground
    const onNotificationReceived = WixNotifications.events().registerNotificationReceivedForeground(
      (notification: Notification, completion: (response: NotificationCompletion) => void) => {
        handleNotification(notification.payload);
        completion({ alert: false, sound: false, badge: false }); // Adjust based on desired behavior
      },
    );

    // Listener for notifications opened (background or app killed)
    const onNotificationOpened = WixNotifications.events().registerNotificationOpened(
      (notification: Notification, completion: (response: NotificationCompletion) => void) => {
        handleNotification(notification.payload);
        completion({ alert: true, sound: true, badge: true }); // Adjust based on desired behavior
      },
    );
  });
};

/**
 * Removes the user opt-out flag from AsyncStorage.
 */
export const cleanUserOptOutFlag = async (): Promise<void> => {
  await AsyncStorage.removeItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG_KEY);
};

/**
 * Should be called when the user is most interested in receiving push notifications.
 * If a token isn't available, it will show an alert asking whether
 * the user wants to receive notifications. If yes, it will configure notifications.
 *
 * @param anchor - Optional anchor for ActionSheet (Android)
 * @param onProcessNotifications - Callback to process notifications when app is active
 * @returns {Promise<boolean>} TRUE if permissions were obtained, FALSE otherwise
 */
export const tryToObtainPermissions = async (anchor?: React.RefObject<any>, onProcessNotifications?: () => void): Promise<boolean> => {
  if (!isNotificationsCapable()) return false;

  const existingToken = await getPushToken();
  if (existingToken) {
    // We already have a token, no need to ask again. Just configure notifications if not already done
    if (!alreadyConfigured && onProcessNotifications) {
      configureNotifications(onProcessNotifications).catch(error => {
        console.error('Error configuring notifications:', error);
      });
    }
    return true;
  }

  const userOptOut = await AsyncStorage.getItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG_KEY);
  if (userOptOut) {
    // User opted out of notifications
    return false;
  }

  return new Promise<boolean>(resolve => {
    const options = [loc.notifications.no_and_dont_ask, loc.notifications.ask_me_later, loc._.ok];
    let anchorRef: number | undefined;
    if (anchor?.current) {
      anchorRef = findNodeHandle(anchor.current) ?? undefined;
    }

    ActionSheet.showActionSheetWithOptions(
      {
        title: loc.settings.notifications,
        message: loc.notifications.would_you_like_to_receive_notifications,
        options,
        cancelButtonIndex: 0, // 'No and don't ask' is the cancel action
        anchor: anchorRef,
      },
      buttonIndex => {
        switch (buttonIndex) {
          case 0:
            // User selected 'No and don't ask'
            AsyncStorage.setItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG_KEY, '1').then(() => resolve(false));
            break;
          case 1:
            // User selected 'Ask me later'
            resolve(false);
            break;
          case 2:
            // User selected 'OK', proceed to configure notifications
            if (onProcessNotifications) {
              configureNotifications(onProcessNotifications)
                .then(resolve)
                .catch(() => resolve(false));
            } else {
              // If no callback is provided, use a default no-op
              configureNotifications(() => {})
                .then(resolve)
                .catch(() => resolve(false));
            }
            break;
          default:
            resolve(false);
            break;
        }
      },
    );
  });
};

/**
 * Submits on-chain Bitcoin addresses and LN invoice preimage hashes to GroundControl server.
 *
 * @param addresses - Array of Bitcoin addresses
 * @param hashes - Array of LN invoice preimage hashes
 * @param txids - Array of transaction IDs
 * @returns {Promise<any>} Response object from API call
 */
export const majorTomToGroundControl = async (addresses: string[], hashes: string[], txids: string[]): Promise<any> => {
  if (!addresses.length && !hashes.length && !txids.length) {
    throw new Error('No addresses, hashes, or txids provided');
  }

  const pushToken = await getPushToken();
  if (!pushToken || !pushToken.token || !pushToken.os) return;

  try {
    const response = await fetch(`${baseURI}/majorTomToGroundControl`, {
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

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error in majorTomToGroundControl:', error);
    throw error;
  }
};

/**
 * Unsubscribes from GroundControl notifications.
 *
 * @param addresses - Array of Bitcoin addresses
 * @param hashes - Array of LN invoice preimage hashes
 * @param txids - Array of transaction IDs
 * @returns {Promise<any>} Response object from API call
 */
export const unsubscribe = async (addresses: string[], hashes: string[], txids: string[]): Promise<any> => {
  if (!addresses.length && !hashes.length && !txids.length) {
    throw new Error('No addresses, hashes, or txids provided');
  }

  const pushToken = await getPushToken();
  if (!pushToken || !pushToken.token || !pushToken.os) return;

  try {
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

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    console.debug('Unsubscribed from notifications successfully.');
    return response.json();
  } catch (error) {
    console.error('Error in unsubscribe:', error);
    throw error;
  }
};

/**
 * Checks if notifications are enabled.
 *
 * @returns {Promise<boolean>} TRUE if enabled, FALSE otherwise
 */
export const isNotificationsEnabled = async (): Promise<boolean> => {
  const levels = await getLevels();
  console.debug('Notification levels:', levels);
  const tokenExists = !!(await getPushToken());
  console.debug('Token exists:', tokenExists);
  return tokenExists && !!levels.level_all;
};

/**
 * Retrieves the default GroundControl URI.
 *
 * @returns {string} The default GroundControl URI
 */
export const getDefaultUri = (): string => {
  return groundControlUri;
};

/**
 * Saves a custom GroundControl URI.
 *
 * @param uri - The URI to save (must be a non-null string)
 * @returns {Promise<void>}
 */
export const saveUri = async (uri: string): Promise<void> => {
  baseURI = uri || groundControlUri; // Use the provided URI or default
  await AsyncStorage.setItem(GROUNDCONTROL_BASE_URI_KEY, uri);
};

/**
 * Retrieves the saved GroundControl URI.
 *
 * @returns {Promise<string | null>} The saved URI or null
 */
export const getSavedUri = async (): Promise<string | null> => {
  return await AsyncStorage.getItem(GROUNDCONTROL_BASE_URI_KEY);
};

/**
 * Validates whether the provided GroundControl URI is valid by pinging it.
 *
 * @param uri - The URI to validate
 * @returns {Promise<boolean>} TRUE if valid, FALSE otherwise
 */
export const isGroundControlUriValid = async (uri: string): Promise<boolean> => {
  let response: void | Response;
  try {
    response = await Promise.race([fetch(`${uri}/ping`, { headers: getHeaders() }), sleep(2000)]);
  } catch (error) {
    console.error('Error pinging GroundControl URI:', error);
    return false;
  }

  if (!response) return false;

  try {
    const json = await response.json();
    return !!json.description;
  } catch (error) {
    console.error('Error parsing GroundControl ping response:', error);
    return false;
  }
};

/**
 * Checks the current notification permissions.
 *
 * @returns {Promise<{ alert: boolean; badge: boolean; sound: boolean }>} The permissions object
 */
export const checkPermissions = async (): Promise<{ alert: boolean; badge: boolean; sound: boolean }> => {
  const settings = await requestNotifications(['alert', 'sound', 'badge']);
  const granted = settings.status === 'granted';
  return {
    alert: granted,
    badge: granted,
    sound: granted,
  };
};

/**
 * Sets the notification levels by posting to GroundControl.
 *
 * @param levelAll - Whether to enable all notification levels
 * @returns {Promise<void>}
 */
export const setLevels = async (levelAll: boolean): Promise<void> => {
  const pushToken = await getPushToken();
  if (!pushToken || !pushToken.token || !pushToken.os) return;

  try {
    const response = await fetch(`${baseURI}/setTokenConfiguration`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        level_all: !!levelAll,
        token: pushToken.token,
        os: pushToken.os,
      }),
    });

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    console.debug('Notification levels set successfully.');
  } catch (error) {
    console.error('Error setting levels:', error);
    throw error;
  }
};

/**
 * Retrieves the notification levels from GroundControl.
 *
 * @returns {Promise<Record<string, any>>} The levels object
 */
const getLevels = async (): Promise<Record<string, any>> => {
  const pushToken = await getPushToken();
  if (!pushToken || !pushToken.token || !pushToken.os) return {};

  let response: void | Response;
  try {
    response = await Promise.race([
      fetch(`${baseURI}/getTokenConfiguration`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          token: pushToken.token,
          os: pushToken.os,
        }),
      }),
      sleep(3000),
    ]);
  } catch (error) {
    console.error('Error fetching token configuration:', error);
    return {};
  }

  if (!response) return {};

  try {
    const json = await response.json();
    return json;
  } catch (error) {
    console.error('Error parsing token configuration:', error);
    return {};
  }
};

/**
 * Retrieves stored notifications from AsyncStorage.
 *
 * @returns {Promise<NotificationPayload[]>} Array of stored notifications
 */
export const getStoredNotifications = async (): Promise<NotificationPayload[]> => {
  let notifications: NotificationPayload[] = [];
  try {
    const stringified = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    notifications = stringified ? JSON.parse(stringified) : [];
    if (!Array.isArray(notifications)) notifications = [];
  } catch (error) {
    console.error('Error retrieving stored notifications:', error);
  }
  return notifications;
};

/**
 * Adds a notification to the stored notifications in AsyncStorage.
 *
 * @param notification - The notification payload to add
 */
export const addNotification = async (notification: NotificationPayload): Promise<void> => {
  let notifications: NotificationPayload[] = [];
  try {
    const stringified = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    notifications = stringified ? JSON.parse(stringified) : [];
    if (!Array.isArray(notifications)) notifications = [];
  } catch (error) {
    console.error('Error retrieving stored notifications:', error);
  }

  notifications.push(notification);
  try {
    await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
  } catch (error) {
    console.error('Error saving notification:', error);
  }
};

/**
 * Posts token configuration to GroundControl.
 */
export const postTokenConfig = async (): Promise<void> => {
  const pushToken = await getPushToken();
  if (!pushToken || !pushToken.token || !pushToken.os) return;

  try {
    const lang = (await AsyncStorage.getItem('lang')) || 'en';
    const appVersion = `${getSystemName()} ${getSystemVersion()};${getApplicationName()} ${getVersion()}`;

    const response = await fetch(`${baseURI}/setTokenConfiguration`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        token: pushToken.token,
        os: pushToken.os,
        lang,
        app_version: appVersion,
      }),
    });

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    console.debug('Token configuration posted successfully.');
  } catch (error) {
    console.error('Error posting token configuration:', error);
    throw error;
  }
};

/**
 * Clears all stored notifications from AsyncStorage.
 */
export const clearStoredNotifications = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify([]));
  } catch (error) {
    console.error('Error clearing stored notifications:', error);
  }
};

/**
 * Retrieves delivered notifications.
 * Note: Wix Notifications does not provide a direct method to get delivered notifications.
 * This function returns an empty array. Implement backend logic if needed.
 *
 * @returns {Promise<any[]>} Array of delivered notifications
 */
export const getDeliveredNotifications = async (): Promise<any[]> => {
  // Wix Notifications doesn't provide a direct method to get delivered notifications.
  // Implement this functionality via your backend or another solution if necessary.
  return [];
};

/**
 * Removes delivered notifications by their identifiers.
 * Note: Wix Notifications does not provide a direct method to remove specific notifications.
 * Implement backend logic or use local state management if needed.
 *
 * @param identifiers - Array of notification identifiers to remove
 */
export const removeDeliveredNotifications = (identifiers: string[] = []): void => {
  // Wix Notifications doesn't provide a direct method to remove specific notifications.
  // You might need to handle this via your backend or use local state.
  console.warn('removeDeliveredNotifications is not implemented.');
};

/**
 * Sets the application icon badge number.
 *
 * @param badges - The badge number to set
 */
export const setApplicationIconBadgeNumber = (badges: number): void => {
  if (Platform.OS === 'ios') {
    WixNotifications.ios.setBadgeCount(badges);
  } else {
    // For Android, badges are managed by the launcher and require additional setup.
    // react-native-notifications does not provide a direct method to set badges on Android.
    console.warn('Setting application icon badge number is not supported on Android.');
  }
};

/**
 * Removes all delivered notifications.
 */
export const removeAllDeliveredNotifications = (): void => {
  if (Platform.OS === 'ios') {
    WixNotifications.ios.cancelAllLocalNotifications();
  } else {
    // For Android, implement custom logic if needed
    console.warn('removeAllDeliveredNotifications is not implemented for Android.');
  }
};

/**
 * Checks if the device is capable of handling notifications.
 *
 * @returns {boolean} TRUE if capable, FALSE otherwise
 */
export const isNotificationsCapable = (): boolean => {
  return hasGmsSync() || hasHmsSync() || Platform.OS !== 'android';
};

/**
 * Initializes the Notifications module.
 * This should be called from your app's entry point (e.g., App.tsx) with the appropriate callback.
 *
 * @param onProcessNotifications - Callback to process notifications when app is active
 * @returns {Promise<void>}
 */
export const initializeNotifications = async (onProcessNotifications: () => void): Promise<void> => {
  // Fetching to see if app uses a custom GroundControl server, not the default one
  try {
    const baseUriStored = await AsyncStorage.getItem(GROUNDCONTROL_BASE_URI_KEY);
    if (baseUriStored && baseUriStored.trim()) {
      baseURI = baseUriStored;
    } else {
      baseURI = groundControlUri;
    }
  } catch (error) {
    console.error('Error retrieving GroundControl URI:', error);
  }

  // Every launch should clear badges
  setApplicationIconBadgeNumber(0);

  const existingToken = await getPushToken();
  if (!existingToken) return;

  // If we previously had a token, configure notifications
  try {
    await configureNotifications(onProcessNotifications);
    await postTokenConfig();
  } catch (error) {
    console.error('Error during notifications initialization:', error);
  }
};
