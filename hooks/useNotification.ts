import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { check, PERMISSIONS, RESULTS } from 'react-native-permissions';
import PushNotification from 'react-native-push-notification';
import { clearStoredNotifications } from '../blue_modules/notifications';

// Custom hook to listen to notifications and handle permission changes
export function useNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const handleNotification = (notification: any) => {
      setNotifications(prevNotifications => [...prevNotifications, notification]);
      console.debug(`{notification: ${JSON.stringify(notification)}, function: useNotifications}`);
    };

    PushNotification.configure({
      onNotification: handleNotification,
      requestPermissions: false,
    });

    const checkNotificationPermissions = async () => {
      if (Platform.OS === 'ios') {
        const status = await check(PERMISSIONS.IOS.NOTIFICATIONS);
        handlePermissionStatus(status);
      } else if (Platform.OS === 'android') {
        const status = await check(PERMISSIONS.ANDROID.NOTIFICATIONS);
        handlePermissionStatus(status);
      }
    };

    const handlePermissionStatus = async (status: (typeof RESULTS)[keyof typeof RESULTS]) => {
      if (status === RESULTS.DENIED || status === RESULTS.BLOCKED) {
        await clearStoredNotifications();
        await PushNotification.abandonPermissions();
        console.debug(`{function: handlePermissionStatus, status: ${status}, action: permissions abandoned and notifications cleared}`);
      }
    };

    checkNotificationPermissions();

    return () => {
      PushNotification.configure({
        onNotification: () => {},
      });
    };
  }, []);

  return notifications;
}
