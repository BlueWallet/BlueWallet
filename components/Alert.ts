import { Alert } from 'react-native';
import loc from '../loc';
const presentAlert = ({ title, message }: { title?: string; message: string }) => {
  Alert.alert(title ?? loc.alert.default, message);
};
export default presentAlert;
