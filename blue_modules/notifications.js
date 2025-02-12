import AsyncStorage from '@react-native-async-storage/async-storage';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { AppState, Platform } from 'react-native';
import { getApplicationName, getSystemName, getSystemVersion, getVersion, hasGmsSync, hasHmsSync } from 'react-native-device-info';
import { checkNotifications, requestNotifications, RESULTS } from 'react-native-permissions';
import PushNotification from 'react-native-push-notification';
import loc from '../loc';
import { groundControlUri } from './constants';

const PUSH_TOKEN = 'PUSH_TOKEN';
const GROUNDCONTROL_BASE_URI = 'GROUNDCONTROL_BASE_URI';
const NOTIFICATIONS_STORAGE = 'NOTIFICATIONS_STORAGE';
export const NOTIFICATIONS_NO_AND_DONT_ASK_FLAG = 'NOTIFICATIONS_NO_AND_DONT_ASK_FLAG';
let alreadyConfigured = false;
let baseURI = groundControlUri;

const deepClone = obj => JSON.parse(JSON.stringify(obj));

const checkAndroidNotificationPermission = async () => {
  try {
    const { status } = await checkNotifications();
    console.debug('Notification permission check:', status);
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
const handleAppStateChange = async nextAppState => {
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
/**
 * Attempts to obtain permissions and configure notifications.
 * Shows a rationale on Android if permissions are needed.
 *
 * @returns {Promise<boolean>}
 */
export const tryToObtainPermissions = async () => {
  console.debug('tryToObtainPermissions: Starting user-triggered permission request');

  if (!isNotificationsCapable) {
    console.debug('tryToObtainPermissions: Device not capable');
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
      console.debug('tryToObtainPermissions: Permission denied');
      return false;
    }
    return configureNotifications();
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
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
  console.debug('majorTomToGroundControl: Starting notification registration', {
    addressCount: addresses?.length,
    hashCount: hashes?.length,
    txidCount: txids?.length,
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
    console.debug('majorTomToGroundControl: Retrieved push token:', !!pushToken);
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
      console.debug('majorTomToGroundControl: Sending request to:', `${baseURI}/majorTomToGroundControl`);
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
  try {
    return new Promise(function (resolve) {
      PushNotification.checkPermissions(result => {
        resolve(result);
      });
    });
  } catch (error) {
    console.error('Error checking permissions:', error);
    throw error;
  }
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
      console.debug('Disabling notifications as user opted out...');
      await Promise.all([
        new Promise(resolve => PushNotification.removeAllDeliveredNotifications(resolve)),
        new Promise(resolve => PushNotification.setApplicationIconBadgeNumber(0, resolve)),
        new Promise(resolve => PushNotification.cancelAllLocalNotifications(resolve)),
        AsyncStorage.setItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG, 'true'),
      ]);
      console.debug('Notifications disabled successfully');
    } else {
      await AsyncStorage.removeItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG); // Clear flag when enabling
    }
  } catch (error) {
    console.error('Error setting notification levels:', error);
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
  console.debug('postTokenConfig: Starting token configuration');
  const pushToken = await getPushToken();
  console.debug('postTokenConfig: Retrieved push token:', !!pushToken);

  if (!pushToken || !pushToken.token || !pushToken.os) {
    console.debug('postTokenConfig: Invalid token or missing OS info');
    return;
  }

  try {
    const lang = (await AsyncStorage.getItem('lang')) || 'en';
    const appVersion = getSystemName() + ' ' + getSystemVersion() + ';' + getApplicationName() + ' ' + getVersion();
    console.debug('postTokenConfig: Posting configuration', { lang, appVersion });

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
  try {
    token = JSON.stringify(token);
    return await AsyncStorage.setItem(PUSH_TOKEN, token);
  } catch (error) {
    console.error('Error setting push token:', error);
    throw error;
  }
};

/**
 * Configures notifications. For Android, it will show a native rationale prompt if necessary.
 *
 * @returns {Promise<boolean>}
 */
export const configureNotifications = async onProcessNotifications => {
  if (alreadyConfigured) {
    console.debug('configureNotifications: Already configured, skipping');
    return true;
  }

  return new Promise(resolve => {
    const handleRegistration = async token => {
      if (__DEV__) {
        console.debug('configureNotifications: Token received:', token);
      }
      alreadyConfigured = true;
      await _setPushToken(token);
      resolve(true);
    };

    const handleNotification = async notification => {
      // Deep clone to avoid modifying the original object
      const payload = deepClone({
        ...notification,
        ...notification.data,
      });

      if (notification.data?.data) {
        const validData = Object.fromEntries(Object.entries(notification.data.data).filter(([_, value]) => value != null));
        Object.assign(payload, validData);
      }
      payload.data = undefined;

      if (!payload.title && !payload.message) {
        console.warn('Notification missing required fields:', payload);
        return;
      }

      await addNotification(payload);
      notification.finish(PushNotificationIOS.FetchResult.NoData);

      if (payload.foreground && onProcessNotifications) {
        await onProcessNotifications();
      }
    };

    const configure = async () => {
      try {
        const { status } = await checkNotifications();
        if (status !== RESULTS.GRANTED) {
          console.debug('configureNotifications: Permissions not granted');
          return resolve(false);
        }

        const existingToken = await getPushToken();
        if (existingToken) {
          alreadyConfigured = true;
          console.debug('Notifications already configured with existing token');
          return resolve(true);
        }

        PushNotification.configure({
          onRegister: handleRegistration,
          onNotification: handleNotification,
          onRegistrationError: error => {
            console.error('Registration error:', error);
            resolve(false);
          },
          permissions: { alert: true, badge: true, sound: true },
          popInitialNotification: true,
        });
      } catch (error) {
        console.error('Error in configure:', error);
        resolve(false);
      }
    };

    configure();
  });
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
  try {
    return new Promise(resolve => {
      PushNotification.getDeliveredNotifications(notifications => resolve(notifications));
    });
  } catch (error) {
    console.error('Error getting delivered notifications:', error);
    throw error;
  }
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

export const getDefaultUri = () => {
  return groundControlUri;
};

export const saveUri = async uri => {
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
  try {
    const levels = await getLevels();
    const token = await getPushToken();
    const isDisabledByUser = (await AsyncStorage.getItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG)) === 'true';

    // Return true only if we have all requirements and user hasn't opted out
    return !isDisabledByUser && !!token && !!levels.level_all;
  } catch (error) {
    console.log('Error checking notification levels:', error);
    if (error instanceof SyntaxError) {
      throw error;
    }
    return false;
  }
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
  console.debug('initializeNotifications: Starting initialization');
  try {
    const noAndDontAskFlag = await AsyncStorage.getItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG);
    console.debug('initializeNotifications: No ask flag status:', noAndDontAskFlag);

    if (noAndDontAskFlag === 'true') {
      console.warn('User has opted out of notifications.');
      return;
    }

    const baseUriStored = await AsyncStorage.getItem(GROUNDCONTROL_BASE_URI);
    baseURI = baseUriStored || groundControlUri;
    console.debug('Base URI set to:', baseURI);

    setApplicationIconBadgeNumber(0);

    // Only check permissions, never request
    currentPermissionStatus = await checkNotificationPermissionStatus();
    console.debug('initializeNotifications: Permission status:', currentPermissionStatus);

    // Handle Android 13+ permissions differently
    const canProceed =
      Platform.OS === 'android'
        ? isNotificationsCapable && (await checkAndroidNotificationPermission())
        : currentPermissionStatus === 'granted';

    if (canProceed) {
      console.debug('initializeNotifications: Can proceed with notification setup');
      const token = await getPushToken();

      if (token) {
        console.debug('initializeNotifications: Existing token found, configuring');
        await configureNotifications(onProcessNotifications);
        await postTokenConfig();
      } else {
        console.debug('initializeNotifications: No token found, will request permissions');
        await tryToObtainPermissions();
      }
    } else {
      console.debug('Notifications require user action to enable');
    }
  } catch (error) {
    console.error('Failed to initialize notifications:', error);
    baseURI = groundControlUri;
    await AsyncStorage.setItem(GROUNDCONTROL_BASE_URI, groundControlUri).catch(err => console.error('Failed to reset URI:', err));
  }
};
