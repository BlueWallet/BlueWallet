import { Alert, InteractionManager } from 'react-native';

export default class ActionSheet {
  static showActionSheetWithOptions(options) {
    InteractionManager.runAfterInteractions(() => {
      Alert.alert(options.title, options.message, options.buttons, { cancelable: true });
    });
  }
}
