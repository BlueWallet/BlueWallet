import AsyncStorage from '@react-native-async-storage/async-storage';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { getApplicationName, getSystemName, getSystemVersion, getVersion, hasGmsSync, hasHmsSync } from 'react-native-device-info';
import { checkNotifications, requestNotifications, RESULTS } from 'react-native-permissions';
import PushNotification, { ReceivedNotification } from 'react-native-push-notification';
import loc from '../loc';
import { groundControlUri } from './constants';
import { fetch } from '../util/fetch';

const PUSH_TOKEN = 'PUSH_TOKEN';
const GROUNDCONTROL_BASE_URI = 'GROUNDCONTROL_BASE_URI';
const NOTIFICATIONS_STORAGE = 'NOTIFICATIONS_STORAGE';
export const NOTIFICATIONS_NO_AND_DONT_ASK_FLAG = 'NOTIFICATIONS_NO_AND_DONT_ASK_FLAG';
let alreadyConfigured = false;
let alreadyInitialized = false;
let baseURI = groundControlUri;

// Helper function to wait for wallets to be initialized before proceeding
const waitForWalletsInitialized = async (): Promise<any[]> => {
  return new Promise<any[]>(resolve => {
    const BlueAppClass = require('../class/blue-app').BlueApp;
    const BlueAppInstance = BlueAppClass.getInstance();
    
    const checkInitialized = () => {
      const wallets = BlueAppInstance.getWallets();
      if (wallets && wallets.length > 0) {
        console.log('✅ Wallets are initialized, proceeding with notification handling');
        resolve(wallets);
      } else {
        console.log('⏳ Waiting for wallets to be initialized...');
        setTimeout(checkInitialized, 100);
      }
    };
    checkInitialized();
  });
};

type TPushToken = {
  token: string;
  os: string; // its actually ('ios' | 'android'), but types for the lib are a bit more generic...
};

// thats unwrapped `ReceivedNotification`, withall `data` fields inline
type TPayload = {
  // inherited from `ReceivedNotification`:
  subText?: string;
  message?: string | object;
  foreground: boolean;
  userInteraction: boolean;
  // hopefully stuffed in `data` and uwrapped when received:
  address: string;
  txid: string;
  type: number;
  hash: string;
  // Direct navigation URL for React Navigation linking system
  url?: string;
};

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

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
const handleAppStateChange = async (nextAppState: AppStateStatus) => {
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
export const majorTomToGroundControl = async (addresses: string[], hashes: string[], txids: string[]) => {
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
      PushNotification.checkPermissions((result: any) => {
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
export const setLevels = async (levelAll: boolean) => {
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
      PushNotification.removeAllDeliveredNotifications();
      PushNotification.setApplicationIconBadgeNumber(0);
      PushNotification.cancelAllLocalNotifications();
      await AsyncStorage.setItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG, 'true');
      console.debug('Notifications disabled successfully');
    } else {
      await AsyncStorage.removeItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG); // Clear flag when enabling
    }
  } catch (error) {
    console.error('Error setting notification levels:', error);
  }
};

