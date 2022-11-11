import { Platform } from 'react-native';
import prompt from 'react-native-prompt-android';
import loc from '../loc';

module.exports = (
  title: string,
  text: string,
  isCancelable = true,
  type: PromptType | PromptTypeIOS | PromptTypeAndroid = 'secure-text',
  isOKDestructive = false,
  continueButtonText = loc._.ok,
): Promise<string> => {
  const keyboardType = type === 'numeric' ? 'numeric' : 'default';

  if (Platform.OS === 'ios' && type === 'numeric') {
    // `react-native-prompt-android` on ios does not support numeric input
    type = 'plain-text';
  }

  return new Promise((resolve, reject) => {
    const buttons: Array<PromptButton> = isCancelable
      ? [
          {
            text: loc._.cancel,
            onPress: () => {
              reject(Error('Cancel Pressed'));
            },
            style: 'cancel',
          },
          {
            text: continueButtonText,
            onPress: password => {
              console.log('OK Pressed');
              resolve(password);
            },
            style: isOKDestructive ? 'destructive' : 'default',
          },
        ]
      : [
          {
            text: continueButtonText,
            onPress: password => {
              console.log('OK Pressed');
              resolve(password);
            },
          },
        ];

    prompt(title, text, buttons, {
      type: type,
      cancelable: isCancelable,
      // @ts-ignore suppressed because its supported only on ios and is absent from type definitions
      keyboardType,
    });
  });
};
