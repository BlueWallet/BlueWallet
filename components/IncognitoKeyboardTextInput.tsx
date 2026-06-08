import React, { forwardRef, useCallback } from 'react';
import { TextInput, TextInputProps } from 'react-native';

import requestKeyboardIncognitoMode from '../blue_modules/requestKeyboardIncognitoMode';

export type IncognitoKeyboardTextInputProps = TextInputProps & {
  incognitoKeyboard?: boolean;
};

const IncognitoKeyboardTextInput = forwardRef<
  TextInput,
  IncognitoKeyboardTextInputProps
>(
  (
    {
      autoCapitalize,
      autoCorrect,
      importantForAutofill,
      incognitoKeyboard = true,
      onFocus,
      spellCheck,
      ...props
    },
    ref,
  ) => {
    const handleFocus = useCallback<NonNullable<TextInputProps['onFocus']>>(
      event => {
        if (incognitoKeyboard) {
          requestKeyboardIncognitoMode();
        }

        onFocus?.(event);
      },
      [incognitoKeyboard, onFocus],
    );

    return (
      <TextInput
        ref={ref}
        autoCapitalize={incognitoKeyboard ? (autoCapitalize ?? 'none') : autoCapitalize}
        autoCorrect={incognitoKeyboard ? (autoCorrect ?? false) : autoCorrect}
        importantForAutofill={
          incognitoKeyboard ? (importantForAutofill ?? 'no') : importantForAutofill
        }
        onFocus={handleFocus}
        spellCheck={incognitoKeyboard ? (spellCheck ?? false) : spellCheck}
        {...props}
      />
    );
  },
);

IncognitoKeyboardTextInput.displayName = 'IncognitoKeyboardTextInput';

export default IncognitoKeyboardTextInput;
