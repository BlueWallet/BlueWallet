import { Alert, InteractionManager } from 'react-native';

// Define a type for the options parameter
type ActionSheetOptions = {
  title: string;
  message: string;
  buttons: Array<{
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
  }>;
};

export default class ActionSheet {
  static showActionSheetWithOptions(options: ActionSheetOptions): void {
    InteractionManager.runAfterInteractions(() => {
      Alert.alert(options.title, options.message, options.buttons, { cancelable: true });
    });
  }
}
