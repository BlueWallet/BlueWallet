import { Platform } from 'react-native';
import prompt from 'react-native-prompt-android';
import requestKeyboardIncognitoMode from '../blue_modules/requestKeyboardIncognitoMode';
import loc from '../loc';

type PromptHelperOptions = {
  cancelable?: boolean;
  type?: PromptType | PromptTypeIOS | PromptTypeAndroid;
  destructive?: boolean; // applies only to the cancelable (two-button) layout
  continueButtonText?: string;
  defaultValue?: string;
};

const requestSecurePromptKeyboardPrivacy = (): (() => void) => {
  if (Platform.OS !== 'android') return () => {};

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

export default (title: string, text: string, options: PromptHelperOptions = {}): Promise<string> => {
  const { cancelable = true, destructive = false, continueButtonText = loc._.ok, defaultValue } = options;
  let { type = 'secure-text' } = options;

  const keyboardType = type === 'numeric' ? 'numeric' : 'default';

  if (Platform.OS === 'ios' && type === 'numeric') {
    // `react-native-prompt-android` on ios does not support numeric input
    type = 'plain-text';
  }

  return new Promise((resolve, reject) => {
    let stopKeyboardPrivacyRetry: (() => void) | undefined;
    const buttons: Array<PromptButton> = cancelable
      ? [
          {
            text: loc._.cancel,
            onPress: () => {
              stopKeyboardPrivacyRetry?.();
              reject(Error('Cancel Pressed'));
            },
            style: 'cancel',
          },
          {
            text: continueButtonText,
            onPress: password => {
              stopKeyboardPrivacyRetry?.();
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
              stopKeyboardPrivacyRetry?.();
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

    if (type === 'secure-text') {
      stopKeyboardPrivacyRetry = requestSecurePromptKeyboardPrivacy();
    }
  });
};
