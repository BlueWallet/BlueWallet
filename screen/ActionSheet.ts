// ActionSheet.ts
import { Alert } from 'react-native';

import { ActionSheetOptions, CompletionCallback, createAlertConfig } from './ActionSheet.common';

export default class ActionSheet {
  static showActionSheetWithOptions(options: ActionSheetOptions, completion: CompletionCallback): void {
    const { buttons, alertOptions } = createAlertConfig(options, completion);
    Alert.alert(options.title || '', options.message || '', buttons, alertOptions);
  }
}
