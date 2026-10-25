// ActionSheet.ios.ts
import { ActionSheetIOS } from 'react-native';

import { ActionSheetOptions, CompletionCallback } from './ActionSheet.common';

export default class ActionSheet {
  static showActionSheetWithOptions(options: ActionSheetOptions, completion: CompletionCallback): void {
    const { anchor, ...optionsWithoutAnchor } = options;
    const iosOptions = anchor === undefined ? optionsWithoutAnchor : options;
    ActionSheetIOS.showActionSheetWithOptions(iosOptions, completion);
  }
}
