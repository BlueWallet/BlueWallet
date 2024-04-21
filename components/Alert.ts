import { Alert as RNAlert } from 'react-native';
import loc from '../loc';

export enum AlertType {
  Alert,
  Toast,
}
const presentAlert = ({ title, message, type = AlertType.Alert }: { title?: string; message: string; type?: AlertType }) => {
  switch (type) {
    default:
      RNAlert.alert(title ?? loc.alert.default, message);
      break;
  }
};
export default presentAlert;
