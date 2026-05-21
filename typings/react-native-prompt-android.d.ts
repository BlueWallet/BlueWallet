// Supplemental types for `react-native-prompt-android`.
// The package ships its own `index.d.ts`; this file only adds the type aliases
// used unqualified across the app, plus a `keyboardType` augmentation that is
// absent from the upstream definitions.

import type { KeyboardTypeOptions } from 'react-native';

declare global {
  type PromptButton = {
    text?: string;
    onPress?: (message: string) => void;

    /** @platform ios */
    style?: 'default' | 'cancel' | 'destructive';
  };

  type PromptType = 'default' | 'plain-text' | 'secure-text';
  type PromptTypeIOS = 'login-password';
  type PromptTypeAndroid = 'numeric' | 'email-address' | 'phone-pad';
}

// `keyboardType` is supported by the native prompt but is absent from the upstream type definitions.
declare module 'react-native-prompt-android' {
  interface PromptOptions {
    keyboardType?: KeyboardTypeOptions;
  }
}
