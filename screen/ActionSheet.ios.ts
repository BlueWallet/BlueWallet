// ActionSheet.ios.ts
import { ActionSheetIOS } from 'react-native';

import { ActionSheetOptions, CompletionCallback } from './ActionSheet.common';

export default class ActionSheet {
  static showActionSheetWithOptions(options: ActionSheetOptions, completion: CompletionCallback): void {
    const iosOptions = {
      ...options,
    };
    if (options.anchor) {
      iosOptions.anchor = options.anchor;
    }
    ActionSheetIOS.showActionSheetWithOptions(iosOptions, completion);
  }
}
