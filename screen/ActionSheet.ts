// ActionSheet.ts
import { Alert, InteractionManager } from 'react-native';

import { ActionSheetOptions, CompletionCallback } from './ActionSheet.common';

export default class ActionSheet {
  static showActionSheetWithOptions(options: ActionSheetOptions, completion: CompletionCallback): void {
    InteractionManager.runAfterInteractions(() => {
      if (options.options.length <= 1 && options.message) {
        ToastAndroid.show(options.message, ToastAndroid.SHORT);
      } else {
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

        Alert.alert(options.title || '', options.message || '', alertOptions, { cancelable: !!options.cancelButtonIndex });
      }
    });
  }
}
