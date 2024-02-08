import { ActionSheetIOS, InteractionManager } from 'react-native';

// Define a type for the options parameter
type ActionSheetOptions = {
  options: string[]; // Array of button titles
  cancelButtonIndex?: number;
  destructiveButtonIndex?: number;
  // Include other ActionSheetIOS options as needed
};

// Define a type for the completion callback parameter
type CompletionCallback = (buttonIndex: number) => void;

export default class ActionSheet {
  static showActionSheetWithOptions(options: ActionSheetOptions, completion: CompletionCallback): void {
    InteractionManager.runAfterInteractions(() => {
      ActionSheetIOS.showActionSheetWithOptions(options, completion);
    });
  }
}
