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

    // Ensure that there's at least one button (required for both iOS and Android)
    const wrappedButtons = buttons.length > 0 ? buttons.map(wrapButtonWithCacheClear) : [
      {
        text: 'OK',
        onPress: () => clearCache(), // Default OK button clears cache
      },
    ];

    switch (type) {
      case AlertType.Toast:
        if (Platform.OS === 'android') {
          ToastAndroid.show(message, ToastAndroid.LONG);
          clearCache(); // Clear cache after showing toast
        }
        break;
      default:
        RNAlert.alert(
          title ?? message, // iOS specific: title defaults to message if undefined
          title && message ? message : undefined, // Show message only if title is present
          wrappedButtons, // Use the wrapped buttons
          options
        );
        break;
    }
  };
})();

export default presentAlert;