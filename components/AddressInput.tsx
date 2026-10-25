import React, { useCallback } from 'react';
import { StyleProp, StyleSheet, TextInput, View, ViewStyle } from 'react-native';
import loc from '../loc';
import { AddressInputScanButton } from './AddressInputScanButton';
import { useTheme } from './themes';
import FileDropTarget from './FileDropTarget';
import presentAlert from './Alert';

interface AddressInputProps {
  isLoading?: boolean;
  address?: string;
  placeholder?: string;
  onChangeText: (text: string) => void;
  editable?: boolean;
  inputAccessoryViewID?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  fileDropEnabled?: boolean;
  keyboardType?:
    | 'default'
    | 'numeric'
    | 'email-address'
    | 'ascii-capable'
    | 'numbers-and-punctuation'
    | 'url'
    | 'number-pad'
    | 'phone-pad'
    | 'name-phone-pad'
    | 'decimal-pad'
    | 'twitter'
    | 'web-search'
    | 'visible-password';
}

const AddressInput = ({
  isLoading = false,
  address = '',
  testID = 'AddressInput',
  placeholder = loc.send.details_address,
  onChangeText,
  editable = true,
  inputAccessoryViewID,
  onFocus = () => {},
  onBlur = () => {},
  keyboardType = 'default',
  style,
  fileDropEnabled = true,
}: AddressInputProps) => {
  const { colors } = useTheme();
  const handleDrop = useCallback((value: string) => onChangeText(value.trim()), [onChangeText]);
  const handleDropError = useCallback((error: Error) => presentAlert({ message: error.message }), []);
  const stylesHook = StyleSheet.create({
    root: {
      borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
    },
    input: {
      color: colors.foregroundColor,
    },
  });

  return (
    <View style={[styles.root, stylesHook.root, style]}>
      <FileDropTarget
        onDrop={handleDrop}
        onError={handleDropError}
        enabled={fileDropEnabled && editable && !isLoading}
        style={styles.inputDropTarget}
      >
        <TextInput
          testID={testID}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#81868e"
          value={address}
          style={[styles.input, stylesHook.input]}
          editable={!isLoading && editable}
          multiline={!editable}
          inputAccessoryViewID={inputAccessoryViewID}
          clearButtonMode="while-editing"
          onFocus={onFocus}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType={keyboardType}
          onBlur={onBlur}
        />
      </FileDropTarget>
      {editable ? <AddressInputScanButton isLoading={isLoading} onChangeText={onChangeText} fileDropEnabled={fileDropEnabled} /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    borderWidth: 1.0,
    borderBottomWidth: 0.5,
    minHeight: 44,
    height: 44,
    alignItems: 'center',
    borderRadius: 4,
  },
  input: {
    flex: 1,
    paddingHorizontal: 8,
    minHeight: 33,
    fontSize: 15,
    lineHeight: 19,
  },
  inputDropTarget: {
    flex: 1,
    alignSelf: 'stretch',
  },
});

export default AddressInput;
