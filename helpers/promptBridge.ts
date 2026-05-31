import { KeyboardTypeOptions } from 'react-native';

export type PromptConfig = {
  title: string;
  description?: string;
  defaultValue?: string;
  secureTextEntry: boolean;
  keyboardType: KeyboardTypeOptions;
  cancelable: boolean;
  continueButtonText: string;
  destructive: boolean;
};

export type PromptRequest = PromptConfig & {
  resolve: (value: string) => void;
  reject: (error: Error) => void;
};

type Listener = (request: PromptRequest) => void;

let listener: Listener | null = null;

export const setPromptListener = (next: Listener | null): void => {
  listener = next;
};

export const requestPrompt = (config: PromptConfig): Promise<string> =>
  new Promise<string>((resolve, reject) => {
    if (!listener) {
      reject(new Error('Prompt host is not mounted'));
      return;
    }
    listener({ ...config, resolve, reject });
  });
