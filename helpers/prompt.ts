import { KeyboardTypeOptions } from 'react-native';
import loc from '../loc';
import { requestPrompt } from './promptBridge';

type PromptHelperOptions = {
  cancelable?: boolean;
  type?: 'plain-text' | 'secure-text' | 'numeric';
  destructive?: boolean; // applies only to the cancelable (two-button) layout
  continueButtonText?: string;
  defaultValue?: string;
};

export default (title: string, text: string, options: PromptHelperOptions = {}): Promise<string> => {
  const { cancelable = true, destructive = false, continueButtonText = loc._.ok, defaultValue, type = 'secure-text' } = options;

  const secureTextEntry = type === 'secure-text';
  const keyboardType: KeyboardTypeOptions = type === 'numeric' ? 'numeric' : 'default';
  const description = defaultValue === undefined && text ? text : undefined;

  return requestPrompt({
    title,
    description,
    defaultValue,
    secureTextEntry,
    keyboardType,
    cancelable,
    continueButtonText,
    destructive,
  });
};
