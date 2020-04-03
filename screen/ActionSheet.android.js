import { Alert } from 'react-native';

export default class ActionSheet {
  static showActionSheetWithOptions(options) {
    Alert.alert(options.title, options.message, options.buttons, { cancelable: true });
  }
}
