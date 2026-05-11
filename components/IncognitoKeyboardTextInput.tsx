import React, { forwardRef, useCallback } from 'react';
import { TextInput, TextInputProps } from 'react-native';

import requestKeyboardIncognitoMode from '../blue_modules/requestKeyboardIncognitoMode';

export type IncognitoKeyboardTextInputProps = TextInputProps;

const IncognitoKeyboardTextInput = forwardRef<TextInput, IncognitoKeyboardTextInputProps>(
  ({ autoCapitalize, autoCorrect, onFocus, spellCheck, ...props }, ref) => {
    const handleFocus = useCallback<NonNullable<TextInputProps['onFocus']>>(
      event => {
        requestKeyboardIncognitoMode();

        onFocus?.(event);
      },
      [onFocus],
    );

    return (
      <TextInput
        ref={ref}
        autoCapitalize={autoCapitalize ?? 'none'}
        autoCorrect={autoCorrect ?? false}
        onFocus={handleFocus}
        spellCheck={spellCheck ?? false}
        {...props}
      />
    );
  },
);

IncognitoKeyboardTextInput.displayName = 'IncognitoKeyboardTextInput';

export default IncognitoKeyboardTextInput;
