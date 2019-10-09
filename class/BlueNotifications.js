import Push from 'appcenter-push';
import { AppState, Alert } from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';

export default class BlueNotifications {
  static PRICE_FLUCTUATION = 'NOTIFICATION_PRICE_FLUCTUATION';
  static NEWS = 'NOTIFICATION_NEWS';

  static async setEnabled(value) {
    let setListener = !(await Push.isEnabled());
    await Push.setEnabled(value);
    if (setListener) {
      await BlueNotifications.setListener();
    }
    await BlueNotifications.setNotificationTypeEnabled(BlueNotifications.NEWS, value);
    await BlueNotifications.setNotificationTypeEnabled(BlueNotifications.PRICE_FLUCTUATION, values);
  }

  static async isEnabled() {
    return Push.isEnabled();
  }

  static async isNotificationTypeEnabled(notificatonType) {
    try {
      const notificationEnabled = await AsyncStorage.getItem(notificatonType);
      return !!notificationEnabled;
    } catch {
      return false;
    }
  }

  static async setNotificationTypeEnabled(notificatonType, isEnabled) {
    return AsyncStorage.setItem(notificatonType, isEnabled ? '1' : '');
  }

  static async setListener() {
    if (await Push.isEnabled()) {
      Push.setListener({
        onPushNotificationReceived: async function(pushNotification) {
          let message = pushNotification.message;
          let title = pushNotification.title;
          console.log(pushNotification);
          if (message === null) {
            // Android messages received in the background don't include a message. On Android, that fact can be used to
            // check if the message was received in the background or foreground. For iOS the message is always present.
            title = 'Android background';
            message = '<empty>';
          }

          // Custom name/value pairs set in the App Center web portal are in customProperties
          if (pushNotification.customProperties && Object.keys(pushNotification.customProperties).length > 0) {
            if (!(await BlueNotifications.isNotificationTypeEnabled(pushNotification.customProperties.type))) {
              return;
            }
          }

          if (AppState.currentState === 'active') {
            Alert.alert(title, message);
          } else {
            // Sometimes the push callback is received shortly before the app is fully active in the foreground.
            // In this case you'll want to save off the notification info and wait until the app is fully shown
            // in the foreground before displaying any UI. You could use AppState.addEventListener to be notified
            // when the app is fully in the foreground.
          }
        },
      });
    }
  }
}

BlueNotifications.setListener();
