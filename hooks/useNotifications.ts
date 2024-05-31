import { useEffect, useRef, useCallback } from 'react';
import { Platform, View, AppState, AppStateStatus, Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApplicationName, getSystemName, getSystemVersion, getVersion, hasGmsSync, hasHmsSync } from 'react-native-device-info';
import { requestNotifications, checkNotifications, openSettings } from 'react-native-permissions';
import loc from '../loc';
import ActionSheet from '../screen/ActionSheet';
import { groundControlUri } from '../blue_modules/constants';
import { useExtendedNavigation } from './useExtendedNavigation';
import { useStorage } from '../blue_modules/storage-context';
import DeeplinkSchemaMatch from '../class/deeplink-schema-match';
import A from '../blue_modules/analytics';
import { updateExchangeRate } from '../blue_modules/currency';
import { TWallet } from '../class/wallets/types';
import { Chain } from '../models/bitcoinUnits';
import PushNotification, { ReceivedNotification, PushNotificationDeliveredObject } from 'react-native-push-notification';
import PushNotificationIOS from '@react-native-community/push-notification-ios';

const NOTIFICATIONS_NO_AND_DONT_ASK_FLAG = 'NOTIFICATIONS_NO_AND_DONT_ASK_FLAG';

type PushToken = {
  token: string;
  os: string;
};

type NotificationPayload = Omit<ReceivedNotification, 'userInfo'> & {
  data?: any;
};

