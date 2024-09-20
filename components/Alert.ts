import { Alert as RNAlert, Platform, ToastAndroid } from 'react-native';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';

export enum AlertType {
  Alert,
  Toast,
}
const presentAlert = ({
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
  if (hapticFeedback) {
    triggerHapticFeedback(hapticFeedback);
  }

  if (Platform.OS !== 'android') {
    type = AlertType.Alert;
  }
  switch (type) {
    case AlertType.Toast:
      ToastAndroid.show(message, ToastAndroid.LONG);
      break;
    default:
      RNAlert.alert(title ?? message, title && message ? message : undefined);
      break;
  }
};
export default presentAlert;
