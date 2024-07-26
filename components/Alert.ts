import { Alert as RNAlert, Platform, ToastAndroid } from 'react-native';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import loc from '../loc';

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
      ToastAndroid.showWithGravity(message, ToastAndroid.LONG, ToastAndroid.BOTTOM);
      break;
    default:
      RNAlert.alert(title ?? loc.alert.default, message);
      break;
  }
};
export default presentAlert;