const useNotifications = () => {
  const baseURI = groundControlUri;
  const { wallets, fetchAndSaveWalletTransactions, refreshAllWalletTransactions, setSharedCosigner } = useStorage();
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const { navigate } = useExtendedNavigation();

  useEffect(() => {
    const init = async () => {
      try {
        console.debug('useNotifications:init:debug: Initializing notifications...');

        if (!isNotificationsCapable()) return;

        const token = await getPushToken();
        if (token) {
          console.debug('useNotifications:init:debug: Token retrieved:', token);
          await configureNotifications(token);
          await postTokenConfig(token);
        }
      } catch (error) {
        console.error('useNotifications:init:error: Initialization error:', error);
      }
    };

    init();
  }, []);

  const isNotificationsCapable = (): boolean => {
    console.debug('useNotifications:isNotificationsCapable:debug: Checking if push notifications are supported...');
    if (Platform.OS === 'android') {
      const hasGms = hasGmsSync();
      const hasHms = hasHmsSync();
      if (!hasGms && !hasHms) {
        console.debug('useNotifications:isNotificationsCapable:debug: Android device lacks GMS and HMS support for push notifications');
        return false;
      }
    }
    console.debug('useNotifications:isNotificationsCapable:debug: Push notifications are supported on this device');
    return true;
  };

  const getPushToken = async (): Promise<PushToken | undefined> => {
    console.debug('useNotifications:getPushToken:debug: Getting push token...');
    if (!(await isNotificationsEnabled())) {
      console.warn('useNotifications:getPushToken:warn: Notifications permission not granted');
      return undefined;
    }

    try {
      return new Promise((resolve, reject) => {
        PushNotification.configure({
          onRegister: token => {
            console.debug('useNotifications:getPushToken:debug: Push token registered:', token);
            resolve({ token: token.token, os: Platform.OS });
          },
          onRegistrationError: err => {
            console.error('useNotifications:getPushToken:error: Registration error:', err);
            reject(new Error(`Registration error: ${err.message}`));
          },
          permissions: {
            alert: true,
            badge: true,
            sound: true,
          },
          requestPermissions: false,
        });
      });
    } catch (error) {
      console.error('useNotifications:getPushToken:error: Error loading PushNotification module:', error);
      return undefined;
    }
  };

  const configureNotifications = async (token: PushToken): Promise<void> => {
    console.debug('useNotifications:configureNotifications:debug: Configuring notifications...');
    try {
      return new Promise((resolve, reject) => {
        PushNotification.configure({
          onRegister: () => {
            console.debug('useNotifications:configureNotifications:debug: Notifications configured successfully');
            resolve();
          },
          onNotification: (notification: NotificationPayload) => {
            console.debug('useNotifications:configureNotifications:debug: Notification received:', notification);
            handleNotification(notification).catch(error =>
              console.error('useNotifications:configureNotifications:error: Notification handling error:', error),
            );
            if (Platform.OS === 'ios') {
              notification.finish(PushNotificationIOS.FetchResult.NoData);
            }
          },
          onRegistrationError: (err: { message: string }) => {
            console.error('useNotifications:configureNotifications:error: Registration error:', err);
            reject(new Error(`Registration error: ${err.message}`));
          },
          permissions: {
            alert: true,
            badge: true,
            sound: true,
          },
          popInitialNotification: true,
          requestPermissions: false,
        });
      });
    } catch (error) {
      console.error('useNotifications:configureNotifications:error: Error loading PushNotification module:', error);
      throw error;
    }
  };

  const setApplicationIconBadgeNumber = useCallback(async () => {
    console.debug('useNotifications:setApplicationIconBadgeNumber:debug: Setting application icon badge number...');
    try {
      const notifications = await getDeliveredNotifications();
      const badgeCount = notifications.length;
      PushNotification.setApplicationIconBadgeNumber(badgeCount);
      console.debug(`useNotifications:setApplicationIconBadgeNumber:debug: Badge number set to ${badgeCount}`);
    } catch (error) {
      console.error('useNotifications:setApplicationIconBadgeNumber:error: Error setting application icon badge number:', error);
      throw error;
    }
  }, []);

  const handleNotification = useCallback(
    async (notification: NotificationPayload) => {
      console.debug('useNotifications:handleNotification:debug: Handling notification...');
      await setApplicationIconBadgeNumber();
    },
    [setApplicationIconBadgeNumber],
  );

  const postTokenConfig = async (token: PushToken): Promise<void> => {
    console.debug('useNotifications:postTokenConfig:debug: Posting token configuration...');
    const lang = (await AsyncStorage.getItem('lang')) || 'en';
    const appVersion = `${getSystemName()} ${getSystemVersion()}; ${getApplicationName()} ${getVersion()}`;

    const body = {
      token: token.token,
      os: token.os,
      lang,
      app_version: appVersion,
    };

    console.debug('useNotifications:postTokenConfig:debug: Body for fetch call:', JSON.stringify(body));

    try {
      const response = await fetch(`${baseURI}/setTokenConfiguration`, {
        method: 'POST',
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Failed to post token configuration');
      }
      console.debug('useNotifications:postTokenConfig:debug: Token configuration posted successfully');
    } catch (error) {
      console.error('useNotifications:postTokenConfig:error: Post token config error:', error);
      throw error;
    }
  };

  const tryToObtainPermissions = async (anchor: React.RefObject<View>): Promise<boolean> => {
    console.debug('useNotifications:tryToObtainPermissions:debug: Trying to obtain permissions...');
    try {
      const capable = isNotificationsCapable();
      if (!capable) return false;

      const status = await requestNotifications(['alert', 'sound', 'badge']);
      if (status.status !== 'granted') {
        console.warn('useNotifications:tryToObtainPermissions:warn: Notification permissions not granted');
        await clearStoredNotificationData();
        PushNotification.abandonPermissions();
        Alert.alert(
          loc.settings.notifications,
          loc.notifications.permission_denied_message,
          [
            {
              text: loc.notifications.open_settings,
              onPress: () => openSettings(),
            },
            {
              text: loc._.ok,
              onPress: () => {},
            },
          ],
          { cancelable: true },
        );
        return false;
      }

      const token = await getPushToken();
      if (token) {
        await configureNotifications(token);
        console.debug('useNotifications:tryToObtainPermissions:debug: Token obtained and notifications configured');
        return true;
      }

      if (await AsyncStorage.getItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG)) return false;

      return new Promise((resolve, reject) => {
        const options = [loc.notifications.no_and_dont_ask, loc.notifications.ask_me_later, loc._.ok];

        ActionSheet.showActionSheetWithOptions(
          {
            title: loc.settings.notifications,
            message: loc.notifications.would_you_like_to_receive_notifications,
            options,
            cancelButtonIndex: 0,
          },
          async (buttonIndex: number) => {
            try {
              if (buttonIndex === 0) {
                await AsyncStorage.setItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG, '1');
                console.debug('useNotifications:tryToObtainPermissions:debug: User selected "no and don\'t ask"');
                resolve(false);
              } else if (buttonIndex === 1) {
                console.debug('useNotifications:tryToObtainPermissions:debug: User selected "ask me later"');
                resolve(false);
              } else if (buttonIndex === 2) {
                const newToken = await getPushToken();
                if (newToken) {
                  await configureNotifications(newToken);
                  console.debug('useNotifications:tryToObtainPermissions:debug: User granted notification permissions');
                  resolve(true);
                } else {
                  console.debug('useNotifications:tryToObtainPermissions:debug: Failed to get new push token');
                  resolve(false);
                }
              }
            } catch (error) {
              console.error('useNotifications:tryToObtainPermissions:error: Error obtaining permissions:', error);
              reject(error);
            }
          },
        );
      });
    } catch (error) {
      console.error('useNotifications:tryToObtainPermissions:error: Error obtaining permissions:', error);
      throw error;
    }
  };

  const revokePermissions = async () => {
    console.debug('useNotifications:revokePermissions:debug: Revoking permissions...');
    try {
      const token = await getPushToken();
      if (!token) return;

      const body = {
        token: token.token,
        os: token.os,
      };

      console.debug('useNotifications:revokePermissions:debug: Body for fetch call:', JSON.stringify(body));

      const response = await fetch(`${baseURI}/unsubscribe`, {
        method: 'POST',
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Failed to unsubscribe');
      }

      PushNotification.abandonPermissions();
      console.debug('useNotifications:revokePermissions:debug: Permissions abandoned successfully');
    } catch (error) {
      console.error('useNotifications:revokePermissions:error: Revoke permissions error:', error);
      throw error;
    }
  };

  const clearStoredNotificationData = async () => {
    console.debug('useNotifications:clearStoredNotificationData:debug: Clearing stored notification data...');
    try {
      await AsyncStorage.removeItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG);
      console.debug('useNotifications:clearStoredNotificationData:debug: Stored notification data cleared successfully');
    } catch (error) {
      console.error('useNotifications:clearStoredNotificationData:error: Error clearing stored notification data:', error);
      throw error;
    }
  };

  const checkPermissions = async (): Promise<boolean> => {
    console.debug('useNotifications:checkPermissions:debug: Checking permissions...');
    try {
      const status = await checkNotifications();
      console.debug('useNotifications:checkPermissions:debug: Permissions checked successfully:', status);
      return status.status === 'granted';
    } catch (error) {
      console.error('useNotifications:checkPermissions:error: Check permissions error:', error);
      throw error;
    }
  };

  const isNotificationsEnabled = async (): Promise<boolean> => {
    console.debug('useNotifications:isNotificationsEnabled:debug: Checking if notifications are enabled...');
    try {
      const status = await checkNotifications();
      console.debug('useNotifications:isNotificationsEnabled:debug: Notifications enabled status:', status);
      return status.status === 'granted';
    } catch (error) {
      console.error('useNotifications:isNotificationsEnabled:error: Check if notifications are enabled error:', error);
      throw error;
    }
  };

  const openAppSettings = () => {
    console.debug('useNotifications:openAppSettings:debug: Opening app settings...');
    openSettings();
  };

  const getDeliveredNotifications = async (): Promise<ReceivedNotification[]> => {
    console.debug('useNotifications:getDeliveredNotifications:debug: Getting delivered notifications...');
    return new Promise((resolve, reject) => {
      PushNotification.getDeliveredNotifications((notifications: PushNotificationDeliveredObject[]) => {
        resolve(
          notifications.map(
            notification =>
              ({
                foreground: false,
                userInteraction: false,
                message: notification.body || '',
                data: notification.userInfo || {},
                badge: 0,
                alert: notification.body ? { body: notification.body } : {}, // Ensure alert is an object
                sound: '',
                id: notification.identifier,
                finish: () => {},
                identifier: notification.identifier,
                title: notification.title,
                body: notification.body,
                tag: notification.tag,
                group: notification.group,
                category: notification.category,
                userInfo: notification.userInfo,
              }) as ReceivedNotification,
          ),
        );
        console.debug('useNotifications:getDeliveredNotifications:debug: Delivered notifications retrieved successfully');
      });
    });
  };

  const removeAllDeliveredNotifications = async () => {
    console.debug('useNotifications:removeAllDeliveredNotifications:debug: Removing all delivered notifications...');
    return new Promise<void>((resolve, reject) => {
      try {
        PushNotification.removeAllDeliveredNotifications();
        console.debug('useNotifications:removeAllDeliveredNotifications:debug: All delivered notifications removed successfully');
        resolve();
      } catch (error) {
        console.error('useNotifications:removeAllDeliveredNotifications:error: Remove all delivered notifications error:', error);
        reject(error);
      }
    });
  };

  const majorTomToGroundControl = async (addresses: string[], hashes: string[], txids: string[]) => {
    console.debug('useNotifications:majorTomToGroundControl:debug: Sending data to GroundControl...');
    if (!Array.isArray(addresses) || !Array.isArray(hashes) || !Array.isArray(txids))
      throw new Error('no addresses or hashes or txids provided');
    const pushToken = await getPushToken();
    if (!pushToken) return;

    const body = {
      addresses,
      hashes,
      txids,
      token: pushToken.token,
      os: pushToken.os,
    };

    console.debug('useNotifications:majorTomToGroundControl:debug: Body for fetch call:', JSON.stringify(body));

    try {
      const response = await fetch(`${baseURI}/majorTomToGroundControl`, {
        method: 'POST',
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Failed to send data to GroundControl');
      }
      console.debug('useNotifications:majorTomToGroundControl:debug: Data sent to GroundControl successfully');
    } catch (error) {
      console.error('useNotifications:majorTomToGroundControl:error: Major Tom to Ground Control error:', error);
      throw error;
    }
  };

  const unsubscribe = async (addresses: string[], hashes: string[], txids: string[]) => {
    console.debug('useNotifications:unsubscribe:debug: Unsubscribing from notifications...');
    if (!Array.isArray(addresses) || !Array.isArray(hashes) || !Array.isArray(txids))
      throw new Error('no addresses or hashes or txids provided');
    const pushToken = await getPushToken();
    if (!pushToken) return;

    const body = {
      addresses,
      hashes,
      txids,
      token: pushToken.token,
      os: pushToken.os,
    };

    console.debug('useNotifications:unsubscribe:debug: Body for fetch call:', JSON.stringify(body));

    try {
      const response = await fetch(`${baseURI}/unsubscribe`, {
        method: 'POST',
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Failed to unsubscribe');
      }

      PushNotification.abandonPermissions();
      console.debug('useNotifications:unsubscribe:debug: Unsubscribed and permissions abandoned successfully');
    } catch (error) {
      console.error('useNotifications:unsubscribe:error: Unsubscribe error:', error);
      throw error;
    }
  };

  const handleOpenURL = useCallback(
    (event: { url: string }) => {
      // @ts-ignore: fix later
      DeeplinkSchemaMatch.navigationRouteFor(event, value => navigate(...value), {
        wallets,
        setSharedCosigner,
      });
      console.debug('useNotifications:handleOpenURL:debug: URL opened:', event.url);
    },
    [wallets, setSharedCosigner, navigate],
  );

  const processPushNotifications = useCallback(async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    await setApplicationIconBadgeNumber();
    const deliveredNotifications = await getDeliveredNotifications();
    setTimeout(() => removeAllDeliveredNotifications(), 5000);

    for (const notification of deliveredNotifications) {
      const wasTapped = notification.foreground === false || (notification.foreground === true && notification.userInteraction);

      console.log('processing push notification:', notification);
      let wallet: TWallet | undefined;
      // @ts-ignore: fix later
      switch (+notification.type) {
        case 2:
        case 3:
          // @ts-ignore: fix later
          wallet = wallets.find(w => w.weOwnAddress(notification.address));
          break;
        case 1:
        case 4:
          // @ts-ignore: fix later
          wallet = wallets.find(w => w.weOwnTransaction(notification.txid || notification.hash));
          break;
      }

      if (wallet) {
        const walletID = wallet.getID();
        fetchAndSaveWalletTransactions(walletID);
        if (wasTapped) {
          // @ts-ignore: fix later
          if (notification.type !== 3 || wallet.chain === Chain.OFFCHAIN) {
            navigate('WalletTransactions', {
              walletID,
              walletType: wallet.type,
            });
          } else {
            navigate('ReceiveDetailsRoot', {
              screen: 'ReceiveDetails',
              params: {
                walletID,
                // @ts-ignore: fix later
                address: notification.address,
              },
            });
          }

          return true;
        }
      } else {
        console.log('could not find wallet while processing push notification, NOP');
      }
    }

    if (deliveredNotifications.length > 0) {
      refreshAllWalletTransactions();
    }

    console.debug('useNotifications:processPushNotifications:debug: Push notifications processed successfully');
    return false;
  }, [fetchAndSaveWalletTransactions, navigate, refreshAllWalletTransactions, setApplicationIconBadgeNumber, wallets]);

  const handleAppStateChange = useCallback(
    async (nextAppState: AppStateStatus) => {
      if ((appState.current.match(/background/) && nextAppState === 'active') || nextAppState === undefined) {
        setTimeout(() => A(A.ENUM.APP_UNSUSPENDED), 2000);
        updateExchangeRate();
        await processPushNotifications();
        appState.current = nextAppState;
        console.debug('useNotifications:handleAppStateChange:debug: App state changed to active');
      }
    },
    [processPushNotifications],
  );

  const addListeners = useCallback(() => {
    const urlSubscription = Linking.addEventListener('url', handleOpenURL);
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    let notificationSubscription;
    if (Platform.OS === 'ios') {
      notificationSubscription = PushNotificationIOS.addEventListener('notification', handleNotification);
      console.debug('useNotifications:addListeners:debug: Notification event listener added for iOS');
    }

    return {
      urlSubscription,
      appStateSubscription,
      notificationSubscription,
    };
  }, [handleOpenURL, handleAppStateChange, handleNotification]);

  useEffect(() => {
    const subscriptions = addListeners();
    return () => {
      subscriptions.urlSubscription?.remove();
      subscriptions.appStateSubscription?.remove();
      subscriptions.notificationSubscription?.remove();
      console.debug('useNotifications:useEffect:debug: Event listeners removed');
    };
  }, [addListeners]);

  return {
    isNotificationsCapable,
    tryToObtainPermissions,
    revokePermissions,
    checkPermissions,
    isNotificationsEnabled,
    openAppSettings,
    getDeliveredNotifications,
    removeAllDeliveredNotifications,
    majorTomToGroundControl,
    unsubscribe,
    getPushToken,
  };
};

export default useNotifications;
