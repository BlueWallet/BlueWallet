import { Alert as RNAlert, Platform, ToastAndroid, AlertButton, AlertOptions } from 'react-native';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import loc from '../loc';
import { navigationRef } from '../NavigationService';

export enum AlertType {
  Alert,
  Toast,
}

const presentAlert = (() => {
  let lastAlertParams: {
    title?: string;
    message: string;
    type?: AlertType;
    hapticFeedback?: HapticFeedbackTypes;
    buttons?: AlertButton[];
    options?: AlertOptions;
  } | null = null;

  const clearCache = () => {
    lastAlertParams = null;
  };

  const showAlert = (title: string | undefined, message: string, buttons: AlertButton[], options: AlertOptions) => {
    if (Platform.OS === 'ios' && navigationRef.isReady()) {
      RNAlert.alert(title ?? message, title && message ? message : undefined, buttons, options);
    } else {
      RNAlert.alert(title ?? '', message, buttons, options);
    }
  };

  return ({
    title,
    message,
    type = AlertType.Alert,
    hapticFeedback,
    buttons = [],
    options = { cancelable: false },
    allowRepeat = true,
  }: {
    title?: string;
    message: string;
    type?: AlertType;
    hapticFeedback?: HapticFeedbackTypes;
    buttons?: AlertButton[];
    options?: AlertOptions;
    allowRepeat?: boolean;
  }) => {
    const currentAlertParams = { title, message, type, hapticFeedback, buttons, options };

    if (!allowRepeat && lastAlertParams && JSON.stringify(lastAlertParams) === JSON.stringify(currentAlertParams)) {
      return;
    }

    if (JSON.stringify(lastAlertParams) !== JSON.stringify(currentAlertParams)) {
      clearCache();
    }

    lastAlertParams = currentAlertParams;

    if (hapticFeedback) {
      triggerHapticFeedback(hapticFeedback);
    }

    const wrappedButtons: AlertButton[] = buttons.length > 0 ? buttons : [{ text: loc._.ok, onPress: () => {}, style: 'default' }];

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
      default:
        showAlert(title, message, wrappedButtons, options);
        break;
    }
  };
})();

export default presentAlert;
