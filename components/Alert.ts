import { Alert as RNAlert } from 'react-native';
import loc from '../loc';
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
  switch (type) {
    default:
      RNAlert.alert(title ?? loc.alert.default, message);
      break;
  }
};
export default presentAlert;
