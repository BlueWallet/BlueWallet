import { Platform } from 'react-native';
import prompt from 'react-native-prompt-android';
import loc from '../loc';
import requestKeyboardIncognitoMode from '../blue_modules/requestKeyboardIncognitoMode';

const startKeyboardIncognitoRetry = (): (() => void) => {
  const retryDelayMs = 100;
  const maxDurationMs = 1500;
  const startedAt = Date.now();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  const attempt = () => {
    if (stopped) return;

    requestKeyboardIncognitoMode().then(applied => {
      if (stopped || applied || Date.now() - startedAt >= maxDurationMs) return;

      timeout = setTimeout(attempt, retryDelayMs);
    });
  };

  timeout = setTimeout(attempt, retryDelayMs);

  return () => {
    stopped = true;
    if (timeout) clearTimeout(timeout);
  };
};

export default (
  title: string,
  text: string,
  isCancelable = true,
  type: PromptType | PromptTypeIOS | PromptTypeAndroid = 'secure-text',
  isOKDestructive = false,
  continueButtonText = loc._.ok,
  defaultInputValue?: string,
): Promise<string> => {
  const keyboardType = type === 'numeric' ? 'numeric' : 'default';

  if (Platform.OS === 'ios' && type === 'numeric') {
    // `react-native-prompt-android` on ios does not support numeric input
    type = 'plain-text';
  }

  return new Promise((resolve, reject) => {
    let stopKeyboardIncognitoRetry = () => {};
    const buttons: Array<PromptButton> = isCancelable
      ? [
          {
            text: loc._.cancel,
            onPress: () => {
              stopKeyboardIncognitoRetry();
              reject(Error('Cancel Pressed'));
            },
            style: 'cancel',
          },
          {
            text: continueButtonText,
            onPress: password => {
              stopKeyboardIncognitoRetry();
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
              stopKeyboardIncognitoRetry();
              console.log('OK Pressed');
              resolve(password);
            },
          },
        ];

    const message = defaultInputValue !== undefined ? '' : text;
    prompt(title, message, buttons, {
      type,
      cancelable: isCancelable,
      // @ts-ignore suppressed because its supported only on ios and is absent from type definitions
      keyboardType,
      ...(defaultInputValue !== undefined && { defaultValue: defaultInputValue }),
    });

    if (Platform.OS === 'android' && type === 'secure-text') {
      stopKeyboardIncognitoRetry = startKeyboardIncognitoRetry();
    }
  });
};
