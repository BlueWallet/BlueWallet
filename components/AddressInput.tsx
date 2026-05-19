import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, TextInput, View, ViewStyle } from 'react-native';
import loc from '../loc';
import { AddressInputScanButton } from './AddressInputScanButton';
import { useTheme } from './themes';

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
}: AddressInputProps) => {
  const { colors } = useTheme();
  const stylesHook = useMemo(
    () =>
      StyleSheet.create({
        root: {
          borderColor: colors.formBorder,
          borderBottomColor: colors.formBorder,
          backgroundColor: colors.inputBackgroundColor,
        },
        input: {
          color: colors.foregroundColor,
        },
      }),
    [colors.formBorder, colors.inputBackgroundColor, colors.foregroundColor],
  );

  return (
    <View style={[styles.root, editable ? styles.rootEditable : styles.rootReadOnly, stylesHook.root, style]}>
      <View style={styles.inputWrapper}>
        <TextInput
          testID={testID}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#81868e"
          value={address}
          style={[styles.input, stylesHook.input, !editable && styles.inputReadOnly]}
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
      </View>
      {editable ? (
        <View style={styles.scanSlot}>
          <AddressInputScanButton isLoading={isLoading} onChangeText={onChangeText} />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    borderWidth: 1.0,
    borderBottomWidth: 0.5,
    minHeight: 44,
    borderRadius: 4,
  },
  rootEditable: {
    height: 44,
    alignItems: 'center',
  },
  rootReadOnly: {
    alignItems: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  inputWrapper: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  input: {
    marginHorizontal: 8,
    fontSize: 15,
    lineHeight: 19,
    minHeight: 33,
    padding: 0,
  },
  inputReadOnly: {
    marginHorizontal: 0,
    lineHeight: 20,
    minHeight: 33,
  },
  scanSlot: {
    width: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AddressInput;
