import React, { useEffect, useRef } from 'react';
import { Platform, Pressable, StyleProp, StyleSheet, Text, TextInput, View, ViewStyle } from 'react-native';
import loc from '../loc';
import { AddressInputScanButton } from './AddressInputScanButton';
import CopyTextToClipboard from './CopyTextToClipboard';
import Icon from './Icon';
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
  /** Send screen: tap opens the address helper instead of the keyboard. */
  helperMode?: boolean;
  /** Send screen: user chose the keyboard button in the address helper. */
  keyboardEditing?: boolean;
  /** Send screen: address helper sheet is open for this field. */
  selected?: boolean;
  onOpenHelper?: () => void;
  /** Send screen: keyboard was dismissed. Receives the current address. */
  onEditingEnd?: (address: string) => void;
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
  helperMode = false,
  keyboardEditing = false,
  selected = false,
  onOpenHelper,
  onEditingEnd,
}: AddressInputProps) => {
  const { colors } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const ignoreBlurUntil = useRef(0);
  const showFormatted = helperMode && !keyboardEditing && address.length > 0;
  const suppressKeyboard = helperMode && !keyboardEditing;
  const showHelperPlaceholder = helperMode && !keyboardEditing && address.length === 0;
  const highlighted = helperMode && (showFormatted || keyboardEditing || selected);
  const rootSize = helperMode ? styles.rootHelper : showFormatted ? styles.rootFormatted : styles.rootSingle;

  const stylesHook = StyleSheet.create({
    root: {
      borderColor: highlighted ? colors.alternativeTextColor2 : colors.formBorder,
      borderBottomColor: highlighted ? colors.alternativeTextColor2 : colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
    },
    input: {
      color: showFormatted ? 'transparent' : colors.foregroundColor,
      opacity: showFormatted && Platform.OS === 'android' ? 0 : 1,
    },
    formattedOverlay: {
      backgroundColor: colors.inputBackgroundColor,
    },
    clearButton: {
      backgroundColor: colors.lightButton,
    },
  });

  useEffect(() => {
    if (!keyboardEditing) return;
    ignoreBlurUntil.current = Date.now() + 600;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [keyboardEditing]);

  const handleBlur = () => {
    onBlur();
    if (!helperMode || !keyboardEditing || !onEditingEnd) return;
    // The sheet dismisses as the keyboard opens and can blur the field once. Keep the cursor.
    if (Date.now() < ignoreBlurUntil.current) {
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }
    onEditingEnd(address);
  };

  return (
    <View style={[styles.root, rootSize, stylesHook.root, style]}>
      <View style={styles.field} collapsable={false}>
        <TextInput
          ref={inputRef}
          testID={testID}
          onChangeText={onChangeText}
          placeholder={showFormatted || showHelperPlaceholder ? '' : placeholder}
          placeholderTextColor="#81868e"
          value={address}
          style={[styles.input, helperMode && styles.inputHelper, showFormatted && styles.inputFormatted, stylesHook.input]}
          editable={!isLoading && editable}
          multiline={helperMode || showFormatted || !editable}
          numberOfLines={helperMode ? 2 : undefined}
          scrollEnabled={helperMode ? keyboardEditing : !showFormatted}
          textAlignVertical="center"
          underlineColorAndroid="transparent"
          inputAccessoryViewID={inputAccessoryViewID}
          clearButtonMode={suppressKeyboard ? 'never' : 'while-editing'}
          onFocus={onFocus}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType={keyboardType}
          onBlur={handleBlur}
          showSoftInputOnFocus={!suppressKeyboard}
          caretHidden={suppressKeyboard}
          pointerEvents={suppressKeyboard ? 'none' : 'auto'}
        />
        {showFormatted ? (
          <View pointerEvents="none" style={[styles.formattedOverlay, stylesHook.formattedOverlay]}>
            <CopyTextToClipboard
              text={address}
              displayText={toTwoLineAddress(address)}
              isAddress
              truncated={false}
              numberOfLines={2}
              interactive={false}
              textAlign="left"
              style={styles.addressText}
              containerStyle={styles.formattedCopy}
            />
          </View>
        ) : showHelperPlaceholder ? (
          <View pointerEvents="none" style={styles.formattedOverlay}>
            <Text style={styles.placeholderText}>{placeholder}</Text>
          </View>
        ) : null}
        {suppressKeyboard ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={address || placeholder}
            onPress={onOpenHelper}
            style={styles.hitTarget}
            testID="AddressInputHelper"
          />
        ) : null}
      </View>
      {showFormatted ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={loc.send.input_clear}
          onPress={() => onChangeText('')}
          style={[styles.clearButton, stylesHook.clearButton]}
          testID="AddressInputClear"
        >
          <Icon name="close" type="ionicons" size={18} color={colors.alternativeTextColor} />
        </Pressable>
      ) : editable ? (
        <AddressInputScanButton isLoading={isLoading} onChangeText={onChangeText} />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    borderWidth: 1.0,
    borderBottomWidth: 0.5,
    alignItems: 'center',
    borderRadius: 4,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  rootSingle: {
    height: 44,
  },
  rootHelper: {
    height: 64,
    borderRadius: 8,
    borderBottomWidth: 1,
    overflow: 'hidden',
  },
  rootFormatted: {
    paddingVertical: 4,
  },
  field: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  input: {
    paddingHorizontal: 0,
    minHeight: 33,
    fontSize: 15,
    lineHeight: 19,
    backgroundColor: 'transparent',
  },
  inputHelper: {
    fontSize: 15,
    lineHeight: 20,
    minHeight: 60,
    paddingVertical: 10,
    includeFontPadding: false,
  },
  addressText: {
    fontSize: 15,
    lineHeight: 20,
    color: '#9aa0aa',
  },
  placeholderText: {
    fontSize: 15,
    lineHeight: 20,
    color: '#81868e',
  },
  inputFormatted: {
    paddingVertical: 8,
    textAlign: 'left',
  },
  formattedOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 1,
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  formattedCopy: {
    width: '100%',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  hitTarget: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 2,
    backgroundColor: 'transparent',
  },
  clearButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});

/** Split an address in half so the filled field shows it on two lines. */
const toTwoLineAddress = (value: string) => {
  const normalized = value.replace(/\n/g, '');
  if (normalized.length <= 1) return normalized;
  const midpoint = Math.ceil(normalized.length / 2);
  return `${normalized.slice(0, midpoint)}\n${normalized.slice(midpoint)}`;
};

export default AddressInput;
