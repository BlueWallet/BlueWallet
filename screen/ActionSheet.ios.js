import { ActionSheetIOS, InteractionManager } from 'react-native';

export default class ActionSheet {
  static showActionSheetWithOptions(options, completion) {
    ActionSheetIOS.dismissActionSheet();
    InteractionManager.runAfterInteractions(() => {
      ActionSheetIOS.showActionSheetWithOptions(options, completion);
    });
  }
}
