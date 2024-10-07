// ActionSheet.ts
import { Alert, InteractionManager } from 'react-native';

import { ActionSheetOptions, CompletionCallback } from './ActionSheet.common';
import loc from '../loc';

export default class ActionSheet {
  static showActionSheetWithOptions(options: ActionSheetOptions, completion: CompletionCallback): void {
    InteractionManager.runAfterInteractions(() => {
      // Check if options are provided, if not, create a default one
      const alertOptions =
        options.options && options.options.length > 0
          ? options.options.map((option, index) => {
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
            })
          : [
              {
                text: loc._.ok,
                onPress: () => completion(0),
              },
            ];

      Alert.alert(options.title || '', options.message || '', alertOptions, { cancelable: !!options.cancelButtonIndex });
    });
  }
}
