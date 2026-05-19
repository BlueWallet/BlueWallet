import React from 'react';
import { Platform, StyleSheet, TextInput, TextInputProps } from 'react-native';

import { useTheme } from './themes';

const BlueFormMultiInput: React.FC<TextInputProps> = props => {
  const { colors } = useTheme();
  const { style, editable, ...restProps } = props;

  return (
    <TextInput
      multiline
      underlineColorAndroid="transparent"
      numberOfLines={4}
      editable={editable}
      style={[
        styles.blueFormMultiInput,
        {
          borderColor: colors.formBorder,
          borderBottomColor: colors.formBorder,
          backgroundColor: colors.inputBackgroundColor,
          color: colors.foregroundColor,
        },
        style,
      ]}
      autoCorrect={false}
      autoCapitalize="none"
      spellCheck={false}
      {...restProps}
      selectTextOnFocus={false}
      keyboardType={Platform.OS === 'android' ? 'visible-password' : 'default'}
    />
  );
};

const styles = StyleSheet.create({
  blueFormMultiInput: {
    paddingHorizontal: 8,
    paddingVertical: 16,
    flex: 1,
    marginTop: 5,
    marginHorizontal: 20,
    borderWidth: 1,
    borderBottomWidth: 0.5,
    borderRadius: 4,
    textAlignVertical: 'top',
  },
});

export default BlueFormMultiInput;
