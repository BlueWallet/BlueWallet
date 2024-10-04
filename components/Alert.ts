import { Alert as RNAlert, Platform, ToastAndroid } from 'react-native';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';

export enum AlertType {
  Alert,
  Toast,
}

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertOptions {
  cancelable?: boolean;
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

  const wrapButtonWithCacheClear = (button: AlertButton): AlertButton => {
    const originalOnPress = button.onPress;
    return {
      ...button,
      onPress: () => {
        clearCache(); // Clear cache when the button is pressed
        originalOnPress?.(); // Execute original onPress logic
      },
    };
  };

  return ({
    title,
    message,
    type = AlertType.Alert,
    hapticFeedback,
    buttons = [],
    options = { cancelable: false },
  }: {
    title?: string;
    message: string;
    type?: AlertType;
    hapticFeedback?: HapticFeedbackTypes;
    buttons?: AlertButton[];
    options?: AlertOptions;
  }) => {
    if (
      lastAlertParams &&
      lastAlertParams.title === title &&
      lastAlertParams.message === message &&
      lastAlertParams.type === type &&
      lastAlertParams.hapticFeedback === hapticFeedback &&
      JSON.stringify(lastAlertParams.buttons) === JSON.stringify(buttons) &&
      JSON.stringify(lastAlertParams.options) === JSON.stringify(options)
    ) {
      return; // Skip showing the alert if the content is the same as the last one
    }

    lastAlertParams = { title, message, type, hapticFeedback, buttons, options };

    if (hapticFeedback) {
      triggerHapticFeedback(hapticFeedback);
    }

    if (Platform.OS !== 'android') {
      type = AlertType.Alert;
    }

    // Wrap all buttons with cache clearing logic
    const wrappedButtons = buttons.map(wrapButtonWithCacheClear);

    switch (type) {
      case AlertType.Toast:
        ToastAndroid.show(message, ToastAndroid.LONG);
        clearCache();
        break;
      default:
        if (Platform.OS === 'android') {
          RNAlert.alert(title || '', message, wrappedButtons, options);
        } else {
          RNAlert.alert(title ?? message, title && message ? message : undefined, wrappedButtons, options);
        }
        break;
    }
  };
})();

export default presentAlert;
