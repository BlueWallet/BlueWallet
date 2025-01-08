import PushNotification from 'react-native-push-notification';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import loc from '../loc';
import { AlertButton, AlertOptions, Platform, Alert as RNAlert, ToastAndroid } from 'react-native';
import PushNotificationIOS from '@react-native-community/push-notification-ios';

export enum AlertType {
  Alert,
  Toast,
  Notification,
}

const showAlert = (title: string | undefined, message: string, buttons: AlertButton[], options: AlertOptions) => {
  if (Platform.OS === 'ios') {
    RNAlert.alert(title ?? message, title && message ? message : undefined, buttons, options);
  } else {
    RNAlert.alert(title ?? '', message, buttons, options);
  }
};

const presentAlert = (() => {
  let lastAlertParams: {
    title?: string;
    message: string;
    type?: AlertType;
    hapticFeedback?: HapticFeedbackTypes;
    buttons?: AlertButton[];
    options?: AlertOptions;
    onPress?: () => void;
  } | null = null;

  const clearCache = () => {
    lastAlertParams = null;
  };

  const showNotification = (title: string | undefined, message: string, buttons: AlertButton[], category: string, onPress?: () => void) => {
    const actions = buttons.map(button => button.text);
    console.debug('showNotification: Creating notification with actions:', actions);
    PushNotification.localNotification({
      channelId: 'default-channel-id', // Ensure you have created a channel with this ID
      title,
      message,
      actions,
      category,
      invokeApp: true,
      userInfo: { buttons, onPress },
    });
  };

  PushNotification.configure({
    onAction: notification => {
      console.debug('onAction: Notification action received:', notification);
      const { action, userInfo } = notification;
      const buttons = userInfo.buttons || [];
      const button = buttons.find(button => button.text === action);
      if (button && button.onPress) {
        button.onPress();
      }
    },
    onNotification: notification => {
      console.debug('onNotification: Notification received:', notification);
      const { userInfo } = notification;
      if (userInfo.onPress) {
        userInfo.onPress();
      }
      notification.finish(PushNotificationIOS.FetchResult.NoData);
    },
  });

  return ({
    title,
    message,
    type = AlertType.Alert,
    hapticFeedback,
    buttons = [],
    options = { cancelable: false },
    allowRepeat = true,
    category = 'DEFAULT_CATEGORY',
    onPress,
  }: {
    title?: string;
    message: string;
    type?: AlertType;
    hapticFeedback?: HapticFeedbackTypes;
    buttons?: AlertButton[];
    options?: AlertOptions;
    allowRepeat?: boolean;
    category?: string;
    onPress?: () => void;
  }) => {
    const currentAlertParams = { title, message, type, hapticFeedback, buttons, options, category, onPress };

    if (!allowRepeat && lastAlertParams && JSON.stringify(lastAlertParams) === JSON.stringify(currentAlertParams)) {
      return;
    }

    if (JSON.stringify(lastAlertParams) !== JSON.stringify(currentAlertParams)) {
      clearCache();
    }

    const wrappedButtons: AlertButton[] = buttons.length > 0 ? buttons : [{ text: loc._.ok, onPress: () => {}, style: 'default' }];

    lastAlertParams = currentAlertParams;

    if (hapticFeedback) {
      triggerHapticFeedback(hapticFeedback);
    }

    switch (type) {
      case AlertType.Toast:
        if (Platform.OS === 'android') {
          ToastAndroid.show(message, ToastAndroid.LONG);
          clearCache();
        } else {
          // For iOS, treat Toast as a normal alert
          showAlert(title, message, wrappedButtons, options);
        }
        break;
      case AlertType.Notification:
        console.debug('presentAlert: Showing notification with title:', title, 'and message:', message);
        showNotification(title, message, wrappedButtons, category, onPress);
        clearCache();
        break;
      default:
        showAlert(title, message, wrappedButtons, options);
        break;
    }
  };
})();

export default presentAlert;
