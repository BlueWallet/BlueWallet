// ActionSheet.ios.ts
import { ActionSheetIOS, InteractionManager } from 'react-native';
import { ActionSheetOptions, CompletionCallback } from './ActionSheet.common';

export default class ActionSheet {
  static showActionSheetWithOptions(options: ActionSheetOptions, completion: CompletionCallback): void {
    InteractionManager.runAfterInteractions(() => {
      const iosOptions = {
        ...options,
        anchor: options.anchor,
      };
      ActionSheetIOS.showActionSheetWithOptions(iosOptions, completion);
    });
  }
}
