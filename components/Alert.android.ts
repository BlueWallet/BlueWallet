import { ToastAndroid } from 'react-native';
const presentAlert = ({ message }: { title?: string; message: string }) => {
  ToastAndroid.show(message, ToastAndroid.SHORT);
};
export default presentAlert;
