import { useEffect, useState } from 'react';
import PushNotification from 'react-native-push-notification';
import { clearStoredNotifications, getStoredNotifications } from '../blue_modules/notifications';

// Custom hook to listen to notifications
export function useNotification() {
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

    return () => {
      PushNotification.configure({
        onNotification: () => {},
      });
    };
  }, []);

  useEffect(() => {
    const handleInitialNotifications = async () => {
      const storedNotifications = await getStoredNotifications();
      await clearStoredNotifications();
      if (storedNotifications.length > 0) {
        setNotifications(storedNotifications);
      }
    };

    handleInitialNotifications();
  }, []);

  return notifications;
}
