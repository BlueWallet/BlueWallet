import { Alert } from 'react-native';
import loc from '../loc';
const alert = (text: string) => {
  Alert.alert(loc.alert.default, text);
};
export default alert;
