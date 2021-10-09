import { Alert } from 'react-native';
import loc from '../loc';
const alert = string => {
  Alert.alert(loc.alert.default, string);
};
export default alert;
