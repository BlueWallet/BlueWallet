import { ActionSheetIOS } from 'react-native';

export default class ActionSheet {
  static showActionSheetWithOptions(options, completion) {
    ActionSheetIOS.showActionSheetWithOptions(options, completion);
  }
}
