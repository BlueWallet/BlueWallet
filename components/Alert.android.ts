import { Alert as RNAlert, ToastAndroid } from 'react-native';
import loc from '../loc';

export enum AlertType {
  Alert,
  Toast,
}

const presentAlert = ({ title, message, type = AlertType.Alert }: { title?: string; message: string; type?: AlertType }) => {
  switch (type) {
    case AlertType.Toast:
      ToastAndroid.showWithGravity(message, ToastAndroid.LONG, ToastAndroid.BOTTOM);
      break;
    default:
      RNAlert.alert(title ?? loc.alert.default, message);
  }
};

export default presentAlert;
