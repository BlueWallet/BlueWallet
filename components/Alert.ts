import { Alert as RNAlert, Platform, ToastAndroid } from 'react-native';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';

export enum AlertType {
  Alert,
  Toast,
}

const presentAlert = (() => {
  // Private variable to store the last alert's parameters
  let lastAlertParams: {
    title?: string;
    message: string;
    type?: AlertType;
    hapticFeedback?: HapticFeedbackTypes;
  } | null = null;

  return ({
    title,
    message,
    type = AlertType.Alert,
    hapticFeedback,
  }: {
    title?: string;
    message: string;
    type?: AlertType;
    hapticFeedback?: HapticFeedbackTypes;
  }) => {
    // Check if the current parameters match the last ones
    if (
      lastAlertParams &&
      lastAlertParams.title === title &&
      lastAlertParams.message === message &&
      lastAlertParams.type === type &&
      lastAlertParams.hapticFeedback === hapticFeedback
    ) {
      // Skip showing the alert if the content is the same as the last one
      return;
    }

    // Update the last alert parameters
    lastAlertParams = { title, message, type, hapticFeedback };

    // Trigger haptic feedback if provided
    if (hapticFeedback) {
      triggerHapticFeedback(hapticFeedback);
    }

    // Force Alert for non-Android platforms
    if (Platform.OS !== 'android') {
      type = AlertType.Alert;
    }

    // Show the appropriate alert based on the platform and type
    switch (type) {
      case AlertType.Toast:
        ToastAndroid.show(message, ToastAndroid.LONG);
        break;
      default:
        if (Platform.OS === 'android') {
          // Android-specific behavior: If no title, use an empty string as the title
          RNAlert.alert(title || '', message);
        } else {
          // For other platforms, use default logic
          RNAlert.alert(title ?? message, title && message ? message : undefined);
        }
        break;
    }
  };
})();

export default presentAlert;
