// ActionSheet.ts
import { Alert } from 'react-native';

import { showAppDialog } from '../components/AppDialog';

import { ActionSheetOptions, CompletionCallback } from './ActionSheet.common';

export default class ActionSheet {
  static showActionSheetWithOptions(options: ActionSheetOptions, completion: CompletionCallback): void {
    const alertOptions = options.options.map((option, index) => {
      let style: 'default' | 'cancel' | 'destructive' = 'default';
      if (index === options.destructiveButtonIndex) {
        style = 'destructive';
      } else if (index === options.cancelButtonIndex) {
        style = 'cancel';
      }

      return {
        text: option,
        onPress: () => completion(index),
        style,
      };
    });

    // A list of choices in the app's style; the system dialog until its host is mounted.
    const shown = showAppDialog({
      title: options.title || undefined,
      message: options.message || undefined,
      buttons: alertOptions,
      cancelable: !!options.cancelButtonIndex,
      layout: 'options',
    });
    if (!shown) Alert.alert(options.title || '', options.message || '', alertOptions, { cancelable: !!options.cancelButtonIndex });
  }
}
