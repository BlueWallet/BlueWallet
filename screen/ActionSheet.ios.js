import { ActionSheetIOS, InteractionManager } from 'react-native';

export default class ActionSheet {
  static showActionSheetWithOptions(options, completion) {
    InteractionManager.runAfterInteractions(() => {
      ActionSheetIOS.showActionSheetWithOptions(options, completion);
    });
  }
}