export const addNotification = async (notification: TPayload) => {
  let notifications = [];
  try {
    const stringified = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE);
    notifications = JSON.parse(String(stringified));
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

const _setPushToken = async (token: TPushToken) => {
  try {
    return await AsyncStorage.setItem(PUSH_TOKEN, JSON.stringify(token));
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
export const configureNotifications = async (onProcessNotifications?: () => void) => {
  console.log('🔧 configureNotifications called, alreadyConfigured:', alreadyConfigured);
  
  if (alreadyConfigured) {
    console.debug('configureNotifications: Already configured, skipping');
    return true;
  }

  return new Promise(resolve => {
    const handleRegistration = async (token: TPushToken) => {
      console.log('📱 Push token registered:', {
        token: token?.token ? `${token.token.substring(0, 10)}...` : 'no token',
        os: token?.os,
        isDev: __DEV__,
      });
      alreadyConfigured = true;
      await _setPushToken(token);
      resolve(true);
    };

    // const handleNotification = async (notification: TPushNotification & { data: any }) => {
    const handleNotification = async (notification: any) => {
      console.log('🔔 Notification handler called with:', JSON.stringify(notification, null, 2));
      
      // Deep clone to avoid modifying the original object
      // @ts-ignore some missing properties hopefully will be unwrapped from `.data`
      const payload: TPayload = deepClone({
        ...notification,
        ...notification.data,
      });

      // Handle iOS notification format where data is nested under userInfo.data
      if (notification.userInfo?.data) {
        const validData = Object.fromEntries(Object.entries(notification.userInfo.data).filter(([_, value]) => value != null));
        Object.assign(payload, validData);
        console.log('📱 Extracted data from userInfo.data:', validData);
      }

      // Handle Android notification format where data is directly in notification.data
      if (notification.data?.data) {
        const validData = Object.fromEntries(Object.entries(notification.data.data).filter(([_, value]) => value != null));
        Object.assign(payload, validData);
        console.log('🤖 Extracted data from notification.data.data:', validData);
      }

      // @ts-ignore stfu ts, its cleanup
      payload.data = undefined;

      console.log('🔍 Final processed payload:', {
        type: payload.type,
        address: payload.address,
        txid: payload.txid,
        userInteraction: payload.userInteraction,
        hasSubText: !!payload.subText,
        hasMessage: !!payload.message,
      });

      if (!payload.subText && !payload.message) {
        console.warn('Notification missing required fields:', payload);
        return;
      }

      await addNotification(payload);
      notification.finish(PushNotificationIOS.FetchResult.NoData);

      // Check if app is in cold boot state
      const appState = AppState.currentState;
      const isColdBoot = appState === 'inactive' || appState === 'background';
      console.log('Current app state during notification:', appState, 'Cold boot detected:', isColdBoot);

      // For cold boot scenarios, add a delay to ensure app navigation is ready
      if (isColdBoot && payload.userInteraction) {
        console.log('🧊 Cold boot notification detected, scheduling delayed processing...');
        setTimeout(async () => {
          console.log('🚀 Processing delayed cold boot notification');
          // Wait for wallets to be initialized before processing the notification
          await waitForWalletsInitialized();
          console.log('✅ Wallets ready, processing cold boot notification');
          // Process the notification routing (the rest of the notification logic will continue)
        }, 1500); // Increased delay to ensure app is fully loaded
      }

      console.log('Processing notification payload:', {
        type: payload.type,
        address: payload.address,
        txid: payload.txid,
        userInteraction: payload.userInteraction,
        url: payload.url,
        isColdBoot,
      });

      // Handle notification routing when user taps notification
      if (payload.userInteraction) {
        if (payload.url) {
          // Handle notification tap - route through LinkingConfig if URL is present
          console.log('Notification tapped with URL:', payload.url);
          try {
            const { Linking } = require('react-native');
            await Linking.openURL(payload.url);
            console.log('Notification URL routed through LinkingConfig:', payload.url);
          } catch (error) {
            console.error('Failed to route notification URL:', error);
          }
        } else if (payload.type === 1 && payload.hash) {
          // Handle Lightning Invoice Paid notifications
          console.log('Lightning invoice notification tapped (Type 1):', payload.hash);
          try {
            // Wait for wallets to be initialized
            const wallets = await waitForWalletsInitialized();
            
            const walletForHash = wallets.find((wallet: any) => {
              // Check if wallet has lightning capability and contains this hash
              if (wallet.type === 'lightningCustodialWallet' || wallet.allowReceive?.()) {
                return wallet.weOwnAddress && wallet.weOwnAddress(payload.hash);
              }
              return false;
            });
            
            if (!walletForHash) {
              console.log('Lightning invoice notification for unknown wallet, ignoring:', payload.hash);
              return;
            }
            
            const { Linking } = require('react-native');
            const lightningUrl = `bluewallet://lightningInvoice?hash=${encodeURIComponent(payload.hash)}&walletID=${encodeURIComponent(walletForHash.getID())}`;
            await Linking.openURL(lightningUrl);
            console.log('Lightning invoice notification routed with walletID:', lightningUrl);
          } catch (error) {
            console.error('Failed to route lightning invoice notification:', error);
          }
        } else if (payload.type === 4 && payload.txid) {
          // Handle Transaction Confirmed notifications
          console.log('Transaction confirmed notification tapped (Type 4):', payload.txid);
          try {
            // Wait for wallets to be initialized
            const wallets = await waitForWalletsInitialized();
            
            const walletForTxid = wallets.find((wallet: any) => {
              const transactions = wallet.getTransactions ? wallet.getTransactions() : [];
              return transactions.some((tx: any) => tx.hash === payload.txid || tx.txid === payload.txid);
            });
            
            if (!walletForTxid) {
              console.log('Transaction confirmed notification for unknown transaction, ignoring:', payload.txid);
              return;
            }
            
            const { Linking } = require('react-native');
            const transactionUrl = `bluewallet://transaction/${encodeURIComponent(payload.txid)}?walletID=${encodeURIComponent(walletForTxid.getID())}`;
            await Linking.openURL(transactionUrl);
            console.log('Transaction confirmed notification routed with walletID:', transactionUrl);
          } catch (error) {
            console.error('Failed to route transaction confirmed notification:', error);
          }
        } else if ((payload.type === 2 || payload.type === 3) && payload.address) {
          // Handle address-based notifications (Type 2: Address Got Paid, Type 3: Address Got Unconfirmed Transaction)
          console.log('Address notification tapped (Type', payload.type, '):', payload.address);
          try {
            // Wait for wallets to be initialized
            const wallets = await waitForWalletsInitialized();
            
            const walletForAddress = wallets.find((wallet: any) => {
              const addresses = wallet.getAllExternalAddresses ? wallet.getAllExternalAddresses() : [];
              const internalAddresses = wallet.getAllInternalAddresses ? wallet.getAllInternalAddresses() : [];
              return [...addresses, ...internalAddresses].includes(payload.address);
            });
            
            if (!walletForAddress) {
              console.log('Address notification for unknown wallet, ignoring:', payload.address);
              return;
            }
            
            const { Linking } = require('react-native');
            let receiveUrl = `bluewallet://receive?address=${encodeURIComponent(payload.address)}&walletID=${encodeURIComponent(walletForAddress.getID())}`;
            if (payload.txid) {
              receiveUrl += `&txid=${encodeURIComponent(payload.txid)}`;
            }
            
            console.log('Address notification routed to ReceiveDetails with walletID:', receiveUrl);
            
            try {
              console.log('🚀 Starting navigation to ReceiveDetails...');
              
              // Check if NavigationService is ready for direct navigation
              try {
                const NavigationService = require('../NavigationService');
                if (NavigationService.navigationRef && NavigationService.navigationRef.isReady && NavigationService.navigationRef.isReady()) {
                  console.log('🎯 Navigation ready, attempting direct navigation to ReceiveDetails modal...');
                  NavigationService.navigate('ReceiveDetails', {
                    address: payload.address,
                    walletID: walletForAddress.getID(),
                    txid: payload.txid,
                  });
                  console.log('✅ Direct navigation to ReceiveDetails modal successful');
                  return;
                } else {
                  console.log('⚠️ NavigationService not ready, using Linking.openURL for cold boot');
                }
              } catch (directNavError) {
                console.log('⚠️ Direct navigation failed, falling back to Linking.openURL:', directNavError);
              }
              
              // Use Linking.openURL for cold boot or when direct navigation fails
              console.log('🔗 Using Linking.openURL for navigation...');
              await Linking.openURL(receiveUrl);
              console.log('✅ Address notification navigation successful via Linking');
            } catch (error: any) {
              console.error('❌ Address notification navigation failed:', error);
            }
          } catch (error) {
            console.error('Failed to route address notification:', error);
          }
        } else {
          console.log('Notification not processed for routing:', {
            hasUserInteraction: !!payload.userInteraction,
            hasUrl: !!payload.url,
            hasAddress: !!payload.address,
            type: payload.type,
          });
        }
      }

      if (payload.foreground && onProcessNotifications) {
        await onProcessNotifications();
      }
    };

    const configure = async () => {
      try {
        console.log('🔧 Starting PushNotification.configure...');
        const { status } = await checkNotifications();
        if (status !== RESULTS.GRANTED) {
          console.debug('configureNotifications: Permissions not granted, status:', status);
          return resolve(false);
        }

        const existingToken = await getPushToken();
        if (existingToken) {
          alreadyConfigured = true;
          console.debug('Notifications already configured with existing token');
          return resolve(true);
        }

        console.log('🔧 Configuring PushNotification with handlers...');
        console.log('🔧 Environment check:', {
          isDev: __DEV__,
          platform: Platform.OS,
          notificationsCapable: isNotificationsCapable,
          baseURI,
        });
        PushNotification.configure({
          onRegister: handleRegistration,
          onNotification: handleNotification,
          onRegistrationError: (error: any) => {
            console.error('❌ Push notification registration error:', error);
            resolve(false);
          },
          permissions: { alert: true, badge: true, sound: true },
          popInitialNotification: true,
        });
        console.log('✅ PushNotification.configure completed');
        console.log('📱 Push notification system is now listening for notifications...');
      } catch (error) {
        console.error('Error in configure:', error);
        resolve(false);
      }
    };

    configure();
  });
};

/**
 * Validates whether the provided GroundControl URI is valid by pinging it.
 *
 * @param uri {string}
 * @returns {Promise<boolean>} TRUE if valid, FALSE otherwise
 */
export const isGroundControlUriValid = async (uri: string) => {
  try {
    const response = await fetch(`${uri}/ping`, { headers: _getHeaders() });
    const json = await response.json();
    return !!json.description;
  } catch (_) {
    return false;
  }
};

export const isNotificationsCapable = hasGmsSync() || hasHmsSync() || Platform.OS !== 'android';

export const getPushToken = async (): Promise<TPushToken> => {
  try {
    const token = await AsyncStorage.getItem(PUSH_TOKEN);
    return JSON.parse(String(token)) as TPushToken;
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

  try {
    const response = await fetch(`${baseURI}/getTokenConfiguration`, {
      method: 'POST',
      headers: _getHeaders(),
      body: JSON.stringify({
        token: pushToken.token,
        os: pushToken.os,
      }),
    });

    if (!response) return {};
    return await response.json();
  } catch (_) {
    return {};
  }
};

/**
 * The opposite of `majorTomToGroundControl` call.
 *
 * @param addresses {string[]}
 * @param hashes {string[]}
 * @param txids {string[]}
 * @returns {Promise<object>} Response object from API rest call
 */
export const unsubscribe = async (addresses: string[], hashes: string[], txids: string[]) => {
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

export const getDeliveredNotifications: () => Promise<Record<string, any>[]> = () => {
  try {
    return new Promise(resolve => {
      PushNotification.getDeliveredNotifications((notifications: Record<string, any>[]) => resolve(notifications));
    });
  } catch (error) {
    console.error('Error getting delivered notifications:', error);
    throw error;
  }
};

export const removeDeliveredNotifications = (identifiers = []) => {
  PushNotification.removeDeliveredNotifications(identifiers);
};

export const setApplicationIconBadgeNumber = (badges: number) => {
  PushNotification.setApplicationIconBadgeNumber(badges);
};

export const removeAllDeliveredNotifications = () => {
  PushNotification.removeAllDeliveredNotifications();
};

export const getDefaultUri = () => {
  return groundControlUri;
};

export const saveUri = async (uri: string) => {
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

export const getStoredNotifications = async (): Promise<TPayload[]> => {
  let notifications = [];
  try {
    notifications = JSON.parse(String(await AsyncStorage.getItem(NOTIFICATIONS_STORAGE)));
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

// Helper function to reset initialization state (useful for testing)
export const resetNotificationInitialization = () => {
  console.debug('resetNotificationInitialization: Resetting initialization state');
  alreadyInitialized = false;
  alreadyConfigured = false;
};

// on app launch (load module):
export const initializeNotifications = async (onProcessNotifications?: () => void) => {
  if (alreadyInitialized) {
    console.debug('initializeNotifications: Already initialized, skipping duplicate call');
    return;
  }
  
  alreadyInitialized = true;
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
        console.debug('initializeNotifications: No token found, configuring for cold boot handling');
        // Configure notifications even without token to handle cold boot scenarios
        // This ensures we can process the notification that launched the app
        await configureNotifications(onProcessNotifications);
        console.debug('initializeNotifications: Configured for initial notification processing');
      }
    } else {
      console.debug('Notifications require user action to enable');
      // Even if permissions aren't granted, configure to handle any initial notification
      // that might have launched the app (popInitialNotification: true will handle this)
      console.debug('initializeNotifications: Configuring for potential cold boot notification');
      await configureNotifications(onProcessNotifications);
    }
  } catch (error) {
    console.error('Failed to initialize notifications:', error);
    baseURI = groundControlUri;
    await AsyncStorage.setItem(GROUNDCONTROL_BASE_URI, groundControlUri).catch(err => console.error('Failed to reset URI:', err));
  }
};
