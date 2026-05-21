import { Platform } from 'react-native';
import prompt from 'react-native-prompt-android';
import loc from '../loc';

type PromptHelperOptions = {
  cancelable?: boolean;
  type?: PromptType | PromptTypeIOS | PromptTypeAndroid;
  destructive?: boolean; // applies only to the cancelable (two-button) layout
  continueButtonText?: string;
  defaultValue?: string;
};

export default (title: string, text: string, options: PromptHelperOptions = {}): Promise<string> => {
  const { cancelable = true, destructive = false, continueButtonText = loc._.ok, defaultValue } = options;
  let { type = 'secure-text' } = options;

  const keyboardType = type === 'numeric' ? 'numeric' : 'default';

  if (Platform.OS === 'ios' && type === 'numeric') {
    // `react-native-prompt-android` on ios does not support numeric input
    type = 'plain-text';
  }

  return new Promise((resolve, reject) => {
    const buttons: Array<PromptButton> = cancelable
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
            style: destructive ? 'destructive' : 'default',
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

    const message = defaultValue !== undefined ? '' : text;
    prompt(title, message, buttons, {
      type,
      cancelable,
      keyboardType,
      ...(defaultValue !== undefined && { defaultValue }),
    });
  });
};
